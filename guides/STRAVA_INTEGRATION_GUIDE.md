# Strava Integration Guide - Iron Track

This guide shows how to add workout notes to existing Strava activities (from your Apple Watch).

## 🎯 Goal

After you finish a workout on your Apple Watch:
1. Workout syncs to Strava automatically
2. You log details via Iron Track (iPhone Shortcut)
3. Iron Track finds your Strava activity by date/time
4. Iron Track updates the activity description with strength training details

**Important**: We're UPDATING existing activities, NOT creating new ones.

---

## 📋 Prerequisites

- ✅ Strava account
- ✅ Apple Watch workouts syncing to Strava
- ✅ Iron Track server running
- ✅ Python Flask server with Supabase

---

## 🔑 Part 1: Strava Developer Setup

### Step 1: Create Strava API Application

1. Go to: https://www.strava.com/settings/api
2. Click "Create App" (or "My API Application")
3. Fill in:
   - **Application Name**: Iron Track
   - **Category**: Training
   - **Club**: (leave blank)
   - **Website**: http://localhost:5678 (or your domain)
   - **Authorization Callback Domain**: localhost (or your domain without http://)
   - **Description**: Personal workout tracking integration
4. Click "Create"

You'll get:
- **Client ID**: (number like 123456)
- **Client Secret**: (long string - keep this secret!)

### Step 2: Get Initial Authorization

Strava uses OAuth2. You need to authorize your app to access your account.

**Authorization URL**:
```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:5678/strava/callback&approval_prompt=force&scope=activity:write,activity:read_all
```

Replace `YOUR_CLIENT_ID` with your actual Client ID.

**Steps**:
1. Open URL in browser
2. Log in to Strava
3. Click "Authorize"
4. You'll be redirected to `http://localhost:5678/strava/callback?code=XXXXXXXX`
5. Copy the `code` from the URL

### Step 3: Exchange Code for Access Token

Run this curl command (replace placeholders):

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=CODE_FROM_STEP_2 \
  -d grant_type=authorization_code
```

**Response**:
```json
{
  "token_type": "Bearer",
  "expires_at": 1234567890,
  "expires_in": 21600,
  "refresh_token": "abc123...",
  "access_token": "xyz789...",
  "athlete": {...}
}
```

**Important tokens**:
- `access_token`: Used to make API calls (expires in 6 hours)
- `refresh_token`: Used to get new access tokens (never expires)

### Step 4: Store Tokens in .env

Add to your `.env` file:

```bash
# Strava API
STRAVA_CLIENT_ID=123456
STRAVA_CLIENT_SECRET=your-client-secret
STRAVA_REFRESH_TOKEN=your-refresh-token
```

Also update `.env.template`:
```bash
# Strava API (optional - for activity updates)
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_REFRESH_TOKEN=your-strava-refresh-token
```

---

## 🛠️ Part 2: Update Backend Code

### Step 1: Update config.py

Add Strava configuration:

```python
# In config.py, add to Config class:

# Strava API (optional)
STRAVA_CLIENT_ID = os.getenv('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')
STRAVA_REFRESH_TOKEN = os.getenv('STRAVA_REFRESH_TOKEN')

@classmethod
def validate(cls, strava_required=False):
    """
    Validate configuration.
    Set strava_required=True if Strava integration is needed.
    """
    required = {
        'SUPABASE_URL': cls.SUPABASE_URL,
        'SUPABASE_KEY': cls.SUPABASE_KEY,
        'GEMINI_API_KEY': cls.GEMINI_API_KEY,
        'API_KEY': cls.API_KEY
    }
    
    if strava_required:
        required.update({
            'STRAVA_CLIENT_ID': cls.STRAVA_CLIENT_ID,
            'STRAVA_CLIENT_SECRET': cls.STRAVA_CLIENT_SECRET,
            'STRAVA_REFRESH_TOKEN': cls.STRAVA_REFRESH_TOKEN
        })
    
    missing = [key for key, value in required.items() if not value]
    
    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}"
        )
    
    return True
```

### Step 2: Add Strava Helper Functions to workout_server.py

Add these functions to your `workout_server.py`:

```python
import requests
from datetime import datetime, timedelta

# ============================================
# STRAVA API FUNCTIONS
# ============================================

def refresh_strava_access_token():
    """
    Exchange refresh token for a new access token.
    Strava access tokens expire every 6 hours.
    """
    try:
        response = requests.post(
            'https://www.strava.com/oauth/token',
            data={
                'client_id': Config.STRAVA_CLIENT_ID,
                'client_secret': Config.STRAVA_CLIENT_SECRET,
                'refresh_token': Config.STRAVA_REFRESH_TOKEN,
                'grant_type': 'refresh_token'
            }
        )
        
        response.raise_for_status()
        data = response.json()
        
        return data['access_token']
        
    except Exception as e:
        print(f"❌ Failed to refresh Strava token: {str(e)}")
        return None


def find_strava_activity(workout_date, workout_duration_minutes=None):
    """
    Find Strava activity by date and optional duration.
    Returns the activity ID if found.
    """
    try:
        # Get fresh access token
        access_token = refresh_strava_access_token()
        if not access_token:
            return None
        
        # Parse workout date
        target_date = datetime.strptime(workout_date, '%Y-%m-%d')
        
        # Search window: workout date +/- 12 hours
        after_timestamp = int((target_date - timedelta(hours=12)).timestamp())
        before_timestamp = int((target_date + timedelta(hours=12)).timestamp())
        
        # Get activities in date range
        response = requests.get(
            'https://www.strava.com/api/v3/athlete/activities',
            headers={'Authorization': f'Bearer {access_token}'},
            params={
                'after': after_timestamp,
                'before': before_timestamp,
                'per_page': 30
            }
        )
        
        response.raise_for_status()
        activities = response.json()
        
        print(f"🔍 Found {len(activities)} Strava activities on {workout_date}")
        
        if not activities:
            return None
        
        # If duration provided, find closest match
        if workout_duration_minutes:
            closest_activity = min(
                activities,
                key=lambda a: abs((a['elapsed_time'] / 60) - workout_duration_minutes)
            )
            
            duration_diff = abs((closest_activity['elapsed_time'] / 60) - workout_duration_minutes)
            
            # Only return if duration is within 15 minutes
            if duration_diff <= 15:
                return closest_activity['id']
            else:
                print(f"⚠️  Closest activity duration: {closest_activity['elapsed_time'] / 60}min, workout: {workout_duration_minutes}min (diff too large)")
                return None
        
        # If no duration, return most recent activity on that day
        return activities[0]['id']
        
    except Exception as e:
        print(f"❌ Failed to find Strava activity: {str(e)}")
        return None


def update_strava_activity(activity_id, workout_data):
    """
    Update Strava activity description with workout details.
    """
    try:
        # Get fresh access token
        access_token = refresh_strava_access_token()
        if not access_token:
            return False
        
        # Format workout details for Strava description
        description = format_workout_for_strava(workout_data)
        
        # Update activity
        response = requests.put(
            f'https://www.strava.com/api/v3/activities/{activity_id}',
            headers={'Authorization': f'Bearer {access_token}'},
            json={'description': description}
        )
        
        response.raise_for_status()
        
        print(f"✅ Updated Strava activity {activity_id}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update Strava activity: {str(e)}")
        return False


def format_workout_for_strava(workout_data):
    """
    Format workout data into a nice description for Strava.
    """
    lines = ["💪 Strength Training Details\n"]
    
    for exercise in workout_data.get('exercises', []):
        exercise_name = exercise['name']
        sets = exercise.get('sets', [])
        
        # Group sets by weight
        weight_groups = {}
        for set_data in sets:
            weight = set_data.get('weight_lbs', 0)
            reps = set_data['reps']
            
            if weight not in weight_groups:
                weight_groups[weight] = []
            weight_groups[weight].append(reps)
        
        # Format: "Bench Press: 185lbs × (10, 8, 6)"
        for weight, reps_list in weight_groups.items():
            reps_str = ', '.join(map(str, reps_list))
            if weight > 0:
                lines.append(f"{exercise_name}: {weight}lbs × ({reps_str})")
            else:
                lines.append(f"{exercise_name}: ({reps_str}) reps")
    
    # Add notes if present
    if workout_data.get('notes'):
        lines.append(f"\n📝 {workout_data['notes']}")
    
    # Add timestamp
    lines.append(f"\n🤖 Logged via Iron Track")
    
    return '\n'.join(lines)
```

### Step 3: Update log_workout Endpoint

Modify the `/webhook/log-workout` endpoint to include Strava integration:

```python
@app.route('/webhook/log-workout', methods=['POST'])
def log_workout():
    """
    Main endpoint to log a workout.
    Now with optional Strava integration!
    """
    try:
        # ... existing code for parsing and storing workout ...
        
        # After successfully storing in database:
        workout_id = store_workout_in_supabase(workout_data)
        
        # STRAVA INTEGRATION
        strava_activity_id = None
        strava_updated = False
        
        # Check if Strava is configured
        if Config.STRAVA_REFRESH_TOKEN:
            print("\n🏃 Attempting Strava integration...")
            
            # Find Strava activity
            strava_activity_id = find_strava_activity(
                workout_data['date'],
                workout_data.get('duration_minutes')
            )
            
            if strava_activity_id:
                print(f"✅ Found Strava activity: {strava_activity_id}")
                
                # Update activity description
                strava_updated = update_strava_activity(strava_activity_id, workout_data)
                
                if strava_updated:
                    # Store Strava activity ID in database
                    supabase.table('workouts').update({
                        'strava_activity_id': strava_activity_id
                    }).eq('id', workout_id).execute()
                    
                    print(f"✅ Linked workout {workout_id} to Strava activity {strava_activity_id}")
            else:
                print("⚠️  No matching Strava activity found")
        else:
            print("ℹ️  Strava integration not configured (skipping)")
        
        # Return success response with Strava info
        return jsonify({
            'success': True,
            'message': 'Workout logged successfully! 💪',
            'workout_id': workout_id,
            'workout_data': workout_data,
            'strava': {
                'activity_id': strava_activity_id,
                'updated': strava_updated
            } if Config.STRAVA_REFRESH_TOKEN else None
        }), 200
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

---

## 🧪 Part 3: Testing Strava Integration

### Step 1: Test Token Refresh

```python
# Add test endpoint to workout_server.py
@app.route('/test/strava-token', methods=['GET'])
def test_strava_token():
    """Test Strava token refresh"""
    if not Config.STRAVA_REFRESH_TOKEN:
        return jsonify({'error': 'Strava not configured'}), 400
    
    access_token = refresh_strava_access_token()
    
    if access_token:
        return jsonify({
            'success': True,
            'message': 'Token refresh successful!',
            'token_preview': access_token[:20] + '...'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Token refresh failed'
        }), 500
```

Test:
```bash
curl http://localhost:5678/test/strava-token
```

### Step 2: Test Finding Activities

```python
# Add test endpoint
@app.route('/test/strava-find', methods=['GET'])
def test_strava_find():
    """Test finding Strava activities"""
    if not Config.STRAVA_REFRESH_TOKEN:
        return jsonify({'error': 'Strava not configured'}), 400
    
    # Use today's date
    today = datetime.now().strftime('%Y-%m-%d')
    
    activity_id = find_strava_activity(today)
    
    if activity_id:
        return jsonify({
            'success': True,
            'activity_id': activity_id,
            'message': f'Found activity {activity_id} for {today}'
        })
    else:
        return jsonify({
            'success': False,
            'message': f'No activity found for {today}'
        }), 404
```

Test:
```bash
curl http://localhost:5678/test/strava-find
```

### Step 3: Test Full Workflow

1. Do a workout on Apple Watch
2. Wait for it to sync to Strava
3. Log workout via iPhone Shortcut
4. Check Strava activity - should have updated description!

---

## 🔧 Part 4: Advanced Configuration

### Option 1: Add Strava Link to Frontend

Update your React frontend to show Strava links:

```javascript
// In workout display component
{workout.strava_activity_id && (
  <a
    href={`https://www.strava.com/activities/${workout.strava_activity_id}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-orange-500 hover:text-orange-400 flex items-center gap-1"
  >
    <span>View on Strava</span>
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
    </svg>
  </a>
)}
```

### Option 2: Manual Strava Linking

Add endpoint to manually link a workout to Strava:

```python
@app.route('/webhook/link-strava', methods=['POST'])
def link_strava():
    """
    Manually link a workout to a Strava activity.
    Useful if auto-detection fails.
    """
    try:
        data = request.get_json()
        
        # Validate API key
        if data.get('api_key') != Config.API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        workout_id = data.get('workout_id')
        strava_activity_id = data.get('strava_activity_id')
        
        if not workout_id or not strava_activity_id:
            return jsonify({'error': 'Missing workout_id or strava_activity_id'}), 400
        
        # Get workout data
        workout = supabase.table('workouts').select('*').eq('id', workout_id).execute()
        if not workout.data:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Get exercises and sets (same query as before)
        exercises_data = supabase.table('exercises').select('*, sets(*)').eq('workout_id', workout_id).execute()
        
        # Format workout data
        workout_data = {
            'date': workout.data[0]['date'],
            'duration_minutes': workout.data[0].get('duration_minutes'),
            'exercises': [
                {
                    'name': ex['exercise_name'],
                    'sets': [{'reps': s['reps'], 'weight_lbs': s['weight_lbs']} for s in ex['sets']]
                }
                for ex in exercises_data.data
            ],
            'notes': workout.data[0].get('notes', '')
        }
        
        # Update Strava activity
        success = update_strava_activity(strava_activity_id, workout_data)
        
        if success:
            # Update database
            supabase.table('workouts').update({
                'strava_activity_id': strava_activity_id
            }).eq('id', workout_id).execute()
            
            return jsonify({
                'success': True,
                'message': f'Linked workout {workout_id} to Strava activity {strava_activity_id}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update Strava activity'
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Option 3: Customize Description Format

Modify `format_workout_for_strava()` to match your preferences:

```python
def format_workout_for_strava(workout_data):
    """
    Custom formatting options
    """
    lines = ["💪 STRENGTH TRAINING\n"]
    
    # Option 1: Simple list
    for exercise in workout_data.get('exercises', []):
        sets_summary = f"{len(exercise['sets'])} sets"
        lines.append(f"• {exercise['name']}: {sets_summary}")
    
    # Option 2: Detailed with all sets
    for exercise in workout_data.get('exercises', []):
        lines.append(f"\n{exercise['name']}:")
        for i, set_data in enumerate(exercise['sets'], 1):
            weight = set_data.get('weight_lbs', 0)
            reps = set_data['reps']
            lines.append(f"  Set {i}: {reps} reps @ {weight}lbs")
    
    # Option 3: Total volume
    total_volume = 0
    for exercise in workout_data.get('exercises', []):
        for set_data in exercise['sets']:
            total_volume += set_data.get('weight_lbs', 0) * set_data['reps']
    
    lines.append(f"\nTotal Volume: {total_volume:,} lbs")
    
    # Add notes
    if workout_data.get('notes'):
        lines.append(f"\n📝 {workout_data['notes']}")
    
    return '\n'.join(lines)
```

---

## 🐛 Troubleshooting

### "No matching Strava activity found"

**Causes**:
- Workout hasn't synced from Apple Watch yet
- Date/time mismatch
- Activity is outside search window

**Solutions**:
- Wait 5-10 minutes for sync
- Check Strava app to verify activity exists
- Adjust search window in `find_strava_activity()`
- Use manual linking endpoint

### "Token refresh failed"

**Causes**:
- Invalid refresh token
- Strava API down
- Authorization revoked

**Solutions**:
- Re-authorize app (Part 1, Steps 2-3)
- Get new refresh token
- Check Strava API status

### "Failed to update Strava activity"

**Causes**:
- Activity not owned by authenticated user
- Missing permissions
- Activity is too old (Strava limits edits)

**Solutions**:
- Verify correct Strava account
- Re-authorize with `activity:write` scope
- Check Strava activity permissions

### Activity updates with old data

**Cause**: Strava API cache

**Solution**: Wait a few minutes and refresh Strava

---

## 🔐 Security Best Practices

1. **Never commit tokens**: Keep them in `.env`
2. **Use refresh tokens**: Don't store access tokens
3. **Validate activity ownership**: Only update your own activities
4. **Rate limiting**: Strava has API limits (100 requests per 15 min)
5. **Error handling**: Don't fail workout logging if Strava fails

---

## 📊 Strava API Limits

- **Rate Limit**: 100 requests per 15 minutes, 1,000 per day
- **Access Token**: Expires every 6 hours
- **Refresh Token**: Never expires (unless revoked)

Our app makes:
- 1 request to refresh token
- 1 request to find activity
- 1 request to update activity
- **Total**: 3 requests per workout

You can log ~30 workouts per 15 minutes (plenty for personal use!)

---

## ✅ Final Checklist

- [ ] Strava app created
- [ ] Authorization completed
- [ ] Tokens in `.env`
- [ ] Backend code updated
- [ ] Token refresh tested
- [ ] Activity finding tested
- [ ] Full workflow tested
- [ ] Frontend shows Strava links (optional)
- [ ] Manual linking endpoint added (optional)

---

## 🎯 Example Strava Description

After integration, your Strava activity will show:

```
💪 Strength Training Details

Bench Press: 185lbs × (10, 8, 6)
Bench Press: 195lbs × (5)
Squats: 225lbs × (12, 10, 10)
Deadlift: 315lbs × (5, 5, 3)

📝 Felt strong today, new PR on bench!

🤖 Logged via Iron Track
```

---

**Strava integration complete! Your workouts are now automatically documented! 🏋️**
