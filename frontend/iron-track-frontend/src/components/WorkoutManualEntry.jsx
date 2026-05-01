import React, { useState, useEffect, useRef } from 'react';
import { workoutAPI } from '../api/workouts';

const WorkoutManualEntry = ({
  onWorkoutSaved,
  initialData = null,
  mode = 'create',
  simplified = true
}) => {
  const [exercises, setExercises] = useState([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);


  // preload for edit
  useEffect(() => {
    if (!initialData) return;

    setExercises(
      initialData.exercises.map((ex) => ({
        id: Date.now() + Math.random(),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: Date.now() + Math.random(),
          reps: s.reps,
          weight: s.weight_lbs ?? s.weight
        }))
      }))
    );
  }, [initialData]);

  useEffect(() => {
     workoutAPI.getAllExercises()
      .then((data) => setSuggestions([...data].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))))
      .catch(() => {});
  }, []);

  useEffect(() => {
      const handler = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target))
          setDropdownOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    },[]);
 
  const filteredSuggestions = suggestions.filter((s) =>
    s.name.toLowerCase().includes(newExerciseName.toLowerCase())
  );
  const isNewExercise = newExerciseName.trim() &&
    !suggestions.some((s) => s.name.toLowerCase() === newExerciseName.trim().toLowerCase());

 const addExercise = (name) => {
   name = (name || newExerciseName).trim();
   if (!name) return;

    setExercises([
      ...exercises,
      {
        id: Date.now(),
        name,
        sets: [{ id: Date.now(), reps: 5, weight: 0 }]
      }
    ]);
    setNewExerciseName('');
    setDropdownOpen(false)
  };

  const removeExercise = (id) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const addSet = (exerciseId) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;

        const last = ex.sets[ex.sets.length - 1];

        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: Date.now(),
              reps: last?.reps || 5,
              weight: last?.weight || 0
            }
          ]
        };
      })
    );
  };

  const removeSet = (exerciseId, setId) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;

        return {
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId)
        };
      })
    );
  };

  const updateSet = (exerciseId, setId, field, value) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;

        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId
              ? { ...s, [field]: Math.max(0, value) }
              : s
          )
        };
      })
    );
  };

  const calculateTotalVolume = () => {
    return exercises.reduce(
      (total, ex) =>
        total +
        ex.sets.reduce(
          (sum, s) => sum + s.reps * s.weight,
          0
        ),
      0
    );
  };

  const handleSave = async () => {
    if (exercises.length === 0) {
      alert('Add at least one exercise');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        workout_type: 'strength',
        duration_minutes: null,
        notes: null,
        exercises: exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s, i) => ({
            set_number: i + 1,
            reps: s.reps,
            weight_lbs: s.weight
          }))
        }))
      };

      if (mode === 'edit' && initialData?.id) {
        await workoutAPI.updateWorkout(initialData.id, payload);
      } else {
        await workoutAPI.logManualWorkout(payload);
      }

      setExercises([]);
      if (onWorkoutSaved) onWorkoutSaved();

    } catch (err) {
      console.error(err);
      alert('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Add exercise */}
      <div className="flex gap-2" ref={dropdownRef}>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={newExerciseName}
            onChange={(e) => { setNewExerciseName(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addExercise();
              if (e.key === 'Escape') setDropdownOpen(false);
            }}
            placeholder="Search or add exercise..."
            className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary text-[16px]"
          />
          {dropdownOpen && (filteredSuggestions.length > 0 || isNewExercise) && (
            <ul className="absolute z-50 mt-1 w-full bg-dark-surface border border-dark-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
              {isNewExercise && (
                <li onMouseDown={() => addExercise()} className="px-3 py-2 text-sm cursor-pointer text-primary hover:bg-dark-border flex items-center gap-2">
                  + Add &ldquo;{newExerciseName.trim()}&rdquo;
                </li>
              )}
              {filteredSuggestions.map((ex) => (
                <li key={ex.name} onMouseDown={() => addExercise(ex.name)} className="px-3 py-2 text-sm cursor-pointer text-dark-text hover:bg-dark-border flex items-center justify-between">
                  <span>{ex.name}</span>
                  <span className="text-dark-muted text-xs">{ex.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={addExercise}
          className="bg-primary px-3 rounded text-white font-semibold"
        >
          + Add
        </button>
      </div>

      {/* Exercises */}
      {exercises.map((ex) => (
        <div key={ex.id} className="bg-dark-surface p-3 rounded-lg">

          {/* header */}
          <div className="flex justify-between mb-2">
            <div className="font-semibold text-sm text-dark-text">
              {ex.name}
            </div>
            <button
              onClick={() => removeExercise(ex.id)}
              className="text-red-500"
            >
              ✕
            </button>
          </div>

          {/* labels */}
          <div className="flex justify-center text-xs text-dark-muted mb-1">
            <span className="w-[80px] text-center">REPS</span>
            <span className="w-[100px] text-center ml-6">WEIGHT</span>
          </div>

          {/* sets */}
          <div className="space-y-2">
            {ex.sets.map((s) => (
              <div key={s.id} className="flex items-center justify-center gap-2">

                {/* reps */}
                <button onClick={() =>
                  updateSet(ex.id, s.id, 'reps', s.reps - 1)
                }>-</button>

                <input
                  type="number"
                  value={s.reps}
                  onChange={(e) =>
                    updateSet(ex.id, s.id, 'reps', parseInt(e.target.value) || 0)
                  }
                  className="w-12 text-center bg-dark-bg border border-dark-border rounded"
                />

                <button onClick={() =>
                  updateSet(ex.id, s.id, 'reps', s.reps + 1)
                }>+</button>

                <div className="w-4" />

                {/* weight */}
                <button onClick={() =>
                  updateSet(ex.id, s.id, 'weight', s.weight - 5)
                }>-</button>

                <input
                  type="number"
                  value={s.weight}
                  onChange={(e) =>
                    updateSet(ex.id, s.id, 'weight', parseFloat(e.target.value) || 0)
                  }
                  className="w-14 text-center bg-dark-bg border border-dark-border rounded"
                />

                <button onClick={() =>
                  updateSet(ex.id, s.id, 'weight', s.weight + 5)
                }>+</button>

                {/* remove set */}
                {ex.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(ex.id, s.id)}
                    className="text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* add set */}
          <button
            onClick={() => addSet(ex.id)}
            className="text-primary text-xs mt-2 font-semibold"
          >
            + Add Set
          </button>
        </div>
      ))}

      {/* footer */}
      {exercises.length > 0 && (
        <div className="flex justify-between items-center pt-3 border-t border-dark-border">
          <div className="text-sm">
            <span className="text-dark-muted">Total: </span>
            <span className="text-primary font-bold text-lg">
              {calculateTotalVolume().toLocaleString()}
            </span>
            <span className="text-dark-muted"> lbs</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary px-4 py-2 rounded text-white font-semibold"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkoutManualEntry;