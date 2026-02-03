# 🚀 Quick Start Guide - Iron Track Frontend

## Setup in 3 Steps

### 1️⃣ Install Dependencies
```bash
cd iron-track-frontend
npm install
```

### 2️⃣ Configure Backend URL & API Key
Edit `.env` file:
```
VITE_API_BASE_URL=http://localhost:5000
VITE_API_KEY=your-backend-api-key
```

### 3️⃣ Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 📁 What's Included

✅ **Dashboard Page** - Workout logging interface with recent activity feed
✅ **Dark Theme** - High-performance dark mode as default
✅ **API Integration** - Centralized axios configuration for Flask backend
✅ **Modular Components** - Reusable Button, Card, TextArea, etc.
✅ **Responsive Design** - Mobile-friendly layouts
✅ **Navigation** - React Router setup with 3 pages

---

## 🔌 Backend Requirements

Your Flask API must provide:

1. **POST /webhook/log_workout** - Accepts `{ "text": "workout details" }`
2. **GET /api/get_all_workouts** - Returns array of workout objects
3. **GET /api/exercises/<name>** - Returns history for specific exercise

See `README.md` for detailed API contract.

---

## 📝 Logging a Workout

Use natural language in the text area:

```
Deadlift 3x5 @ 315lbs
Bench Press 5x5 @ 225lbs
Squats 3x8 @ 275lbs
```

Or shorthand:
```
Deadlift 3 sets of 5 reps at 315 pounds
```

---

## 🎨 Customization

**Change Theme Colors:** Edit `tailwind.config.js`
**Add New Components:** Create in `src/components/`
**Add New Pages:** Create in `src/pages/` and update router in `App.jsx`

---

## 📚 Next Steps

1. Start your Flask backend
2. Test the Dashboard by logging a workout
3. Verify the Recent Activity feed updates
4. Read `ARCHITECTURE.md` for detailed project overview
5. Build the Analytics page with Recharts integration

---

## 🆘 Troubleshooting

**API calls failing?**
- Check `.env` has correct backend URL
- Verify Flask backend is running
- Check browser console for CORS errors

**Styles not loading?**
- Run `npm install` to ensure Tailwind is installed
- Restart dev server

**Port 3000 already in use?**
- Edit `vite.config.js` and change `server.port`

---

**Happy coding! 🏋️**
