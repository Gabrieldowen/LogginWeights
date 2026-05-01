import React, { useState, useEffect } from 'react';
import WorkoutManualEntry from '../components/WorkoutManualEntry';
import WorkoutLogger from '../components/WorkoutLogger';
import { workoutAPI } from '../api/workouts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [screen, setScreen] = useState('log'); // log | history
  const [tab, setTab] = useState('manual'); // manual | ai
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [mode, setMode] = useState('create');

  const navigate = useNavigate();

  const fetchWorkouts = async () => {
    const data = await workoutAPI.getWorkouts();
    setWorkouts(data);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleSaved = () => {
    fetchWorkouts();
    setSelectedWorkout(null);
    setMode('create');
  };

  const computeVolume = (w) =>
    w.exercises.reduce(
      (t, ex) =>
        t +
        ex.sets.reduce((s, set) => s + set.reps * (set.weight_lbs ?? set.weight ?? 0), 0),
      0
    );

const IconAnalytics = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

  return (
<div className="max-w-sm mx-auto h-screen bg-dark-bg flex flex-col">
      {/* HEADER */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-center">
        <div>
          <div className="text-xs text-dark-muted">
            {new Date().toLocaleDateString()}
          </div>
          <div className="text-lg font-bold text-dark-text">
            {screen === 'log' ? 'Log Workout' : 'History'}
          </div>
        </div>
      </div>

      {/* LOG SCREEN */}
      {screen === 'log' && (
        <div className="flex-1 overflow-y-auto px-4">

          {/* tabs */}
          <div className="flex bg-dark-surface rounded-lg p-1 mb-3">
            <button
              onClick={() => setTab('manual')}
              className={`flex-1 py-2 rounded ${
                tab === 'manual'
                  ? 'bg-primary text-white'
                  : 'text-dark-muted'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setTab('ai')}
              className={`flex-1 py-2 rounded ${
                tab === 'ai'
                  ? 'bg-primary text-white'
                  : 'text-dark-muted'
              }`}
            >
              AI Logger
            </button>
          </div>

          {tab === 'manual' ? (
            <WorkoutManualEntry
              mode={mode}
              initialData={selectedWorkout}
              onWorkoutSaved={handleSaved}
              simplified
            />
          ) : (
            <WorkoutLogger onWorkoutLogged={handleSaved} />
          )}

          {/* recent */}
          <div className="mt-6">
            <div className="font-bold text-sm mb-2 text-dark-text">
              Recent Activity
            </div>

            {workouts.slice(0, 3).map((w) => (
              <div
                key={w.id}
                className="bg-dark-surface p-3 rounded-lg mb-2 flex justify-between"
              >
                <div>
                  <div className="text-xs text-dark-muted">
                    {new Date(w.date).toLocaleDateString()}
                  </div>
                  <div className="font-semibold text-sm text-dark-text">
                    {w.workout_type || 'Workout'}
                  </div>
                  <div className="text-xs text-dark-muted space-y-0.5 mt-1">
                    {w.exercises.slice(0, 3).map((ex) => (
                      <div key={ex.name}>
                        <span className="text-dark-text font-semibold">{ex.name}</span>
                        {' — '}
                        {ex.sets.map((s, i) => (
                          <span key={i}>{s.reps}×{s.weight_lbs ?? s.weight ?? 0}{i < ex.sets.length - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-primary font-bold">
                    {computeVolume(w).toLocaleString()}
                  </div>
                  <div className="text-xs text-dark-muted">lbs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY SCREEN */}
      {screen === 'history' && (
        <div className="flex-1 overflow-y-auto px-4">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="bg-dark-surface p-3 rounded-lg mb-2 flex justify-between"
            >
              <div>
                <div className="text-xs text-dark-muted">
                  {new Date(w.date).toLocaleDateString()}
                </div>
                <div className="font-semibold text-sm text-dark-text">
                  {w.workout_type || 'Workout'}
                </div>
                <div className="text-xs text-dark-muted">
                  {w.exercises.map((e) => e.name).slice(0, 2).join(' · ')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-primary font-bold">
                    {computeVolume(w).toLocaleString()}
                  </div>
                  <div className="text-xs text-dark-muted">lbs</div>
                </div>

                <button
                  onClick={() => {
                    setSelectedWorkout(w);
                    setMode('edit');
                    setScreen('log');
                    setTab('manual');
                  }}
                  className="text-dark-muted"
                >
                  ✎
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="flex border-t border-dark-border">
        <button
          onClick={() => setScreen('log')}
          className={`flex-1 py-2 ${
            screen === 'log'
              ? 'text-primary'
              : 'text-dark-muted'
          }`}
        >
          Log
        </button>
        <button
          onClick={() => setScreen('history')}
          className={`flex-1 py-2 ${
            screen === 'history'
              ? 'text-primary'
              : 'text-dark-muted'
          }`}
        >
          History
        </button>
      <button onClick={() => navigate('/analytics')} className="flex-1 py-3 flex flex-col items-center gap-1 text-dark-muted">
        <IconAnalytics /><span className="text-[10px] font-bold">Analytics</span>
      </button>
      </div>
    </div>
  );
};

export default Dashboard;