# Frontend Database Connection Guide - Iron Track

This guide shows how to connect your React PWA frontend to Supabase to display real workout data.

## 📋 Overview

Currently, your `workout-tracker.html` displays sample data. We need to:

1. Add Supabase client library
2. Configure connection with your Supabase URL and key
3. Replace sample data with database queries
4. Add real-time updates when new workouts are logged

---

## 🔧 Step 1: Add Supabase Client

Your React app is a single HTML file, so we'll use Supabase's CDN version.

Add this script tag in the `<head>` section of `workout-tracker.html`:

```html
<!-- Add before your existing React scripts -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

---

## 🔑 Step 2: Configure Supabase Connection

Add your Supabase credentials. In your React app's initialization code, add:

```javascript
// Initialize Supabase client
const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // Your anon/public key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**⚠️ Important**: 
- Use your **anon/public** key (NOT the service role key)
- This key is safe to expose in frontend code
- Find it in Supabase Dashboard > Settings > API

---

## 📊 Step 3: Replace Sample Data with Database Queries

### Current Sample Data Structure

Your app currently uses:
```javascript
const [workouts, setWorkouts] = useState([
  {
    id: 1,
    date: '2026-01-30',
    duration_minutes: 65,
    workout_type: 'PUSH',
    exercises: [
      {
        exercise_name: 'Bench Press',
        sets: [
          { reps: 10, weight_lbs: 185 },
          { reps: 8, weight_lbs: 195 },
          { reps: 6, weight_lbs: 205 }
        ]
      }
    ]
  }
]);
```

### New Database Query

Replace sample data initialization with:

```javascript
const [workouts, setWorkouts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// Fetch workouts from Supabase
const fetchWorkouts = async () => {
  try {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id,
        date,
        duration_minutes,
        workout_type,
        notes,
        strava_activity_id,
        created_at,
        exercises (
          id,
          exercise_name,
          order_index,
          sets (
            id,
            set_number,
            reps,
            weight_lbs
          )
        )
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    // Transform data to match existing structure
    const transformedData = data.map(workout => ({
      ...workout,
      exercises: workout.exercises
        .sort((a, b) => a.order_index - b.order_index)
        .map(exercise => ({
          exercise_name: exercise.exercise_name,
          sets: exercise.sets
            .sort((a, b) => a.set_number - b.set_number)
            .map(set => ({
              reps: set.reps,
              weight_lbs: set.weight_lbs
            }))
        }))
    }));

    setWorkouts(transformedData);
  } catch (err) {
    console.error('Error fetching workouts:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// Fetch on component mount
React.useEffect(() => {
  fetchWorkouts();
}, []);
```

---

## 🔄 Step 4: Add Real-Time Updates

Subscribe to database changes so new workouts appear automatically:

```javascript
React.useEffect(() => {
  // Initial fetch
  fetchWorkouts();

  // Subscribe to real-time changes
  const subscription = supabase
    .channel('workout-changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'workouts'
      },
      (payload) => {
        console.log('Workout change detected:', payload);
        // Refetch all workouts when any change occurs
        fetchWorkouts();
      }
    )
    .subscribe();

  // Cleanup subscription on unmount
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## 🎨 Step 5: Add Loading and Error States

Update your UI to show loading and error states:

```javascript
function App() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ... other state

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading workouts...</p>
        </div>
      </div>
    );
  }

  // Show error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-500 mb-4">Error loading workouts:</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchWorkouts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (workouts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-2xl mb-4">💪</p>
          <p className="text-gray-400 mb-2">No workouts yet!</p>
          <p className="text-gray-500 text-sm">
            Log your first workout using the iPhone Shortcut
          </p>
        </div>
      </div>
    );
  }

  // Rest of your app...
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Your existing UI */}
    </div>
  );
}
```

---

## ✏️ Step 6: Enable Workout Editing

Add functionality to update workouts in the database:

```javascript
const updateWorkout = async (workoutId, updatedData) => {
  try {
    // Update workout metadata
    const { error: workoutError } = await supabase
      .from('workouts')
      .update({
        date: updatedData.date,
        duration_minutes: updatedData.duration_minutes,
        notes: updatedData.notes
      })
      .eq('id', workoutId);

    if (workoutError) throw workoutError;

    // For updating exercises/sets, you'll need to:
    // 1. Delete old exercises and sets
    // 2. Insert new ones
    // OR implement more sophisticated UPDATE logic

    // Refresh data
    await fetchWorkouts();

    return { success: true };
  } catch (err) {
    console.error('Error updating workout:', err);
    return { success: false, error: err.message };
  }
};
```

**Note**: Editing exercises/sets is more complex. Consider these approaches:
1. **Simple**: Delete all exercises/sets and re-insert (easiest)
2. **Complex**: Track changes and update only modified items
3. **Hybrid**: Allow editing only workout metadata (date, duration, notes)

---

## 🗑️ Step 7: Enable Workout Deletion

```javascript
const deleteWorkout = async (workoutId) => {
  try {
    // Supabase will auto-delete related exercises and sets
    // if you have CASCADE delete configured
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);

    if (error) throw error;

    // Refresh data
    await fetchWorkouts();

    return { success: true };
  } catch (err) {
    console.error('Error deleting workout:', err);
    return { success: false, error: err.message };
  }
};
```

**Database Setup Required**: Ensure CASCADE delete is configured in your schema:

```sql
-- In your supabase-setup.sql, make sure foreign keys have CASCADE:
ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_workout_id_fkey,
  ADD CONSTRAINT exercises_workout_id_fkey
    FOREIGN KEY (workout_id)
    REFERENCES workouts(id)
    ON DELETE CASCADE;

ALTER TABLE sets
  DROP CONSTRAINT IF EXISTS sets_exercise_id_fkey,
  ADD CONSTRAINT sets_exercise_id_fkey
    FOREIGN KEY (exercise_id)
    REFERENCES exercises(id)
    ON DELETE CASCADE;
```

---

## 📈 Step 8: Fetch Exercise History (for Exercise Detail View)

For the "EXERCISES" tab where you show history for a specific exercise:

```javascript
const fetchExerciseHistory = async (exerciseName, timeFilter = 'all') => {
  try {
    let query = supabase
      .from('exercises')
      .select(`
        id,
        exercise_name,
        workouts!inner (
          id,
          date,
          workout_type
        ),
        sets (
          id,
          set_number,
          reps,
          weight_lbs
        )
      `)
      .eq('exercise_name', exerciseName)
      .order('workouts(date)', { ascending: false });

    // Apply time filter
    const now = new Date();
    if (timeFilter === 'month') {
      const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
      query = query.gte('workouts.date', oneMonthAgo.toISOString());
    } else if (timeFilter === '3months') {
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      query = query.gte('workouts.date', threeMonthsAgo.toISOString());
    } else if (timeFilter === '6months') {
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
      query = query.gte('workouts.date', sixMonthsAgo.toISOString());
    } else if (timeFilter === 'year') {
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      query = query.gte('workouts.date', oneYearAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('Error fetching exercise history:', err);
    return [];
  }
};
```

---

## 🏆 Step 9: Calculate Personal Records (PRs)

```javascript
const calculatePRs = (workouts) => {
  const prs = {};

  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      const exerciseName = exercise.exercise_name;

      if (!prs[exerciseName]) {
        prs[exerciseName] = {
          maxWeight: 0,
          maxReps: 0,
          maxVolume: 0,
          bestSet: null
        };
      }

      exercise.sets.forEach(set => {
        // Max weight
        if (set.weight_lbs > prs[exerciseName].maxWeight) {
          prs[exerciseName].maxWeight = set.weight_lbs;
        }

        // Max reps (at any weight)
        if (set.reps > prs[exerciseName].maxReps) {
          prs[exerciseName].maxReps = set.reps;
        }

        // Max volume (weight × reps)
        const volume = set.weight_lbs * set.reps;
        if (volume > prs[exerciseName].maxVolume) {
          prs[exerciseName].maxVolume = volume;
          prs[exerciseName].bestSet = set;
        }
      });
    });
  });

  return prs;
};

// Usage
const prs = calculatePRs(workouts);
```

---

## 🔐 Step 10: Supabase Security (Row Level Security)

Since your app has no authentication, you need to configure public access.

**In Supabase Dashboard > Authentication > Policies:**

### For `workouts` table:
```sql
-- Enable RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
  ON workouts FOR SELECT
  TO anon
  USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert access"
  ON workouts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Allow public update access"
  ON workouts FOR UPDATE
  TO anon
  USING (true);

-- Allow public delete access
CREATE POLICY "Allow public delete access"
  ON workouts FOR DELETE
  TO anon
  USING (true);
```

### For `exercises` table:
```sql
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON exercises
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

### For `sets` table:
```sql
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON sets
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

**⚠️ Security Note**: This allows anyone with your Supabase URL and anon key to access/modify data. Since this is for personal use only, keep your app URL private!

---

## 📱 Step 11: Complete Integration Example

Here's how your main App component should look:

```javascript
function App() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('log');

  // Initialize Supabase
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Fetch workouts
  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          exercises (
            *,
            sets (*)
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedData = data.map(workout => ({
        ...workout,
        exercises: workout.exercises
          .sort((a, b) => a.order_index - b.order_index)
          .map(exercise => ({
            exercise_name: exercise.exercise_name,
            sets: exercise.sets
              .sort((a, b) => a.set_number - b.set_number)
              .map(set => ({
                reps: set.reps,
                weight_lbs: set.weight_lbs
              }))
          }))
      }));

      setWorkouts(transformedData);
    } catch (err) {
      console.error('Error fetching workouts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  React.useEffect(() => {
    fetchWorkouts();

    const subscription = supabase
      .channel('workout-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'workouts' },
          () => fetchWorkouts()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // Rest of your component...
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={fetchWorkouts} />;
  if (workouts.length === 0) return <EmptyState />;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Your existing UI */}
    </div>
  );
}
```

---

## ✅ Testing Checklist

After implementing:

- [ ] App loads without errors
- [ ] Workouts display from database (not sample data)
- [ ] Exercise list shows all unique exercises
- [ ] Exercise detail view shows history
- [ ] New workouts appear automatically (real-time)
- [ ] Loading states work
- [ ] Error states work
- [ ] Empty state works (when no workouts)
- [ ] PRs calculate correctly
- [ ] Export functions still work

---

## 🐛 Troubleshooting

### "Failed to fetch workouts" / CORS errors

**Solution**: Your Supabase URL and key are correct, but check:
- Anon key (not service role key)
- RLS policies are set correctly
- Tables exist in database

### Workouts not appearing

**Solution**: 
```javascript
// Check browser console for errors
console.log('Workouts:', workouts);

// Verify query is working
const testQuery = async () => {
  const { data, error } = await supabase.from('workouts').select('*');
  console.log('Query result:', data, error);
};
```

### Real-time updates not working

**Solution**:
- Enable Realtime in Supabase Dashboard > Database > Replication
- Check subscription is active: `console.log(subscription.state)`

### Wrong data structure

**Solution**: Verify your transform logic matches database schema:
```javascript
// Log raw data before transform
console.log('Raw data from Supabase:', data);
console.log('Transformed data:', transformedData);
```

---

## 🚀 Next Steps

After database connection works:

1. ✅ Test logging workout via iPhone Shortcut
2. ✅ Verify it appears in frontend
3. ✅ Test all existing features (edit, export, etc.)
4. Consider adding:
   - Charts/graphs for progress visualization
   - Exercise selection autocomplete
   - Workout templates
   - Strava integration

---

## 💾 Updated File Structure

```
irontrack/
├── workout-tracker.html    # Updated with Supabase integration
├── workout_server.py       # Backend (already done)
├── config.py              # Config (already done)
├── Dockerfile            # Docker (already done)
└── ... other files
```

---

**Ready to connect your frontend? Follow the steps above! 🎯**
