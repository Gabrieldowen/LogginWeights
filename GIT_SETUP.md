# Git Setup Guide - Keeping Your Secrets Safe

## ✅ What Gets Committed to Git

These files are **SAFE** to commit (no secrets):
- ✅ `workout_server.py`
- ✅ `config.py`
- ✅ `requirements.txt`
- ✅ `Dockerfile`
- ✅ `.dockerignore`
- ✅ `.gitignore`
- ✅ `.env.template` (just a template, no real keys!)
- ✅ `supabase-setup.sql`
- ✅ `workout-tracker.html`
- ✅ `README.md`
- ✅ All documentation files

## ❌ What NEVER Gets Committed

These files contain **SECRETS** (blocked by `.gitignore`):
- ❌ `.env` - Your actual API keys and secrets
- ❌ `__pycache__/` - Python cache
- ❌ `venv/` - Python virtual environment

---

## 🚀 First Time Git Setup

### 1. Initialize Git Repository

```bash
# Navigate to your project folder
cd ~/irontrack

# Initialize git
git init

# Add all safe files
git add .

# Check what will be committed (should NOT include .env!)
git status
```

**Verify**: `.env` should **NOT** appear in the list!

### 2. Make First Commit

```bash
# Commit all files
git commit -m "Initial commit: Iron Track workout logger"
```

### 3. Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `iron-track` (or whatever you want)
3. **DO NOT** initialize with README (we already have one)
4. Click "Create repository"

### 4. Push to GitHub

GitHub will show you commands like:

```bash
git remote add origin https://github.com/YOUR_USERNAME/iron-track.git
git branch -M main
git push -u origin main
```

Copy and run those commands.

---

## 🔒 Double-Check Security

Before pushing, verify `.env` is NOT being tracked:

```bash
# This should show .env is ignored
git status

# This should return nothing (means .env is not tracked)
git ls-files | grep .env

# This should show .env in ignored files
git check-ignore .env
```

**If `.env` appears**: 
```bash
# Remove it from git (keeps local file)
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from git tracking"
```

---

## 📝 Workflow for Updates

### Adding New Files

```bash
# After creating new files
git add .
git commit -m "Add new feature"
git push
```

### Updating Existing Files

```bash
# After making changes
git add -u
git commit -m "Update server logic"
git push
```

### Adding New Config Variables

When you add new environment variables:

1. **Update `.env.template`**:
   ```bash
   # .env.template
   NEW_API_KEY=your-new-api-key-here
   ```

2. **Update your local `.env`**:
   ```bash
   # .env (not committed!)
   NEW_API_KEY=actual-secret-key-abc123
   ```

3. **Update `config.py`**:
   ```python
   NEW_API_KEY = os.getenv('NEW_API_KEY')
   ```

4. **Commit the template and config**:
   ```bash
   git add .env.template config.py
   git commit -m "Add new API key configuration"
   git push
   ```

**Note**: Your actual `.env` with real keys **never** gets committed!

---

## 👥 Sharing with Others / New Computer Setup

When someone clones your repo (or you set up on a new computer):

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/iron-track.git
cd iron-track

# Copy template to .env
cp .env.template .env

# Edit .env and add YOUR OWN keys
nano .env  # or use any text editor

# Now run normally
docker build -t irontrack .
docker run -d --name irontrack -p 5678:5678 --env-file .env --restart unless-stopped irontrack
```

---

## 🆘 "Oh No, I Accidentally Committed .env!"

If you accidentally commit `.env` with secrets:

### Step 1: Remove from Git History

```bash
# Remove .env from current commit
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from repository"

# Force push (if already pushed to GitHub)
git push --force
```

### Step 2: Rotate Your Secrets

**IMPORTANT**: Assume your secrets are compromised!

1. **Supabase**: Reset your project API keys
2. **Gemini**: Delete and create new API key
3. **API_KEY**: Change to a new random value
4. Update your local `.env` with new keys

### Step 3: Prevent Future Accidents

The `.gitignore` file already protects you, but you can add extra protection:

```bash
# Make .env read-only
chmod 400 .env

# Or use git-secrets to scan for secrets
git secrets --install
git secrets --register-aws
```

---

## 📋 Pre-Push Checklist

Before every `git push`:

- [ ] Check `git status` - is `.env` listed? (It shouldn't be!)
- [ ] Did you update `.env.template` if you added new config?
- [ ] Did you update `README.md` if you added new features?
- [ ] Does `docker build` succeed?
- [ ] Did you test the changes?

---

## 🔍 Useful Git Commands

### Check what's being tracked
```bash
git ls-files
```

### Check what's being ignored
```bash
git status --ignored
```

### See what would be committed
```bash
git diff --cached
```

### See git history
```bash
git log --oneline
```

### Undo last commit (keep changes)
```bash
git reset HEAD~1
```

---

## 🎓 Git Best Practices for This Project

1. **Never commit `.env`** - `.gitignore` protects you
2. **Always update `.env.template`** when adding new config
3. **Use descriptive commit messages**
4. **Test before committing** - run `docker build` and test
5. **Small, focused commits** - one feature per commit
6. **Document changes** - update README when needed

---

## 📖 Example Workflow

```bash
# Day 1: Start project
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/iron-track.git
git push -u origin main

# Day 2: Add Strava integration
# ... make changes ...
git add workout_server.py config.py .env.template
git commit -m "Add Strava integration"
git push

# Day 3: Fix bug
# ... make changes ...
git add workout_server.py
git commit -m "Fix Gemini parsing for exercises without weights"
git push

# Day 4: Update README
git add README.md
git commit -m "Add troubleshooting section to README"
git push
```

---

## ✅ You're Protected!

With this setup:
- ✅ `.gitignore` blocks `.env` from being committed
- ✅ `.env.template` shows what config is needed (safe to share)
- ✅ `config.py` loads from environment variables
- ✅ `README.md` documents setup for others
- ✅ Others can clone and add their own `.env`

**Your secrets stay secret! 🔒**
