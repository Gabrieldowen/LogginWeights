"""
Iron Track - Workout Logging Server
Flask server that receives workout text, processes with Gemini AI, and stores in Supabase
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import google.generativeai as genai   
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
CORS(app, origins=["http://localhost:3000"])  # Enable CORS for all origins (adjust as needed)

# ============================================
# INITIALIZE CLIENTS
# ============================================

# Initialize Supabase client
supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

# Initialize Gemini AI
genai.configure(api_key=Config.GEMINI_API_KEY)


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

def parse_workout_with_gemini(text):
    """
    Use Gemini AI to parse workout text into structured JSON
    """
    today = datetime.now().strftime("%Y-%m-%d")
    prompt = GEMINI_PROMPT.format(text=text, today=today)
    
    try:
        model = genai.GenerativeModel(
            model_name='gemini-3-flash-preview',  # or whatever model you're using
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": response_schema
            }
        )
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Remove markdown code blocks if present
        result_text = result_text.replace('```json', '').replace('```', '').strip()
        
        # Parse JSON
        workout_data = json.loads(result_text)
        
        # Ensure date is present
        if not workout_data.get('date'):
            workout_data['date'] = today
            
        return workout_data
        
    except Exception as e:
        raise Exception(f"Failed to parse workout with Gemini: {str(e)}")


def store_workout_in_supabase(workout_data):
    """
    Store parsed workout data in Supabase database.
    If a workout exists for the same date, adds exercises to it.
    Returns the workout ID (existing or new).
    """
    try:
        workout_date = workout_data['date']
        
        # Step 1: Check if workout already exists for this date
        existing_workout = supabase.table('workouts')\
            .select('id')\
            .eq('date', workout_date)\
            .execute()
        
        if existing_workout.data and len(existing_workout.data) > 0:
            # Use existing workout
            workout_id = existing_workout.data[0]['id']
            print(f"✓ Adding to existing workout ID: {workout_id} on {workout_date}")
        else:
            # Create new workout
            workout_insert = {
                'date': workout_date,
                'duration_minutes': workout_data.get('duration_minutes'),
                'workout_type': workout_data.get('workout_type', 'strength'),
                'notes': workout_data.get('notes', '')
            }
            
            workout_response = supabase.table('workouts').insert(workout_insert).execute()
            workout_id = workout_response.data[0]['id']
            print(f"✓ Created new workout ID: {workout_id} on {workout_date}")
        
        # Step 2: Insert exercises and sets (same logic for new or existing workouts)
        for exercise_idx, exercise in enumerate(workout_data.get('exercises', [])):
            # Insert exercise
            exercise_insert = {
                'workout_id': workout_id,
                'exercise_name': exercise['name'].strip().title(),
                'order_index': exercise_idx
            }
            
            exercise_response = supabase.table('exercises').insert(exercise_insert).execute()
            exercise_id = exercise_response.data[0]['id']
            
            print(f"  ✓ Created exercise: {exercise['name'].strip().title()} (ID: {exercise_id})")
            
            # Insert sets for this exercise
            for set_idx, set_data in enumerate(exercise.get('sets', [])):
                set_insert = {
                    'exercise_id': exercise_id,
                    'set_number': set_idx + 1,
                    'reps': set_data['reps'],
                    'weight_lbs': set_data.get('weight_lbs', 0)
                }
                
                supabase.table('sets').insert(set_insert).execute()
                print(f"    ✓ Created set {set_idx + 1}: {set_data['reps']} reps @ {set_data.get('weight_lbs', 0)}lbs")
        
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
    Expects JSON: {"text": "workout description", "api_key": "your-key"}
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Check API key
        if data.get('api_key') != Config.VITE_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        # Get workout text
        workout_text = data.get('text', '').strip()
        if not workout_text:
            return jsonify({'error': 'No workout text provided'}), 400
        
        print(f"\n{'='*60}")
        print(f"📝 Processing workout: {workout_text[:100]}...")
        print(f"{'='*60}")
        
        # Step 1: Parse workout with Gemini
        print("\n🤖 Parsing with Gemini AI...")
        workout_data = parse_workout_with_gemini(workout_text)
        print(f"✓ Parsed workout data:")
        print(json.dumps(workout_data, indent=2))
        

        # Step 2: Store in Supabase
       
        
 
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
