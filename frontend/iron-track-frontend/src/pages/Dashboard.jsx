import React, { useState, useEffect } from 'react';
import WorkoutLogger from '../components/WorkoutLogger';
import RecentActivity from '../components/RecentActivity';
import { workoutAPI } from '../api/workouts';

const Dashboard = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    // Refresh the workout list after a new workout is logged
    fetchWorkouts();
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
          <WorkoutLogger onWorkoutLogged={handleWorkoutLogged} />
        </div>

        {/* Right Column - Recent Activity */}
        <div>
          <RecentActivity workouts={workouts} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
