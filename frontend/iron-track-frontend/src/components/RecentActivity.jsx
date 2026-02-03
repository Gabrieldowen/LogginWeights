import React from 'react';
import { Calendar, Dumbbell, TrendingUp } from 'lucide-react';
import Card from './Card';

const RecentActivity = ({ workouts, loading }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <Card title="Recent Activity" subtitle="Your latest 5 workouts">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-dark-bg rounded-lg"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <Card title="Recent Activity" subtitle="Your latest 5 workouts">
        <div className="text-center py-8">
          <Dumbbell size={48} className="mx-auto text-dark-muted mb-3" />
          <p className="text-dark-muted">No workouts logged yet</p>
          <p className="text-dark-muted text-sm mt-1">Start logging to see your activity here</p>
        </div>
      </Card>
    );
  }

  // Sort workouts by date descending (most recent first)
  const sortedWorkouts = [...workouts].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at);
    const dateB = new Date(b.date || b.created_at);
    return dateB - dateA; // Descending order
  });

  return (
    <Card title="Recent Activity" subtitle="Your latest 5 workouts">
      <div className="space-y-3">
        {sortedWorkouts.slice(0, 5).map((workout, index) => (
          <div 
            key={workout.id || index}
            className="bg-dark-bg border border-dark-border rounded-lg p-4 hover:border-primary transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                <span className="text-sm font-medium text-dark-text">
                  {formatDate(workout.date || workout.created_at)}
                </span>
              </div>
              {workout.total_volume && (
                <div className="flex items-center gap-1 text-dark-muted">
                  <TrendingUp size={14} />
                  <span className="text-xs">{workout.total_volume.toLocaleString()} lbs</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {workout.exercises && workout.exercises.length > 0 ? (
                // Display exercises with their sets
                workout.exercises.map((exercise, exIdx) => (
                  <div key={exIdx} className="mb-2">
                    <div className="text-sm font-semibold text-dark-text mb-1">
                      {exercise.name}
                    </div>
                    <div className="ml-3 space-y-0.5">
                      {exercise.sets && exercise.sets.length > 0 ? (
                        exercise.sets.map((set, setIdx) => (
                          <div key={setIdx} className="text-xs text-dark-muted">
                            Set {set.set_number}: {set.reps} reps @ {set.weight} lbs
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-dark-muted">No set details</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-dark-muted">No exercise details available</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;
