import React, { useState } from 'react';
import { Plus, Minus, Trash2, Save, Dumbbell, X } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { workoutAPI } from '../api/workouts';

const WorkoutManualEntry = ({ onWorkoutSaved }) => {
  const [exercises, setExercises] = useState([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  const addExercise = () => {
    if (!newExerciseName.trim()) return;

    const newExercise = {
      id: Date.now(),
      name: newExerciseName.trim(),
      sets: [{ id: Date.now(), reps: 5, weight: 0 }],
    };

    setExercises([...exercises, newExercise]);
    setNewExerciseName('');
  };

  const removeExercise = (exerciseId) => {
    setExercises(exercises.filter((ex) => ex.id !== exerciseId));
  };

  const addSet = (exerciseId) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: Date.now(),
                reps: lastSet?.reps || 5,
                weight: lastSet?.weight || 0,
              },
            ],
          };
        }
        return ex;
      })
    );
  };

  const removeSet = (exerciseId, setId) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.filter((s) => s.id !== setId),
          };
        }
        return ex;
      })
    );
  };

  const updateSet = (exerciseId, setId, field, value) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                return { ...s, [field]: Math.max(0, value) };
              }
              return s;
            }),
          };
        }
        return ex;
      })
    );
  };

  const calculateTotalVolume = () => {
    return exercises.reduce((total, ex) => {
      const exerciseVolume = ex.sets.reduce((sum, set) => {
        return sum + set.reps * set.weight;
      }, 0);
      return total + exerciseVolume;
    }, 0);
  };

  const handleSave = async () => {
    if (exercises.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    setSaving(true);

    try {
      // Format data to match backend schema
      const workoutData = {
        date: new Date().toISOString().split('T')[0],
        workout_type: 'strength',
        duration_minutes: null,
        notes: notes.trim() || null,
        exercises: exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((set, idx) => ({
            set_number: idx + 1,
            reps: set.reps,
            weight_lbs: set.weight,
          })),
        })),
      };

      await workoutAPI.logWorkout(JSON.stringify(workoutData));

      // Reset form
      setExercises([]);
      setNotes('');

      // Notify parent
      if (onWorkoutSaved) {
        onWorkoutSaved();
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Manual Entry" subtitle="Build your workout set by set">
      <div className="space-y-4">
        {/* Add Exercise Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addExercise()}
            placeholder="Exercise name (e.g., Bench Press)"
            className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <Button onClick={addExercise} icon={Plus} className="shrink-0">
            Add
          </Button>
        </div>

        {/* Exercises List */}
        {exercises.length === 0 ? (
          <div className="text-center py-8 text-dark-muted text-sm">
            <Dumbbell size={32} className="mx-auto mb-2 opacity-50" />
            <p>No exercises added yet</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-dark-bg border border-dark-border rounded-lg p-3"
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-dark-text text-sm">
                    {exercise.name}
                  </h4>
                  <button
                    onClick={() => removeExercise(exercise.id)}
                    className="text-red-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Sets */}
                <div className="space-y-2">
                  {exercise.sets.map((set, idx) => (
                    <div
                      key={set.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="text-dark-muted w-8">#{idx + 1}</span>

                      {/* Reps Stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateSet(exercise.id, set.id, 'reps', set.reps - 1)
                          }
                          className="w-6 h-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-border flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(
                              exercise.id,
                              set.id,
                              'reps',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-12 text-center bg-dark-surface border border-dark-border rounded py-1 text-dark-text focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() =>
                            updateSet(exercise.id, set.id, 'reps', set.reps + 1)
                          }
                          className="w-6 h-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-border flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                        <span className="text-dark-muted ml-1">reps</span>
                      </div>

                      <span className="text-dark-muted">@</span>

                      {/* Weight Stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateSet(
                              exercise.id,
                              set.id,
                              'weight',
                              set.weight - 5
                            )
                          }
                          className="w-6 h-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-border flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          value={set.weight}
                          onChange={(e) =>
                            updateSet(
                              exercise.id,
                              set.id,
                              'weight',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-14 text-center bg-dark-surface border border-dark-border rounded py-1 text-dark-text focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() =>
                            updateSet(
                              exercise.id,
                              set.id,
                              'weight',
                              set.weight + 5
                            )
                          }
                          className="w-6 h-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-border flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                        <span className="text-dark-muted ml-1">lbs</span>
                      </div>

                      {/* Volume for this set */}
                      <span className="text-dark-muted ml-auto text-xs">
                        {(set.reps * set.weight).toLocaleString()} lbs
                      </span>

                      {/* Remove Set */}
                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(exercise.id, set.id)}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Set Button */}
                <button
                  onClick={() => addSet(exercise.id)}
                  className="mt-2 text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  <Plus size={12} />
                  Add Set
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {exercises.length > 0 && (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
          </div>
        )}

        {/* Total Volume & Save */}
        {exercises.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-dark-border">
            <div className="text-sm">
              <span className="text-dark-muted">Total Volume: </span>
              <span className="font-bold text-primary text-lg">
                {calculateTotalVolume().toLocaleString()}
              </span>
              <span className="text-dark-muted"> lbs</span>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              icon={Save}
              className={saving ? 'animate-pulse' : ''}
            >
              {saving ? 'Saving...' : 'Save Workout'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WorkoutManualEntry;
