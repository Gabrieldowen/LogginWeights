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

  return (
    <Card title="Recent Activity" subtitle="Your latest 5 workouts">
      <div className="space-y-3">
        {workouts.slice(0, 5).map((workout, index) => (
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
            
            <div className="space-y-1">
              {workout.exercises?.map((exercise, idx) => (
                <div key={idx} className="text-sm text-dark-text">
                  <span className="font-medium">{exercise.name}</span>
                  <span className="text-dark-muted ml-2">
                    {exercise.sets}x{exercise.reps} @ {exercise.weight}lbs
                  </span>
                </div>
              )) || (
                <p className="text-sm text-dark-muted">{workout.description || 'Workout details'}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;
