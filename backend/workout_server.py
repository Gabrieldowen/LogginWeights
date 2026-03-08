"""
Iron Track - Workout Logging Server
Flask server that receives workout text, processes with Gemini AI, and stores in Supabase
"""

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from supabase import create_client, Client
from google import genai  
import json
import os
from datetime import datetime

# Load environment variables from .env file (if running locally)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # In Docker, dotenv not needed

# Import configuration
from config import Config

# Validate configuration on startup
Config.validate()

app = Flask(__name__)
CORS(app, 
     resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",
                "https://loggin-weights.vercel.app"
            ]
        }
     },
     allow_headers=["Content-Type"],
     methods=["GET", "POST", "OPTIONS", "PUT"],
     supports_credentials=False
)
# ============================================
# INITIALIZE CLIENTS
# ============================================

# Initialize Supabase client
supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

# Initialize Gemini AI
client = genai.Client()


# ============================================
# GEMINI PROMPT
# ============================================
GEMINI_PROMPT = """Extract workout data and return structured JSON.

Workout data: "{text}"

Rules:
- Use today's date ({today}) if no date mentioned
- Normalize exercise names to Title Case (e.g., "bench press" → "Bench Press")
- If weight not mentioned, set weight_lbs to 0
- If duration not mentioned, omit duration_minutes field
- Extract any additional context as notes
- For "3x5 @ 315lbs" format: create 3 sets, each with 5 reps at 315lbs
- For workout type assigne "push" "pull" "legs" "full body" "recovery" based on exercises or notes, default to "strength" if unclear
- If a number is given with no other details enter exercise name as "unknown" with that number as the number of reps
"""

response_schema = {
    "type": "OBJECT",
    "properties": {
        "date": {"type": "STRING"},
        "duration_minutes": {"type": "INTEGER", "nullable": True},
        "workout_type": {"type": "STRING"},
        "exercises": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "sets": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "set_number": {"type": "INTEGER"},
                                "reps": {"type": "INTEGER"},
                                "weight_lbs": {"type": "NUMBER"}
                            },
                            "required": ["set_number", "reps", "weight_lbs"]
                        }
                    }
                },
                "required": ["name", "sets"]
            }
        },
        "notes": {"type": "STRING", "nullable": True}
    },
    "required": ["date", "workout_type", "exercises"]
}
# ============================================
# HELPER FUNCTIONS
# ============================================

def _get_last_exercise_from_db():
    """
    Fetches the most recently logged exercise name and weight from Supabase.
    Checks today's workout first, then falls back to the most recent past workout.
    Returns (name, weight) or (None, None) if nothing found.
    """
    try:
        today = datetime.now().strftime("%Y-%m-%d")

        # Step 1: Get the most recent workout (today's if it exists, otherwise latest)
        workout_response = supabase.table('workouts')\
            .select('id, date')\
            .order('date', desc=True)\
            .limit(1)\
            .execute()

        if not workout_response.data:
            return None, None

        workout_id = workout_response.data[0]['id']
        workout_date = workout_response.data[0]['date']
        print(f"  🗄 Looking up last exercise from workout on {workout_date}")

        # Step 2: Get the last exercise in that workout by order_index
        exercise_response = supabase.table('exercises')\
            .select('id, exercise_name, sets(*)')\
            .eq('workout_id', workout_id)\
            .order('order_index', desc=True)\
            .limit(1)\
            .execute()

        if not exercise_response.data:
            return None, None

        last_exercise = exercise_response.data[0]
        name = last_exercise['exercise_name']

        # Step 3: Get the weight from the last set of that exercise
        sets = sorted(last_exercise.get('sets', []), key=lambda s: s['set_number'], reverse=True)
        weight = float(sets[0]['weight_lbs']) if sets and sets[0].get('weight_lbs') is not None else 0

        print(f"  🗄 DB fallback: last exercise was '{name}' @ {weight}lbs")
        return name, weight

    except Exception as e:
        print(f"  ⚠ Could not fetch last exercise from DB: {e}")
        return None, None
    
def _inherit_previous_exercise(workout_data):
    """
    Post-processing step: any exercise with name "unknown" inherits
    name and weight from the previous exercise in this payload.
    If there is no previous exercise in this payload (e.g. user just said "7"),
    falls back to the most recently logged exercise in Supabase.
    """
    last_name = None
    last_weight = None
    db_fetched = False

    exercises = workout_data.get('exercises', [])

    for exercise in exercises:
        name = exercise.get('name', '').strip()
        sets = exercise.get('sets', [])
        is_unknown = name.lower() in ('unknown', '__inherit__', '')

        if is_unknown:
            # Try in-payload fallback first, then DB
            if last_name is None and not db_fetched:
                last_name, last_weight = _get_last_exercise_from_db()
                db_fetched = True

            if last_name:
                print(f"  ↩ Inheriting exercise name '{last_name}'")
                exercise['name'] = last_name
            else:
                exercise['name'] = 'Unknown'

            # Inherit weight on every set that has 0 or -1
            for s in sets:
                if s.get('weight_lbs', 0) in (0, -1):
                    if last_weight is not None:
                        print(f"  ↩ Inheriting weight {last_weight}lbs")
                        s['weight_lbs'] = last_weight
        else:
            last_name = exercise['name']
            # Track the last non-zero weight seen in this exercise's sets
            for s in sets:
                w = s.get('weight_lbs', 0)
                if w and w > 0:
                    last_weight = w

    return workout_data

def parse_workout_with_gemini(text):
    """
    Use Gemini AI to parse workout text into structured JSON.
    Inherits exercise name and weight from previous set when only reps are given.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    prompt = GEMINI_PROMPT.format(text=text, today=today)

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": response_schema
            }
        )
        result_text = response.text.strip()
        result_text = result_text.replace('```json', '').replace('```', '').strip()

        workout_data = json.loads(result_text)

        if not workout_data.get('date'):
            workout_data['date'] = today

        # Fill in inherited name/weight before storing
        workout_data = _inherit_previous_exercise(workout_data)

        return workout_data

    except Exception as e:
        raise Exception(f"Failed to parse workout with Gemini: {str(e)}")


def store_workout_in_supabase(workout_data):
    """
    Store parsed workout data in Supabase database.
    - If a workout exists for the same date, adds exercises to it.
    - If an exercise with the same name already exists in that workout,
      appends new sets to it instead of creating a duplicate exercise row.
    Returns the workout ID (existing or new).
    """
    try:
        workout_date = workout_data['date']

        # Step 1: Find or create today's workout
        existing_workout = supabase.table('workouts')\
            .select('id')\
            .eq('date', workout_date)\
            .execute()

        if existing_workout.data and len(existing_workout.data) > 0:
            workout_id = existing_workout.data[0]['id']
            print(f"✓ Adding to existing workout ID: {workout_id} on {workout_date}")
        else:
            workout_insert = {
                'date': workout_date,
                'duration_minutes': workout_data.get('duration_minutes'),
                'workout_type': workout_data.get('workout_type', 'strength'),
                'notes': workout_data.get('notes', '')
            }
            workout_response = supabase.table('workouts').insert(workout_insert).execute()
            workout_id = workout_response.data[0]['id']
            print(f"✓ Created new workout ID: {workout_id} on {workout_date}")

        # Step 2: Load all exercises already stored under this workout
        # so we can detect duplicates and append sets rather than re-insert
        existing_exercises_response = supabase.table('exercises')\
            .select('id, exercise_name, sets(set_number)')\
            .eq('workout_id', workout_id)\
            .execute()

        # Build a lookup: lowercase name -> { id, next_set_number }
        existing_exercise_map = {}
        for ex in existing_exercises_response.data:
            name_key = ex['exercise_name'].strip().lower()
            set_numbers = [s['set_number'] for s in ex.get('sets', [])]
            next_set_number = max(set_numbers, default=0) + 1
            existing_exercise_map[name_key] = {
                'id': ex['id'],
                'next_set_number': next_set_number
            }

        # Step 3: Insert exercises and sets
        for exercise_idx, exercise in enumerate(workout_data.get('exercises', [])):
            exercise_name = exercise['name'].strip().title()
            name_key = exercise_name.lower()

            if name_key in existing_exercise_map:
                # Exercise already exists — append sets to it
                exercise_id = existing_exercise_map[name_key]['id']
                next_set_number = existing_exercise_map[name_key]['next_set_number']
                print(f"  ↩ Appending to existing exercise: {exercise_name} (ID: {exercise_id})")
            else:
                # New exercise — insert it
                # order_index continues from however many already exist
                order_index = len(existing_exercise_map) + exercise_idx
                ex_response = supabase.table('exercises').insert({
                    'workout_id': workout_id,
                    'exercise_name': exercise_name,
                    'order_index': order_index
                }).execute()
                exercise_id = ex_response.data[0]['id']
                next_set_number = 1
                existing_exercise_map[name_key] = {
                    'id': exercise_id,
                    'next_set_number': next_set_number
                }
                print(f"  ✓ Created exercise: {exercise_name} (ID: {exercise_id})")

            # Insert sets with correct set_number offset
            for set_data in exercise.get('sets', []):
                set_insert = {
                    'exercise_id': exercise_id,
                    'set_number': next_set_number,
                    'reps': set_data['reps'],
                    'weight_lbs': set_data.get('weight_lbs', 0)
                }
                supabase.table('sets').insert(set_insert).execute()
                print(f"    ✓ Set {next_set_number}: {set_data['reps']} reps @ {set_data.get('weight_lbs', 0)}lbs")
                next_set_number += 1

            # Keep the map in sync for subsequent exercises in the same payload
            existing_exercise_map[name_key]['next_set_number'] = next_set_number

        return workout_id

    except Exception as e:
        print(f"❌ ERROR storing workout: {str(e)}")
        raise
# ============================================
# API ENDPOINTS
# ============================================

@app.route('/webhook/log_workout', methods=['POST'])
def log_workout():
    """
    Main endpoint to log a workout
    Accepts:
    - Text entry: {"text": "workout description", "api_key": "your-key"}
    - Manual entry: {"date": "...", "exercises": [...], "api_key": "your-key"}
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Check API key
        if data.get('api_key') != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        print(f"\n{'='*60}")
        
        # Check if this is TEXT ENTRY or MANUAL ENTRY
        if 'text' in data:
            # TEXT ENTRY - needs Gemini parsing
            workout_text = data.get('text', '').strip()
            if not workout_text:
                return jsonify({'error': 'No workout text provided'}), 400
            
            print(f"📝 Processing TEXT entry: {workout_text[:100]}...")
            print(f"{'='*60}")
            
            # Step 1: Parse workout with Gemini
            print("\n🤖 Parsing with Gemini AI...")
            workout_data = parse_workout_with_gemini(workout_text)
            print(f"✓ Parsed workout data:")
            print(json.dumps(workout_data, indent=2))
        else:
            # MANUAL ENTRY - already structured
            print(f"📝 Processing MANUAL entry")
            print(f"{'='*60}")
            
            workout_data = {
                'date': data.get('date'),
                'duration_minutes': data.get('duration_minutes'),
                'workout_type': data.get('workout_type', 'strength'),
                'notes': data.get('notes'),
                'exercises': data.get('exercises', [])
            }
            print(f"✓ Manual workout data:")
            print(json.dumps(workout_data, indent=2))
        
        # Step 2: Store in Supabase (same for both)
        print("\n💾 Storing in database...")
        workout_id = store_workout_in_supabase(workout_data)
        
        print(f"\n✅ SUCCESS! Workout logged with ID: {workout_id}")
        print(f"{'='*60}\n")
        
        # Return success response
        return jsonify({
            'success': True,
            'message': 'Workout logged successfully! 💪',
            'workout_id': workout_id,
            'workout_data': workout_data
        }), 200
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route("/api/update_workout/<int:workout_id>", methods=["PUT"])
@cross_origin(origin="https://loggin-weights.vercel.app")
def update_workout(workout_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        if data.get('api_key') != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401

        # 1. Update workout row
        supabase.table("workouts").update({
            "date": data.get("date"),
            "workout_type": data.get("workout_type", "strength"),
            "duration_minutes": data.get("duration_minutes"),
            "notes": data.get("notes"),
        }).eq("id", workout_id).execute()

        # 2. Delete old exercises (sets cascade)
        supabase.table("exercises").delete().eq("workout_id", workout_id).execute()

        # 3. Re-insert exercises + sets
        for ex_index, exercise in enumerate(data.get("exercises", [])):
            ex_insert = supabase.table("exercises").insert({
                "workout_id": workout_id,
                "exercise_name": exercise["name"],
                "order_index": ex_index
            }).execute()
            exercise_id = ex_insert.data[0]["id"]

            sets_to_insert = [{
                "exercise_id": exercise_id,
                "set_number": s["set_number"],
                "reps": s["reps"],
                "weight_lbs": s["weight_lbs"]
            } for s in exercise.get("sets", [])]

            if sets_to_insert:
                supabase.table("sets").insert(sets_to_insert).execute()

        return jsonify({"message": "Workout updated successfully"}), 200
    except Exception as e:
        print("UPDATE WORKOUT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/delete_workout/<int:workout_id>", methods=["DELETE"])
@cross_origin(origin="https://loggin-weights.vercel.app")
def delete_workout(workout_id):
    try:
        data = request.get_json()
        if data.get('api_key') != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401

        # Exercises + sets cascade, just delete the workout
        supabase.table("exercises").delete().eq("workout_id", workout_id).execute()
        supabase.table("workouts").delete().eq("id", workout_id).execute()

        return jsonify({"message": "Workout deleted successfully"}), 200
    except Exception as e:
        print("DELETE WORKOUT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'Iron Track Workout Logger',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def home():
    """
    Home page with API info
    """
    return jsonify({
        'service': 'Iron Track - Workout Logging API',
        'version': '1.0',
        'endpoints': {
            '/webhook/log-workout': 'POST - Log a workout (requires api_key and text)',
            '/api/workouts': 'GET - Get all workouts',
            '/api/exercises/<exercise_id>/history': 'GET - Get exercise history by exercise ID',
            '/health': 'GET - Health check'
        },
        'usage': {
            'method': 'POST',
            'url': '/webhook/log-workout',
            'body': {
                'text': 'Did bench press 3 sets of 10 reps at 185 pounds...',
                'api_key': 'your-api-key'
            }
        }
    }), 200


@app.route('/api/get_all_workouts', methods=['GET'])
def get_all_workouts():
    """
    Get all workouts with their exercises and sets
    Uses proper JOIN queries for the relational schema
    """
    try:
        # Get API key from query parameter
        api_key = request.args.get('api_key')
        
        # Check API key
        if api_key != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        # Get all workouts ordered by date (newest first)
        workouts_response = supabase.table('workouts').select('*').order('date', desc=True).execute()
        
        if not workouts_response.data:
            return jsonify([]), 200
        
        # Build the complete workout data with exercises and sets
        workouts_data = []
        
        for workout in workouts_response.data:
            workout_id = workout['id']
            
            # Get exercises for this workout
            exercises_response = supabase.table('exercises')\
                .select('*')\
                .eq('workout_id', workout_id)\
                .order('order_index')\
                .execute()
            
            exercises_data = []
            total_volume = 0
            
            for exercise in exercises_response.data:
                exercise_id = exercise['id']
                
                # Get sets for this exercise
                sets_response = supabase.table('sets')\
                    .select('*')\
                    .eq('exercise_id', exercise_id)\
                    .order('set_number')\
                    .execute()
                
                sets_data = []
                for set_item in sets_response.data:
                    sets_data.append({
                        'set_number': set_item['set_number'],
                        'reps': set_item['reps'],
                        'weight': float(set_item['weight_lbs']) if set_item['weight_lbs'] else 0
                    })
                    
                    # Add to total volume
                    if set_item['weight_lbs'] and set_item['reps']:
                        total_volume += float(set_item['weight_lbs']) * set_item['reps']
                
                exercises_data.append({
                    'name': exercise['exercise_name'],
                    'sets': sets_data
                })
            
            # Build the workout object
            workout_data = {
                'id': workout['id'],
                'date': workout['date'],
                'created_at': workout['created_at'],
                'duration_minutes': workout.get('duration_minutes'),
                'workout_type': workout.get('workout_type', 'strength'),
                'notes': workout.get('notes'),
                'exercises': exercises_data,
                'total_volume': round(total_volume, 2)
            }
            
            workouts_data.append(workout_data)
        
        return jsonify(workouts_data), 200
        
    except Exception as e:
        print(f"Error in get_all_workouts: {str(e)}")
        return jsonify({'error': str(e)}), 500
    """
    Get all workouts from the database
    """
    try:
        # Get request data
        api_key = request.args.get('api_key')
        
        # Check API key
        if api_key != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        # Get all workouts from the database
        workouts = supabase.table('workouts').select('*').execute()
        return jsonify(workouts.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/get_exercise_history/<int:exercise_id>', methods=['GET'])
def get_exercise_history(exercise_id):
    """
    Get the complete history of an exercise given its ID.
    Returns all instances of this exercise (by name) across all workouts,
    including sets, dates, and workout details.
    """
    try:
        # Get request data
        api_key = request.args.get('api_key')
        
        # Check API key
        if api_key != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        # Step 1: Get the exercise by ID to find its name
        exercise_response = supabase.table('exercises').select('exercise_name').eq('id', exercise_id).execute()
        
        if not exercise_response.data:
            return jsonify({'error': f'Exercise with ID {exercise_id} not found'}), 404
        
        exercise_name = exercise_response.data[0]['exercise_name']
        
        # Step 2: Get all exercises with the same name, including sets
        exercises_response = supabase.table('exercises').select('*, sets(*)').eq('exercise_name', exercise_name).execute()
        
        if not exercises_response.data:
            return jsonify({
                'exercise_id': exercise_id,
                'exercise_name': exercise_name,
                'history': []
            }), 200
        
        # Step 3: Get all workout IDs and fetch workout details
        workout_ids = list(set(ex['workout_id'] for ex in exercises_response.data))
        workouts_response = supabase.table('workouts').select('*').in_('id', workout_ids).execute()
        
        # Create a dictionary for quick workout lookup
        workouts_dict = {w['id']: w for w in workouts_response.data}
        
        # Step 4: Transform the data into a more readable format
        history = []
        for exercise in exercises_response.data:
            workout_id = exercise['workout_id']
            workout = workouts_dict.get(workout_id, {})
            sets = exercise.get('sets', [])
            
            # Sort sets by set_number
            sets_sorted = sorted(sets, key=lambda x: x.get('set_number', 0))
            
            history_entry = {
                'exercise_id': exercise['id'],
                'workout_id': workout_id,
                'date': workout.get('date'),
                'workout_type': workout.get('workout_type'),
                'duration_minutes': workout.get('duration_minutes'),
                'notes': workout.get('notes'),
                'sets': sets_sorted,
                'total_sets': len(sets_sorted),
                'total_reps': sum(s.get('reps', 0) for s in sets_sorted),
                'total_volume': sum(s.get('reps', 0) * s.get('weight_lbs', 0) for s in sets_sorted),
                'max_weight': max((s.get('weight_lbs', 0) for s in sets_sorted), default=0),
                'max_reps': max((s.get('reps', 0) for s in sets_sorted), default=0)
            }
            history.append(history_entry)
        
        # Sort history by date (most recent first)
        history.sort(key=lambda x: x['date'] or '', reverse=True)
        
        # Calculate overall statistics
        all_sets = [s for entry in history for s in entry['sets']]
        overall_stats = {
            'total_workouts': len(history),
            'total_sets': len(all_sets),
            'total_reps': sum(s.get('reps', 0) for s in all_sets),
            'total_volume': sum(s.get('reps', 0) * s.get('weight_lbs', 0) for s in all_sets),
            'max_weight_ever': max((s.get('weight_lbs', 0) for s in all_sets), default=0),
            'max_reps_ever': max((s.get('reps', 0) for s in all_sets), default=0)
        }
        
        return jsonify({
            'exercise_id': exercise_id,
            'exercise_name': exercise_name,
            'history': history,
            'statistics': overall_stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_all_exercises', methods=['GET'])
def get_all_exercises():
    """
    Get all exercises with their PRs and complete history
    Uses proper JOIN queries for the relational schema
    """
    try:
        # Get API key from query parameter
        api_key = request.args.get('api_key')
        
        # Check API key
        if api_key != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        # Get all exercises with their sets and workout dates
        exercises_response = supabase.table('exercises').select('*, workouts!inner(date), sets(*)').execute()
        
        if not exercises_response.data:
            return jsonify([]), 200
        
        # Group by exercise name
        exercises_dict = {}
        
        for exercise_record in exercises_response.data:
            exercise_name = exercise_record['exercise_name']
            workout_date = exercise_record['workouts']['date']
            sets = exercise_record.get('sets', [])
            
            # Initialize exercise if not exists
            if exercise_name not in exercises_dict:
                exercises_dict[exercise_name] = {
                    'name': exercise_name,
                    'pr_weight': 0,
                    'pr_date': None,
                    'history': [],
                    'session_dates': set()
                }
            
            # Process each set to find working sets and PRs
            for set_item in sets:
                weight = float(set_item['weight_lbs']) if set_item['weight_lbs'] else 0
                reps = set_item['reps']
                
                # Update PR if this is a heavier working set
                if weight > exercises_dict[exercise_name]['pr_weight']:
                    exercises_dict[exercise_name]['pr_weight'] = weight
                    exercises_dict[exercise_name]['pr_date'] = workout_date
            
            # Add this session to history (aggregate sets for this exercise on this date)
            # First, check if we already have a history entry for this date
            existing_session = None
            for session in exercises_dict[exercise_name]['history']:
                if session['date'] == workout_date:
                    existing_session = session
                    break
            
            if existing_session:
                # Update existing session with new sets
                for set_item in sets:
                    weight = float(set_item['weight_lbs']) if set_item['weight_lbs'] else 0
                    reps = set_item['reps']
                    existing_session['total_sets'] += 1
                    existing_session['volume'] += weight * reps
                    existing_session['set_details'].append({
                        'set_number': set_item['set_number'],
                        'reps': reps,
                        'weight': weight
                    })
            else:
                # Create new session
                total_sets = len(sets)
                total_volume = sum(float(s['weight_lbs'] or 0) * s['reps'] for s in sets)
                
                # Get the top working set (highest weight)
                top_set = max(sets, key=lambda s: float(s['weight_lbs'] or 0), default=None)
                top_weight = float(top_set['weight_lbs']) if top_set and top_set['weight_lbs'] else 0
                top_reps = top_set['reps'] if top_set else 0
                
                set_details = [{
                    'set_number': s['set_number'],
                    'reps': s['reps'],
                    'weight': float(s['weight_lbs']) if s['weight_lbs'] else 0
                } for s in sets]
                
                exercises_dict[exercise_name]['history'].append({
                    'date': workout_date,
                    'total_sets': total_sets,
                    'weight': top_weight,  # Top working set weight for the chart
                    'reps': top_reps,      # Reps for that top set
                    'volume': round(total_volume, 2),
                    'set_details': set_details
                })
                
                exercises_dict[exercise_name]['session_dates'].add(workout_date)
        
        # Convert to list and finalize
        exercises_list = []
        for exercise_name, exercise_data in exercises_dict.items():
            # Sort history by date descending (newest first)
            exercise_data['history'].sort(key=lambda x: x['date'], reverse=True)
            
            # Calculate total sessions
            exercise_data['total_sessions'] = len(exercise_data['session_dates'])
            
            # Remove session_dates set (not JSON serializable)
            del exercise_data['session_dates']
            
            exercises_list.append(exercise_data)
        
        # Sort exercises alphabetically
        exercises_list.sort(key=lambda x: x['name'])
        
        return jsonify(exercises_list), 200
        
    except Exception as e:
        print(f"Error in get_all_exercises: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
# ============================================
# RUN SERVER
# ============================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🏋️  IRON TRACK - WORKOUT LOGGING SERVER")
    print("="*60)
    print(f"\n📍 Server starting on http://{Config.HOST}:{Config.PORT}")
    print(f"📝 Endpoint: POST http://localhost:{Config.PORT}/webhook/log-workout")
    print("\n⚠️  Configuration loaded from environment variables (.env file)")
    print("   Make sure you've copied .env.template to .env and filled in your keys!")
    print("\n✅ Configuration validated successfully")
    print("\n" + "="*60 + "\n")
    
    # Run Flask app
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
