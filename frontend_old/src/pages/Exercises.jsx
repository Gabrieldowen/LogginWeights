import React from 'react';
import Card from '../components/Card';
import { Dumbbell } from 'lucide-react';

const Exercises = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-text mb-2">Exercise History</h1>
        <p className="text-dark-muted">View detailed history for specific movements</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <Dumbbell size={64} className="mx-auto text-dark-muted mb-4" />
          <h3 className="text-xl font-semibold text-dark-text mb-2">Exercise Details Coming Soon</h3>
          <p className="text-dark-muted">
            Dive deep into individual exercise performance
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Exercises;
