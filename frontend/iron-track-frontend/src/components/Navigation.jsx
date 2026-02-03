import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Dumbbell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navigation = () => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-dark-surface border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Dumbbell className="text-primary" size={28} />
            <span className="text-xl font-bold text-dark-text">Iron Track</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-dark-muted hover:text-dark-text hover:bg-dark-bg'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-4 p-2 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-bg transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
