import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from './Card';

const ExerciseChart = ({ exercise }) => {
  // Prepare data for the chart - sort by date ascending for proper timeline
  const chartData = [...exercise.history]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((session) => ({
      date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: session.weight,
      fullDate: session.date,
    }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-3 shadow-lg">
          <p className="text-dark-text text-sm font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-primary text-lg font-bold">{payload[0].value} lbs</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card title={`${exercise.name} Progress`} subtitle="Working set weight over time">
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8" 
              style={{ fontSize: '12px' }}
              label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* History Table */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-dark-text mb-3">Session History</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {[...exercise.history]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((session, idx) => (
              <div
                key={idx}
                className="bg-dark-bg border border-dark-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-dark-text">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">Top: {session.weight} lbs</p>
                    <p className="text-xs text-dark-muted">{session.volume?.toLocaleString()} lbs total volume</p>
                  </div>
                </div>
                
                {/* Display individual sets */}
                {session.set_details && session.set_details.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dark-border">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {session.set_details.map((set, setIdx) => (
                        <div key={setIdx} className="text-xs text-dark-muted">
                          Set {set.set_number}: {set.reps} × {set.weight} lbs
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
};

export default ExerciseChart;
