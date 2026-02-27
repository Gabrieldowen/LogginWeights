import React, { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import Card from '../components/Card';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseChart from '../components/ExerciseChart';
import { workoutAPI } from '../api/workouts';

const Analytics = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await workoutAPI.getAllExercises();
        setExercises(data);
        
        // Auto-select first exercise if available
        if (data && data.length > 0) {
          setSelectedExercise(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch exercises:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text mb-2">Analytics & Exercises</h1>
          <p className="text-dark-muted">Track your strength progress by exercise</p>
        </div>
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text mb-2">Analytics & Exercises</h1>
          <p className="text-dark-muted">Track your strength progress by exercise</p>
        </div>
        <Card>
          <div className="text-center py-12">
            <BarChart3 size={64} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-dark-text mb-2">Unable to Load Exercises</h3>
            <p className="text-dark-muted">{error}</p>
            <p className="text-xs text-dark-muted mt-2">
              Make sure the backend endpoint /api/get_all_exercises is implemented
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text mb-2">Analytics & Exercises</h1>
          <p className="text-dark-muted">Track your strength progress by exercise</p>
        </div>
        <Card>
          <div className="text-center py-12">
            <BarChart3 size={64} className="mx-auto text-dark-muted mb-4" />
            <h3 className="text-xl font-semibold text-dark-text mb-2">No Exercise Data</h3>
            <p className="text-dark-muted">
              Start logging workouts to see your progress here
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-text mb-2">Analytics & Exercises</h1>
        <p className="text-dark-muted">Track your strength progress by exercise</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Content - Chart and History */}
        <div className="lg:col-span-2">
          {selectedExercise ? (
            <ExerciseChart exercise={selectedExercise} />
          ) : (
            <Card>
              <div className="text-center py-12">
                <BarChart3 size={64} className="mx-auto text-dark-muted mb-4" />
                <p className="text-dark-muted">Select an exercise to view progress</p>
              </div>
            </Card>
          )}
        </div>
        {/* Left Sidebar - Exercise Cards */}
        <div className="lg:col-span-1">
          <Card title="Exercises" subtitle={`${exercises.length} tracked movements`}>
            <div className="space-y-3">
              {exercises.map((exercise, idx) => (
                <ExerciseCard
                  key={idx}
                  exercise={exercise}
                  isSelected={selectedExercise?.name === exercise.name}
                  onSelect={() => setSelectedExercise(exercise)}
                />
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
