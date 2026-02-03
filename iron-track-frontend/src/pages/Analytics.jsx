import React from 'react';
import Card from '../components/Card';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-text mb-2">Analytics</h1>
        <p className="text-dark-muted">Visualize your strength progress</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <BarChart3 size={64} className="mx-auto text-dark-muted mb-4" />
          <h3 className="text-xl font-semibold text-dark-text mb-2">Analytics Coming Soon</h3>
          <p className="text-dark-muted">
            Track your progress with detailed charts and insights
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
