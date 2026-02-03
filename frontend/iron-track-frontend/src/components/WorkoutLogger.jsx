import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from './Card';
import TextArea from './TextArea';
import Button from './Button';
import { workoutAPI } from '../api/workouts';

const WorkoutLogger = ({ onWorkoutLogged }) => {
  const [workoutText, setWorkoutText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', or null

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!workoutText.trim()) {
      setStatus('error');
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await workoutAPI.logWorkout(workoutText);
      setStatus('success');
      setWorkoutText('');
      
      // Notify parent component to refresh workout list
      if (onWorkoutLogged) {
        onWorkoutLogged();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to log workout:', error);
      setStatus('error');
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Log Workout" subtitle="Enter your workout details in natural language">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextArea
          value={workoutText}
          onChange={(e) => setWorkoutText(e.target.value)}
          placeholder="Example: Deadlift 3x5 @ 315lbs&#10;Bench Press 5x5 @ 225lbs&#10;Squats 3x8 @ 275lbs"
          rows={6}
          disabled={loading}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === 'success' && (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 size={20} />
                <span className="text-sm">Workout logged successfully!</span>
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={20} />
                <span className="text-sm">Failed to log workout. Please try again.</span>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={loading || !workoutText.trim()}
            icon={loading ? Loader2 : Send}
            className={loading ? 'animate-pulse' : ''}
          >
            {loading ? 'Logging...' : 'Log Workout'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default WorkoutLogger;
