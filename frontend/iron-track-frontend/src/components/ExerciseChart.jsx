import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from './Card';

const ExerciseChart = ({ exercise }) => {

  // Epley formula
  const calculateE1RM = (weight, reps) => {
    return weight * (1 + reps / 30);
  };

  // Build chart data
  const chartData = [...exercise.history]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((session) => {
      let bestE1RM = 0;

      if (session.set_details && session.set_details.length > 0) {
        session.set_details.forEach(set => {
          const est = calculateE1RM(set.weight, set.reps);
          if (est > bestE1RM) bestE1RM = est;
        });
      } else {
        // fallback if no set details
        bestE1RM = calculateE1RM(session.weight, 1);
      }

      return {
        date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: session.date,
        e1RM: Math.round(bestE1RM),
      };
    });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-3 shadow-lg">
          <p className="text-dark-text text-sm font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-primary text-lg font-bold">{payload[0].value} lbs e1RM</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card title={`${exercise.name} Strength (e1RM)`} subtitle="Estimated 1RM over time">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              label={{ value: 'Estimated 1RM (lbs)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="e1RM"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ExerciseChart;