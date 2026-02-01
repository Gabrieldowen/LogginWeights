"""
Iron Track - Workout Logging Server
Flask server that receives workout text, processes with Gemini AI, and stores in Supabase
"""

from flask import Flask, request, jsonify
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

GEMINI_PROMPT = """Extract workout data from this voice-to-text transcription and return ONLY valid JSON with no markdown formatting or explanation.

Transcription: "{text}"

Return this exact structure:
{{
  "date": "YYYY-MM-DD",
  "duration_minutes": number,
  "workout_type": "strength",
  "exercises": [
    {{
      "name": "Exercise Name",
      "sets": [
        {{"reps": number, "weight_lbs": number}}
      ]
    }}
  ],
  "notes": "any additional notes mentioned"
}}

Rules:
- If no date mentioned, use today's date: {today}
- If no weight mentioned for an exercise, set weight_lbs to 0
- If no duration mentioned, omit duration_minutes
- Return ONLY the JSON object, no markdown code blocks, no explanation
"""

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
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
            )
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
    Store parsed workout data in Supabase database
    Returns the created workout ID
    """
    try:
        # Step 1: Insert workout
        workout_insert = {
            'date': workout_data['date'],
            'duration_minutes': workout_data.get('duration_minutes'),
            'workout_type': workout_data.get('workout_type', 'strength'),
            'notes': workout_data.get('notes', '')
        }
        
        workout_response = supabase.table('workouts').insert(workout_insert).execute()
        workout_id = workout_response.data[0]['id']
        
        print(f"✓ Created workout ID: {workout_id}")
        
        # Step 2: Insert exercises and sets
        for exercise_idx, exercise in enumerate(workout_data.get('exercises', [])):
            # Insert exercise
            exercise_insert = {
                'workout_id': workout_id,
                'exercise_name': exercise['name'],
                'order_index': exercise_idx
            }
            
            exercise_response = supabase.table('exercises').insert(exercise_insert).execute()
            exercise_id = exercise_response.data[0]['id']
            
            print(f"  ✓ Created exercise: {exercise['name']} (ID: {exercise_id})")
            
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
        raise Exception(f"Failed to store workout in database: {str(e)}")


# ============================================
# API ENDPOINTS
# ============================================

@app.route('/webhook/log-workout', methods=['POST'])
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
        if data.get('api_key') != Config.API_KEY:
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
