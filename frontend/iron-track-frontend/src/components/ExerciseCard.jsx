import React from 'react';
import { TrendingUp, Calendar, Dumbbell } from 'lucide-react';

const ExerciseCard = ({ exercise, onSelect, isSelected }) => {
  return (
    <div
      onClick={onSelect}
      className={`bg-dark-surface border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
        isSelected ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-dark-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Dumbbell size={20} className="text-primary" />
          <h3 className="font-semibold text-dark-text">{exercise.name}</h3>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-muted">Personal Record</span>
          <span className="text-lg font-bold text-primary">{exercise.pr_weight} lbs</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-dark-muted">
            <Calendar size={12} />
            <span>
              {new Date(exercise.pr_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-dark-muted">
            <TrendingUp size={12} />
            <span>{exercise.total_sessions} sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;
