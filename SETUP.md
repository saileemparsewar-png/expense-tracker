# Sailee & Ajinkya — Expense Tracker Setup Guide

## Step 1: Install Node.js (one-time)

1. Go to https://nodejs.org
2. Download the **LTS** version (the green button)
3. Run the installer — keep all defaults, click Next → Next → Install
4. After install, open a new PowerShell window and verify:
   ```
   node --version
   npm --version
   ```
   Both should print version numbers.

---

## Step 2: Install dependencies (one-time)

Open PowerShell, then run these commands one at a time:

```powershell
cd "C:\Users\ajink\OneDrive\Desktop\Sailee KIRO\expense-tracker\server"
npm install
```

```powershell
cd "C:\Users\ajink\OneDrive\Desktop\Sailee KIRO\expense-tracker\client"
npm install
```

This takes 2–5 minutes the first time.

---

## Step 3: Build the frontend (one-time, or after any UI changes)

```powershell
cd "C:\Users\ajink\OneDrive\Desktop\Sailee KIRO\expense-tracker\client"
npm run build
```

This creates an optimized production build inside `client/build/`.

---

## Step 4: Start the server

```powershell
cd "C:\Users\ajink\OneDrive\Desktop\Sailee KIRO\expense-tracker\server"
node index.js
```

You'll see:
```
✅ Expense Tracker server running on port 3001
   Local:   http://localhost:3001
   Network: http://<your-local-ip>:3001
```

**Or just double-click `start.bat`** in the expense-tracker folder — it does the same thing.

---

## Step 5: Open on your phones

1. Make sure your phone is on the **same WiFi network** as your laptop
2. Find your laptop's local IP address:
   - Open PowerShell and run: `ipconfig`
   - Look for **IPv4 Address** under your WiFi adapter (e.g., `192.168.1.5`)
3. On each phone, open the browser and go to:
   ```
   http://192.168.1.5:3001
   ```
   (replace with your actual IP)
4. Each person picks their name — Sailee or Ajinkya
5. Bookmark it or "Add to Home Screen" for app-like access

---

## Daily Use

- **Adding an entry**: Tap the **+** button (center of bottom bar)
- Required: just **amount** and **description** — everything else is auto-filled
- Category is auto-detected from your description as you type
- Both phones see each other's entries **instantly** (real-time sync)
- **Tap** a transaction to reveal edit/delete buttons

---

## Features

| Feature | Description |
|---|---|
| Real-time sync | Both phones update instantly via WebSockets |
| Auto-categorize | Just type "Zomato dinner" → Food & Dining (no manual selection needed) |
| Balance tracker | Shows who has paid more this month and by how much |
| Insights | Monthly comparison, spending spikes, savings rate alerts |
| Trend charts | 6-month spending trend per person + combined |
| Category breakdown | Pie chart + bar chart of where money goes |
| Income tracking | Select Income type, describe it freely |
| Edit / Delete | Tap a transaction → swipe actions appear |
| Search & filter | Filter by person, type, or search by description |

---

## Keeping the server running

The server must be running on your laptop for the phones to connect.
- It only runs while the PowerShell window (or start.bat) is open
- For convenience, you can pin `start.bat` to your taskbar

---

## Troubleshooting

**Phone can't connect?**
- Check that phone and laptop are on the same WiFi
- Try turning off Windows Firewall temporarily, or allow Node.js through it
- Re-check your IP with `ipconfig` — it can change when you reconnect to WiFi

**Page shows "API running" message instead of the app?**
- You need to build the client first: run `npm run build` inside the `client` folder

**Something looks broken after an update?**
- Rebuild the client: `npm run build` in the client folder, then restart the server
