# iPhone Shortcut Setup Guide - Iron Track

This guide will walk you through creating an iPhone Shortcut to log workouts to your Iron Track server.

## 📱 What This Shortcut Does

1. Prompts you to describe your workout (voice or text)
2. Sends the description to your Flask server
3. Server uses Gemini AI to parse the workout
4. Stores in your Supabase database
5. Shows success confirmation

---

## 🏠 Part 1: Local Network Setup (At Home)

### Step 1: Find Your Computer's Local IP Address

**On Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with `192.168.x.x` or `10.0.x.x`)

**On Mac:**
```bash
ifconfig | grep "inet "
```
Look for an address starting with `192.168.x.x` or `10.0.x.x`

**On Linux:**
```bash
ip addr show
```
Look for `inet` addresses

Example: `192.168.1.100`

### Step 2: Verify Server is Running

Test from your phone's browser (while on same WiFi):
```
http://YOUR_LOCAL_IP:5678/health
```

Example: `http://192.168.1.100:5678/health`

You should see:
```json
{
  "status": "healthy",
  "service": "Iron Track Workout Logger",
  "timestamp": "..."
}
```

### Step 3: Create the Shortcut

1. Open **Shortcuts** app on iPhone
2. Tap **+** (top right) to create new shortcut
3. Tap "Add Action"
4. Build the following workflow:

#### Action 1: Ask for Input
- Search for "Ask for Input"
- **Prompt**: "Describe your workout"
- **Input Type**: Text
- **Default Answer**: (leave empty)

#### Action 2: Get Contents of URL
- Search for "Get Contents of URL"
- Tap "URL" and enter:
  ```
  http://YOUR_LOCAL_IP:5678/webhook/log-workout
  ```
  Replace `YOUR_LOCAL_IP` with your actual IP (e.g., `192.168.1.100`)

- Tap "Show More" to expand options:
  - **Method**: POST
  - **Headers**: Add header
    - Key: `Content-Type`
    - Value: `application/json`
  - **Request Body**: JSON
  - Tap "JSON" and enter:
    ```json
    {
      "text": "Provided Input",
      "api_key": "YOUR_API_KEY"
    }
    ```
    - For "Provided Input": Tap it and select "Ask for Input" from the variables
    - Replace `YOUR_API_KEY` with the actual API_KEY from your `.env` file

#### Action 3: Show Result
- Search for "Show Result"
- Tap "Result" and select "Contents of URL"

### Step 4: Name and Test

1. Tap shortcut name (top) and rename to "Log Workout"
2. Tap "Done"
3. Run the shortcut to test!

---

## 🌍 Part 2: Remote Access (Away from Home)

When you're not on your home WiFi, you need a way to reach your home server. Here are three options:

### Option A: ngrok (Easiest, Temporary)

**Pros**: 
- Free tier available
- No router configuration needed
- Secure HTTPS tunnel
- Works anywhere

**Cons**:
- URL changes each time you restart ngrok
- Need to update shortcut with new URL
- Free tier has session limits

**Setup:**

1. **Install ngrok** (on your home computer):
   ```bash
   # Download from https://ngrok.com/download
   # Or use package manager:
   # Windows: choco install ngrok
   # Mac: brew install ngrok
   # Linux: snap install ngrok
   ```

2. **Create free account** at https://ngrok.com
3. **Authenticate**:
   ```bash
   ngrok config add-authtoken YOUR_NGROK_TOKEN
   ```

4. **Start tunnel** (while Docker container is running):
   ```bash
   ngrok http 5678
   ```

5. **Copy the HTTPS URL** shown (e.g., `https://abc123.ngrok-free.app`)

6. **Update your Shortcut**:
   - Change URL from `http://192.168.1.100:5678/webhook/log-workout`
   - To: `https://abc123.ngrok-free.app/webhook/log-workout`

**Usage Pattern**:
- At home: Use local IP (`http://192.168.1.100:5678/...`)
- Away: Start ngrok, update shortcut with new URL
- OR: Keep ngrok running 24/7 and always use ngrok URL

### Option B: Tailscale (Best for Security)

**Pros**:
- Free for personal use
- Permanent connection
- Very secure (WireGuard VPN)
- URL doesn't change
- Works from anywhere

**Cons**:
- Requires Tailscale app on iPhone
- Slightly more complex setup

**Setup:**

1. **Create account** at https://tailscale.com
2. **Install on your computer**:
   - Download from https://tailscale.com/download
   - Follow installation instructions
   - Log in with your account

3. **Install on iPhone**:
   - Download Tailscale app from App Store
   - Log in with same account
   - Connect to network

4. **Get your Tailscale IP**:
   - On computer: `tailscale ip -4`
   - Should be like `100.x.x.x`

5. **Update Shortcut**:
   - URL: `http://100.x.x.x:5678/webhook/log-workout`

**Usage Pattern**:
- Turn on Tailscale on iPhone when away from home
- Always use same Tailscale IP in shortcut
- Works from anywhere in the world

### Option C: Port Forwarding (Permanent, Less Secure)

**⚠️ WARNING**: Exposes your server to the internet. Only use with strong API_KEY!

**Pros**:
- Permanent URL
- No third-party service needed
- Free

**Cons**:
- Security risk if not configured properly
- Requires router access
- Need static IP or dynamic DNS
- Exposes your home IP address

**Setup:**

1. **Set Static Local IP** for your computer
   - In router settings, reserve DHCP lease for your computer's MAC address

2. **Configure Port Forwarding** in router:
   - External port: 5678 (or different for security)
   - Internal IP: Your computer's local IP
   - Internal port: 5678
   - Protocol: TCP

3. **Get Public IP**:
   - Visit https://whatismyipaddress.com
   - Note: Changes unless you pay ISP for static IP

4. **Update Shortcut**:
   - URL: `http://YOUR_PUBLIC_IP:5678/webhook/log-workout`

5. **Optional: Use Dynamic DNS**:
   - Services like NoIP, DuckDNS (free)
   - Gives you a domain name instead of IP
   - Updates automatically when your IP changes

**⚠️ SECURITY CHECKLIST**:
- [ ] Use a VERY strong random API_KEY (30+ characters)
- [ ] Consider changing external port to non-standard (e.g., 34567)
- [ ] Set up router firewall rules
- [ ] Monitor server logs for suspicious activity
- [ ] Consider adding rate limiting to server

---

## 🎯 Recommended Approach

**For beginners**: Start with **ngrok**
- Easy to set up
- Test the workflow
- Decide if you need permanent access

**For regular use**: Switch to **Tailscale**
- Most secure
- Permanent connection
- Best user experience

**For advanced users**: Consider **port forwarding with HTTPS**
- Set up reverse proxy (nginx)
- Get Let's Encrypt SSL certificate
- Most complex but most professional

---

## 📋 Complete Shortcut Configuration Reference

### Shortcut Actions Summary:

```
1. ASK FOR INPUT
   - Prompt: "Describe your workout"
   - Type: Text

2. GET CONTENTS OF URL
   - URL: http://YOUR_IP:5678/webhook/log-workout
   - Method: POST
   - Headers:
     - Content-Type: application/json
   - Request Body: JSON
     {
       "text": [Ask for Input],
       "api_key": "your-api-key-here"
     }

3. SHOW RESULT
   - Show: [Contents of URL]
```

### Variables to Replace:

| Variable | Where to Find |
|----------|---------------|
| `YOUR_IP` | Local IP: `ipconfig` or `ifconfig` |
| | ngrok: shown in ngrok terminal |
| | Tailscale: `tailscale ip -4` |
| | Port forward: whatismyipaddress.com |
| `your-api-key-here` | Your `.env` file, `API_KEY=` value |

---

## 🧪 Testing the Shortcut

### Test Input Examples:

**Simple workout**:
```
Did bench press 185 for 10 reps, 3 sets
```

**Complex workout**:
```
Bench press 3 sets: 185 for 10, 195 for 8, 205 for 6. Then squats 225 for 12 reps. Felt strong today. 65 minutes total.
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Workout logged successfully! 💪",
  "workout_id": 1,
  "workout_data": {
    "date": "2026-02-01",
    "exercises": [...]
  }
}
```

---

## 🔧 Troubleshooting

### "Could not connect to server"

**At home**:
- [ ] Is Docker container running? `docker ps`
- [ ] Is IP address correct? Test in browser
- [ ] Are you on same WiFi network?
- [ ] Is firewall blocking port 5678?

**Away from home**:
- [ ] Is ngrok running? (if using ngrok)
- [ ] Is Tailscale connected? (if using Tailscale)
- [ ] Did ngrok URL change? (update shortcut)
- [ ] Is port forwarding configured? (if using that)

### "Invalid API key"

- [ ] Check API_KEY in `.env` matches shortcut
- [ ] No extra spaces or quotes in shortcut
- [ ] Case sensitive - must match exactly

### "No workout text provided"

- [ ] Make sure "Ask for Input" variable is selected in JSON
- [ ] Not hard-coded "Provided Input" text

### Server logs show errors

```bash
# Check Docker logs
docker logs -f irontrack
```

Look for parsing errors or database connection issues

---

## 🎨 Optional: Customize Shortcut

### Add to Home Screen
1. Run shortcut once
2. Settings > Shortcuts > Log Workout
3. Tap (i) icon
4. "Add to Home Screen"
5. Choose custom icon

### Add Voice Trigger
1. Settings > Shortcuts > Log Workout
2. Tap (i) icon
3. "Add to Siri"
4. Record phrase: "Log my workout"

### Quick Access Widget
1. Long press home screen
2. Tap + (top left)
3. Search "Shortcuts"
4. Add "Log Workout" widget

---

## 📊 Network Comparison

| Feature | Local Only | ngrok | Tailscale | Port Forward |
|---------|-----------|-------|-----------|--------------|
| **Works at home** | ✅ | ✅ | ✅ | ✅ |
| **Works away** | ❌ | ✅ | ✅ | ✅ |
| **Setup difficulty** | Easy | Easy | Medium | Hard |
| **Security** | High | High | Very High | Low-Medium |
| **Cost** | Free | Free tier | Free | Free |
| **Permanent URL** | ❌ | ❌ | ✅ | ✅ |
| **No 3rd party** | ✅ | ❌ | ❌ | ✅ |

---

## 🚀 Next Steps After Shortcut Works

1. ✅ Log a few test workouts
2. ✅ Verify data appears in Supabase dashboard
3. ✅ Connect React frontend to database
4. ✅ View your workouts in the app!

See `FRONTEND_DATABASE_GUIDE.md` for connecting the frontend.

---

## 💡 Pro Tips

- **Create two shortcuts**: One for home (local IP), one for away (Tailscale/ngrok)
- **Use Siri**: "Hey Siri, log my workout" while walking out of gym
- **Batch logging**: Describe full workout in one go, Gemini will parse it all
- **Voice tips**: Speak clearly, use "times" or "reps" instead of "x"

Example voice input:
> "I did bench press, three sets of ten reps at 185 pounds, then squats, 225 pounds for 12 reps, felt really strong today, took about 65 minutes"

---

## 📖 Additional Resources

- **Shortcuts User Guide**: https://support.apple.com/guide/shortcuts/
- **ngrok Documentation**: https://ngrok.com/docs
- **Tailscale Guide**: https://tailscale.com/kb/
- **Port Forwarding Guide**: https://portforward.com

---

**Ready to start? Pick your access method and create the shortcut! 🎯**
