import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-dark-bg">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
