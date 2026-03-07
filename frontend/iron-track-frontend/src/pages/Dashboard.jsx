import React, { useState, useEffect } from 'react';
import WorkoutLogger from '../components/WorkoutLogger';
import RecentActivity from '../components/RecentActivity';
import { workoutAPI } from '../api/workouts';
import WorkoutManualEntry from '../components/WorkoutManualEntry';

const Dashboard = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [mode, setMode] = useState("create");

  const [activeTab, setActiveTab] = useState('manual');

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const data = await workoutAPI.getWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

const handleWorkoutLogged = () => {
  fetchWorkouts();
  setSelectedWorkout(null);
  setMode("create");
};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-text mb-2">Dashboard</h1>
        <p className="text-dark-muted">Track your strength journey</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Workout Logger */}
        <div>
        {/* Tabs */}
        <div className="flex gap-1 mb-0 bg-dark-surface rounded-t-lg p-1 border border-dark-border border-b-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manual' ? 'bg-primary text-white' : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'text' ? 'bg-primary text-white' : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            AI Logger
          </button>
        </div>

        {activeTab === 'manual' ? (
          <WorkoutManualEntry
            mode={mode}
            initialData={selectedWorkout}
            onWorkoutSaved={handleWorkoutLogged}
          />
        ) : (
          <WorkoutLogger onWorkoutLogged={handleWorkoutLogged} />
        )}
      </div>

        {/* Right Column - Recent Activity */}
        <div>
          <RecentActivity
            workouts={workouts}
            loading={loading}
            onEdit={(workout) => {
              setSelectedWorkout(workout);
              setMode("edit");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
