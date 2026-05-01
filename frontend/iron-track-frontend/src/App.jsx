import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

function AppInner() {
  const location = useLocation();
  const hiddenNav = location.pathname === '/';
  return (
    <div className="min-h-screen bg-dark-bg">
      {!hiddenNav && <Navigation />}
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}
function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppInner />
      </Router>
    </ThemeProvider>
  );
}

export default App;
