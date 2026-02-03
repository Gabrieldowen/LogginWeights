# Component Hierarchy - Iron Track Frontend

## Application Tree

```
App.jsx (Router + ThemeProvider)
│
├── Navigation.jsx (Global Header)
│   ├── Logo
│   ├── Nav Links (Home, Analytics, Exercises)
│   └── Theme Toggle Button
│
└── Routes
    │
    ├── Dashboard.jsx (/)
    │   ├── WorkoutLogger.jsx
    │   │   ├── Card.jsx
    │   │   ├── TextArea.jsx
    │   │   └── Button.jsx (Submit)
    │   │
    │   └── RecentActivity.jsx
    │       └── Card.jsx
    │           └── Workout Items (mapped)
    │
    ├── Analytics.jsx (/analytics)
    │   └── Card.jsx
    │       └── [Future: Recharts components]
    │
    └── Exercises.jsx (/exercises)
        └── Card.jsx
            └── [Future: Exercise detail components]
```

## Component Responsibilities

### Layout Components
- **App.jsx**: Router setup, theme provider wrapper
- **Navigation.jsx**: Site-wide navigation, theme toggle

### Page Components
- **Dashboard.jsx**: Orchestrates workout logging and activity display
- **Analytics.jsx**: Will contain Recharts visualizations
- **Exercises.jsx**: Will show per-exercise drill-down

### Reusable UI Components
- **Button.jsx**: Clickable actions with variants
- **Card.jsx**: Content containers with optional titles
- **TextArea.jsx**: Multi-line text input
- **WorkoutLogger.jsx**: Complex form component
- **RecentActivity.jsx**: List renderer for workouts

### Context Providers
- **ThemeContext**: Global dark/light mode state

## Data Flow Patterns

### Workout Logging Flow
```
User types in WorkoutLogger
    ↓
onSubmit handler
    ↓
workoutAPI.logWorkout(text)
    ↓
Backend POST /webhook/log-workout
    ↓
onWorkoutLogged() callback
    ↓
Dashboard.fetchWorkouts()
    ↓
RecentActivity receives new data via props
```

### Theme Toggle Flow
```
User clicks theme toggle in Navigation
    ↓
ThemeContext.toggleTheme()
    ↓
Context state updates
    ↓
All components re-render with new theme
    ↓
<html> class="dark" added/removed
```

## Props Interface

### WorkoutLogger
```javascript
<WorkoutLogger 
  onWorkoutLogged={() => void}  // Callback after successful log
/>
```

### RecentActivity
```javascript
<RecentActivity
  workouts={Array}    // Array of workout objects
  loading={Boolean}   // Loading state
/>
```

### Button
```javascript
<Button
  variant="primary|secondary|danger"
  onClick={() => void}
  disabled={Boolean}
  type="button|submit"
  icon={LucideIcon}
>
  Button Text
</Button>
```

### Card
```javascript
<Card
  title="Optional Title"
  subtitle="Optional Subtitle"
  className="additional-classes"
>
  Card Content
</Card>
```

### TextArea
```javascript
<TextArea
  value={String}
  onChange={(e) => void}
  placeholder="Hint text"
  rows={Number}
  disabled={Boolean}
/>
```

## State Management Strategy

### Local Component State (useState)
- WorkoutLogger: `workoutText`, `loading`, `status`
- Dashboard: `workouts`, `loading`

### Context (React Context)
- ThemeContext: `isDark`, `toggleTheme()`

### Server State (API Calls)
- Managed via async/await in components
- No global state library needed yet
- Future: Consider React Query for caching

## Styling Approach

All components use:
- **Tailwind utility classes** for styling
- **Custom theme colors** from `tailwind.config.js`
- **Responsive modifiers** (sm:, md:, lg:)
- **State modifiers** (hover:, focus:, disabled:)

Example:
```jsx
className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-primary"
```

## Icon Usage

All icons from Lucide React:
```javascript
import { Dumbbell, Calendar, Send } from 'lucide-react';

<Dumbbell size={24} className="text-primary" />
```

Common icons:
- Dumbbell: Logo, exercise references
- Calendar: Dates
- Send: Submit actions
- Loader2: Loading states
- CheckCircle2: Success
- AlertCircle: Errors
- BarChart3: Analytics
- TrendingUp: Progress indicators

---

**Component Count:** 10 components + 3 pages + 1 context provider
**Total Files:** 25+ (including config and API layers)
**Complexity:** Low-Medium (suitable for scaling)
