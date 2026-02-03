# Iron Track Frontend - Project Overview

## 🎯 Project Summary

Iron Track is a fitness analytics dashboard frontend built with modern React best practices. It provides a clean, dark-themed interface for logging workouts and tracking strength progress.

## 🏛️ Architecture Principles

### 1. Backend-Only Data Layer
- **Zero direct database access** from frontend
- All data operations route through Flask API endpoints
- API calls centralized in `/src/api/` directory

### 2. Environment-Based Configuration
- `VITE_API_BASE_URL` controls backend endpoint
- Seamless transition from localhost → staging → production
- No code changes needed for deployment

### 3. Component Modularity
- Single Responsibility Principle for each component
- Reusable UI elements in `/src/components/`
- Page-level components in `/src/pages/`

## 📊 Data Flow

```
User Input (Dashboard)
    ↓
WorkoutLogger Component
    ↓
workoutAPI.logWorkout()
    ↓
axios POST to /webhook/log_workout
    ↓
Flask Backend (parsing & storage)
    ↓
Success Response
    ↓
Refresh workouts via workoutAPI.getWorkouts()
    ↓
Update RecentActivity Component
```

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.2.0 |
| Vite | Build Tool | 5.0.8 |
| Tailwind CSS | Styling | 3.3.6 |
| React Router | Navigation | 6.20.0 |
| Axios | HTTP Client | 1.6.2 |
| Lucide React | Icons | 0.263.1 |
| Recharts | Analytics Graphs | 2.10.3 |

## 🎨 Design System

### Color Palette (Dark Theme)
```css
Background:     #0f172a (dark-bg)
Surface:        #1e293b (dark-surface)
Border:         #334155 (dark-border)
Text Primary:   #e2e8f0 (dark-text)
Text Secondary: #94a3b8 (dark-muted)
Primary Blue:   #3b82f6
```

### Typography
- Font: System UI stack
- Headings: Bold, 2xl-3xl
- Body: Regular, base-sm
- Code: Monospace

### Spacing
- Consistent 4px grid (Tailwind defaults)
- Card padding: 1.5rem
- Section gaps: 1.5rem

## 📁 File Organization

### `/src/api/` - Backend Communication
**config.js**
- Axios instance with baseURL from env
- Request/response interceptors for logging
- Centralized timeout configuration

**workouts.js**
- `logWorkout(workoutText)` - POST to /webhook/log_workout
- `getWorkouts()` - GET from /api/workouts
- `getExerciseHistory(exerciseName)` - GET from /api/exercises/:name

### `/src/components/` - Reusable UI
**Button.jsx**
- Variants: primary, secondary, danger
- Icon support via Lucide
- Disabled states with opacity

**Card.jsx**
- Container for content sections
- Optional title and subtitle
- Dark surface background

**TextArea.jsx**
- Multi-line input with focus states
- Placeholder support
- Disabled state styling

**WorkoutLogger.jsx**
- Form with textarea for workout input
- Submit handler with loading states
- Success/error feedback messages
- Calls parent callback on successful log

**RecentActivity.jsx**
- Displays last 5 workouts
- Loading skeleton states
- Empty state with helpful messaging
- Formatted dates (Today, Yesterday, X days ago)

**Navigation.jsx**
- React Router Links for pages
- Active state highlighting
- Theme toggle button
- Responsive design (icons on mobile)

### `/src/pages/` - Route Components
**Dashboard.jsx**
- Main landing page
- Two-column layout (logger + activity)
- Fetches workouts on mount
- Refreshes on new workout

**Analytics.jsx**
- Placeholder for charts (future implementation)
- Will use Recharts for line graphs

**Exercises.jsx**
- Placeholder for exercise detail view
- Will show per-exercise history

### `/src/context/` - Global State
**ThemeContext.jsx**
- Manages dark/light theme state
- Applies `.dark` class to `<html>`
- Default: dark mode

## 🔌 API Integration

All API calls use the centralized `apiClient` from `config.js`:

```javascript
import { apiClient } from './config';

// Example: Log workout
const response = await apiClient.post('/webhook/log_workout', {
  text: 'Deadlift 3x5 @ 315lbs'
});
```

The base URL is automatically prepended from `VITE_API_BASE_URL`.

## 🚀 Deployment Checklist

1. Update `.env` with production API URL
2. Run `npm run build`
3. Deploy `dist/` folder to hosting service
4. Ensure backend CORS allows frontend domain
5. Test all API endpoints in production

## 🔒 Security Considerations

- No API keys in frontend code
- CORS handled by backend
- No sensitive data stored in localStorage
- All environment variables prefixed with `VITE_`

## 📈 Performance Optimizations

- Vite's fast HMR for development
- Tree-shaking in production builds
- Lazy loading for route components (future)
- Optimized Tailwind CSS (unused classes purged)

## 🧪 Testing Strategy (Planned)

- Unit tests for components (Jest + React Testing Library)
- Integration tests for API calls (MSW for mocking)
- E2E tests for critical flows (Playwright)

## 🎓 Learning Resources

For developers working on this project:

1. [Vite Documentation](https://vitejs.dev)
2. [React Router v6](https://reactrouter.com)
3. [Tailwind CSS](https://tailwindcss.com)
4. [Recharts Examples](https://recharts.org)

## 🐛 Known Issues / TODOs

- [ ] Add TypeScript for type safety
- [ ] Implement Analytics page with Recharts
- [ ] Add Exercise detail page with history
- [ ] Voice-to-text integration
- [ ] Add unit tests
- [ ] Add loading skeletons for all async operations
- [ ] Implement error boundary for graceful failures
- [ ] Add toast notifications library
- [ ] Optimize bundle size analysis

## 📞 API Contract

This frontend expects specific response formats from the backend. See `README.md` for detailed endpoint specifications.

---

**Last Updated:** February 2, 2026
**Version:** 0.1.0
**Status:** Dashboard & Logging Complete ✅
