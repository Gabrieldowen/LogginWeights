# Iron Track - Workout Logging System

A self-hosted workout tracking application that uses AI to parse workout descriptions and store them in a database.

## 🎯 Features

- 📱 Log workouts via iPhone Shortcut (voice-to-text)
- 🤖 AI-powered parsing with Google Gemini
- 💾 PostgreSQL database via Supabase
- 🎨 React PWA frontend
- 📊 Track progress and PRs
- 🔒 Secure API key authentication

## 🏗️ Architecture

```
iPhone Shortcut → Python Flask Server → Gemini AI → Supabase → React Frontend
```

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd iron-track
```

### 2. Set Up Environment Variables

```bash
# Copy template to .env
cp .env.template .env

# Edit .env and fill in your values
# - SUPABASE_URL
# - SUPABASE_KEY
# - GEMINI_API_KEY
# - API_KEY
```

**⚠️ IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

### 3. Set Up Database

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run `supabase-setup.sql` in SQL Editor
4. Copy URL and anon key to `.env`

### 4. Get API Keys

**Gemini API**:
- Go to: https://aistudio.google.com/app/apikey
- Create API key
- Add to `.env`

### 5. Run with Docker (Recommended)

```bash
# Build image
docker build -t irontrack .

# Run container
docker run -d \
  --name irontrack \
  -p 5678:5678 \
  --env-file .env \
  --restart unless-stopped \
  irontrack
```

### 6. Or Run Locally (Development)

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python workout_server.py
```

### 7. Test

```bash
curl http://localhost:5678/health
```

## 📁 Project Structure

```
iron-track/
├── workout_server.py       # Main Flask server
├── config.py               # Configuration management
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── .dockerignore          # Docker ignore rules
├── .gitignore            # Git ignore rules (includes .env!)
├── .env.template         # Template for environment variables
├── .env                  # YOUR SECRETS (never commit!)
├── supabase-setup.sql    # Database schema
├── workout-tracker.html  # React PWA frontend
└── README.md            # This file
```

## 🔒 Security

- ✅ All secrets stored in `.env` (not committed to git)
- ✅ API key authentication for webhook
- ✅ `.gitignore` prevents accidental secret commits
- ✅ Environment variable validation on startup

## 📖 Documentation

- **DOCKER_SETUP.md** - Detailed Docker setup guide
- **SETUP_INSTRUCTIONS.md** - Alternative setup methods
- **config.py** - Configuration documentation

## 🛠️ Development

### Adding New Features

1. Fork/clone repository
2. Create `.env` from `.env.template`
3. Make changes
4. Test locally: `python workout_server.py`
5. Never commit `.env`!

### Updating Configuration

All configuration is in `config.py`. To add new config:

1. Add to `.env.template`
2. Add to `config.py`
3. Update validation in `Config.validate()`
4. Document in README

## 🐛 Troubleshooting

**"Missing required environment variables"**
→ Copy `.env.template` to `.env` and fill in values

**"Invalid API key" or "Missing API key in Authorization header"**
→ Make sure you're sending the API key in the Authorization header as a Bearer token

**"Cannot connect to database"**
→ Check `SUPABASE_URL` and `SUPABASE_KEY` in `.env`

See **DOCKER_SETUP.md** for more troubleshooting.

## 📝 API Usage

### Log a Workout

```bash
POST http://localhost:5678/webhook/log_workout
Authorization: Bearer your-api-key-from-env
Content-Type: application/json

{
  "text": "Did bench press 3 sets of 10 reps at 185 pounds"
}
```

**Note**: For backward compatibility, the API key can also be provided in the request body as `api_key` or as a query parameter, but using the Authorization header is recommended for security.

### Health Check

```bash
GET http://localhost:5678/health
```

## 🤝 Contributing

1. Never commit secrets or `.env` files
2. Update `.env.template` if adding new config
3. Test with Docker before submitting PR
4. Update documentation

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- Supabase for database hosting
- Google for Gemini AI
- Anthropic for Claude (used to build this!)
