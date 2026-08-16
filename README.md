# 💰 Couple Expense Tracker

A smart, real-time expense tracker built for two people sharing finances. Track spending, set goals, get AI-powered insights, and import bank statements automatically.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/saileemparsewar-png/expense-tracker)

---

## Features

- **Real-time sync** — both phones update instantly
- **Auto-categorization** — just type a description, category fills itself
- **Goals & budgets** — set limits per category, get nudged when close
- **AI chatbot** — ask questions about your spending in plain English
- **PDF import** — upload bank statement, transactions auto-extracted
- **Weekly recap** — honest plain-English summary every week
- **Pattern detection** — spots habits, impulse buys, recurring merchants
- **Balance tracker** — see who's paid more this month
- **6-month trend** — spending history with month-over-month comparison
- **PIN protected** — simple 4-digit lock screen

---

## Deploy your own copy (free)

### What you need
- A [GitHub](https://github.com) account
- A [Render](https://render.com) account (free)
- A [Turso](https://turso.tech) account (free database)
- A [Groq](https://console.groq.com) API key (free)

### Step 1 — Fork this repo
Click **Fork** at the top right of this GitHub page. This creates your own copy.

### Step 2 — Create a Turso database
1. Go to [turso.tech](https://turso.tech) → sign in with GitHub
2. Click **Create Database** → name it `expenses` → region: closest to you
3. Click on the database → **Generate Token** → copy it
4. Also copy the **Database URL** (looks like `libsql://expenses-xxx.turso.io`)

### Step 3 — Get a Groq API key
1. Go to [console.groq.com](https://console.groq.com) → sign up
2. Click **API Keys** → **Create API Key** → copy it

### Step 4 — Deploy to Render
1. Click the **Deploy to Render** button above
2. Connect your forked GitHub repo
3. Set these environment variables:

| Key | Value |
|-----|-------|
| `TURSO_DB_URL` | your Turso database URL |
| `TURSO_AUTH_TOKEN` | your Turso auth token |
| `GROQ_API_KEY` | your Groq API key |

4. Click **Deploy** — takes ~3 minutes

### Step 5 — Customize for your names
After deploying, edit these two files in your forked repo:

**Change the names** in `client/src/components/UserSelect.js`:
```jsx
// Change 'Sailee' and 'Ajinkya' to your names
<span className="user-card-name">Your Name</span>
<span className="user-card-name">Partner Name</span>
```

**Change the PIN** in `client/.env`:
```
REACT_APP_PIN=1234
```

Then rebuild:
```bash
cd client && npm install && npm run build
cd ..
git add . && git commit -m "Customize names and PIN" && git push
```

Render auto-redeploys on every push.

### Step 6 — Keep it awake (optional but recommended)
Render's free tier sleeps after 15 mins of inactivity. Use [UptimeRobot](https://uptimerobot.com) (free) to ping it every 5 minutes:
1. Sign up → **Add Monitor** → HTTP(s)
2. URL: your Render app URL
3. Interval: 5 minutes

---

## Running locally

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Add environment variables
# Create server/.env with:
# TURSO_DB_URL=your_url
# TURSO_AUTH_TOKEN=your_token
# GROQ_API_KEY=your_key

# Build frontend
cd client && npm run build

# Start server
cd ../server && node index.js
```

Open `http://localhost:3001`

---

## Tech stack

- **Backend**: Node.js + Express + Socket.io
- **Database**: Turso (libSQL / SQLite, hosted)
- **Frontend**: React
- **AI**: Groq (Llama 3.3)
- **Charts**: Recharts
- **Hosting**: Render (free tier)

---

Built with ❤️ by Sailee & Ajinkya
