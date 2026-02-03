# Iron Track - Fitness Analytics Dashboard

A modern, modular React frontend for tracking and analyzing strength training workouts. Built with Vite, Tailwind CSS, and designed to interface seamlessly with a Flask backend.

## 🏗️ Architecture

This frontend follows a strict separation of concerns:
- **NO direct database calls** - All data operations go through the backend API
- **Environment-based configuration** - Easy scaling from localhost to production
- **Modular component structure** - Reusable, maintainable code

## 📁 Project Structure

```
iron-track-frontend/
├── src/
│   ├── api/              # All backend communication
│   │   ├── config.js     # Centralized API configuration with axios
│   │   └── workouts.js   # Workout-related API calls
│   ├── components/       # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Navigation.jsx
│   │   ├── RecentActivity.jsx
│   │   ├── TextArea.jsx
│   │   └── WorkoutLogger.jsx
│   ├── context/          # Global state management
│   │   └── ThemeContext.jsx
│   ├── pages/            # Route components
│   │   ├── Dashboard.jsx
│   │   ├── Analytics.jsx
│   │   └── Exercises.jsx
│   ├── App.jsx           # Main app component with routing
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── .env                  # Environment variables (not committed)
├── .env.example          # Template for environment variables
└── package.json
```

## 🔌 Backend API Requirements

The frontend expects the following Flask endpoints:

### 1. Log Workout
```
POST /webhook/log_workout
Content-Type: application/json

Body: { "text": "Deadlift 3x5 @ 315lbs" }
```

### 2. Get All Workouts
```
GET /api/get_all_workouts
```

Expected response format:
```json
[
  {
    "id": 1,
    "date": "2024-02-02",
    "exercises": [
      {
        "name": "Deadlift",
        "sets": 3,
        "reps": 5,
        "weight": 315
      }
    ],
    "total_volume": 4725
  }
]
```

### 3. Get Exercise History
```
GET /api/get_exercise_history/<exercise_name>
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend Flask API running (see backend repository)

### Installation

1. **Clone and navigate to the project**
```bash
cd iron-track-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and set your backend URL:
```
VITE_API_BASE_URL=http://localhost:5000
```

4. **Start development server**
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

To preview the production build:
```bash
npm run preview
```

## 🎨 Features

### Dashboard
- ✅ Text-based workout logging with natural language support
- ✅ Real-time feedback on successful/failed submissions
- ✅ Recent activity feed showing last 5 workouts
- ✅ Responsive layout for mobile and desktop

### Dark Mode
- ✅ High-performance dark theme as default
- ✅ Theme toggle in navigation
- ✅ Persistent across sessions (via context)

### Component Library
All components are built with:
- Tailwind CSS for styling
- Lucide React for icons
- Full TypeScript support (coming soon)

## 🔧 Configuration

### API Base URL
The app uses `VITE_API_BASE_URL` environment variable for all API calls. This allows easy deployment:

**Development:**
```
VITE_API_BASE_URL=http://localhost:5000
```

**Production:**
```
VITE_API_BASE_URL=https://api.irontrack.com
```

### Customizing Theme
Edit `tailwind.config.js` to customize colors:
```js
colors: {
  dark: {
    bg: '#0f172a',      // Background
    surface: '#1e293b', // Cards/surfaces
    border: '#334155',  // Borders
    text: '#e2e8f0',    // Primary text
    muted: '#94a3b8'    // Secondary text
  },
  primary: {
    DEFAULT: '#3b82f6', // Primary blue
    dark: '#2563eb'     // Darker blue for hover
  }
}
```

## 📋 Next Steps

The following features are planned for upcoming iterations:

1. **Analytics Page**
   - Line charts with Recharts showing weight progression
   - Volume tracking over time
   - Personal records (PR) highlights

2. **Exercise Detail View**
   - Complete history for individual exercises
   - Set-by-set breakdown
   - Progressive overload tracking

3. **Voice Input**
   - Web Speech API integration for hands-free logging
   - Voice-to-text workout entry

4. **Advanced Features**
   - Workout templates
   - Export data to CSV
   - Social sharing of PRs

## 🤝 Contributing

This is a learning project following best practices:
- ESLint for code quality
- Prettier for formatting (coming soon)
- Component-driven development
- Separation of concerns

## 📝 License

MIT

## 🔗 Related Repositories

- Backend API: [iron-track-backend](link-to-backend-repo)
