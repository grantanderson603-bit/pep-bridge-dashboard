# 🏨 PEP Bridge Dashboard

**Real-time hotel operations dashboard for Hilton PEP** — Built for Embassy Suites Lexington Green

## What This Does

PEP Bridge syncs live hotel data from Hilton's PEP system into a modern, real-time dashboard that works alongside (or even replaces) PEP for daily hotel operations.

### Features
- ✅ **Live metrics** — Occupancy, in-house count, available rooms, ADR, revenue (updates every 60 seconds)
- ✅ **Guest arrivals & in-house lists** — Full profiles with VIP/Digital badges, room assignments, confirmation numbers
- ✅ **WebSocket push** — No page refreshes needed, data streams in automatically
- ✅ **Dark mode UI** — Polished, Tailwind CSS + React interface
- ✅ **Chrome extension** — Auto-syncs PEP data whenever you're logged in (survives page navigation)
- ✅ **Multi-property ready** — Works with any Hilton PEP property (not just Embassy Suites)

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/grantanderson603-bit/pep-bridge-dashboard.git
cd pep-bridge-dashboard
npm install
```

### 2. Run Local Development

```bash
# Terminal 1: Start backend server (handles WebSocket + API)
node server.js

# Terminal 2: Start React dashboard
npm run dev
```

Open:
- Dashboard: http://localhost:5173
- Backend API: http://localhost:3001

### 3. Activate PEP Sync

**Option A: Bookmarklet** (Quick test)
1. Open PEP in Chrome
2. Run this bookmarklet (paste in console or save as bookmark):
```javascript
// See full bookmarklet code in /bookmarklet.txt
```

**Option B: Chrome Extension** (Permanent solution)
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `/chrome-extension` folder from this repo
4. Navigate to PEP — extension auto-activates

The bridge will start polling PEP every 60 seconds and push data to your dashboard via WebSocket.

---

## Deployment

### Deploy React Dashboard to Netlify

1. **Connect GitHub repo to Netlify:**
   - Go to https://app.netlify.com
   - "Add new site" → "Import from Git" → Select this repo
   - Build settings are already configured in `netlify.toml`

2. **Set environment variables** (optional):
   ```
   VITE_WS_URL=wss://your-backend.com
   ```

3. **Deploy** — Netlify will auto-build and deploy

### Deploy Backend to Railway/Render

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Render:**
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Deploy

---

## Architecture

```
PEP (Hilton)  →  Chrome Extension/Bookmarklet  →  Node.js Server  →  WebSocket  →  React Dashboard
                     (polls every 60s)            (stores + broadcasts)          (live UI)
```

### Data Flow
1. **Chrome extension** (or bookmarklet) runs on PEP tab
2. Every 60 seconds, polls PEP's internal Vue.js API:
   - `/v4/hotelbrand/properties/{id}/dashboard/fd` — Hotel metrics
   - `/v4/hotelbrand/properties/{id}/reservations?type=arrivals` — Arrivals
   - `/v4/hotelbrand/properties/{id}/reservations?type=in_house` — In-house guests
3. **Node.js backend** receives the data via POST webhook
4. Server broadcasts to all connected dashboard clients via **WebSocket**
5. **React dashboard** updates UI in real-time

---

## API Endpoints

Once the backend is running:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | — | Health check |
| `POST /api/pep-sync` | POST | Webhook receiver (used by Chrome extension) |
| `GET /api/pep/snapshot` | GET | Latest full PEP data snapshot |
| `GET /api/pep/dashboard` | GET | Hotel metrics only |
| `GET /api/pep/arrivals` | GET | Arrivals list |
| `GET /api/pep/in_house` | GET | In-house guests list |
| `ws://localhost:3001` | WebSocket | Real-time push |

---

## Chrome Extension Setup (Detailed)

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `/chrome-extension` folder from this repo
5. The extension icon should appear in your toolbar
6. Open PEP in Chrome — check console for `[PEP Bridge] Extension loaded`

**Configure extension:**
- Right-click extension icon → Options
- Set webhook URL (default: `http://localhost:3001/api/pep-sync`)
- Adjust poll interval (default: 60 seconds)

The extension auto-activates when you visit any `pep.*.hilton.com` page.

---

## Tech Stack

**Frontend:**
- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)
- WebSocket (real-time data)

**Backend:**
- Node.js + Express
- WebSocket (ws library)
- CORS enabled

**Bridge:**
- Chrome Extension (Manifest V3)
- Vanilla JavaScript (injected into PEP page)

---

## Roadmap

- [ ] Mobile-responsive dashboard
- [ ] Task/reminder notifications
- [ ] Multi-property support (switch between hotels)
- [ ] Historical data storage (SQLite/PostgreSQL)
- [ ] Slack/Teams integration for VIP arrival alerts
- [ ] Housekeeping module (room status tracking)
- [ ] Official Hilton API partnership (OAuth flow)

---

## Security & Compliance

⚠️ **Important:** This tool uses your existing PEP login session. It does NOT store passwords or auth tokens permanently. The bridge only works while you're logged into PEP.

- Tokens expire after ~24 hours (Hilton's policy)
- Data transmission is local (localhost) in dev mode
- For production, use HTTPS/WSS with proper authentication
- This is a proof-of-concept for internal hotel use — not for public/commercial deployment without Hilton partnership

---

## Troubleshooting

**Dashboard shows "Waiting for data"?**
- Make sure backend server (`node server.js`) is running
- Check that Chrome extension is active on PEP tab
- Open browser console on PEP tab → look for `[PEP Bridge]` logs

**Extension not working?**
- Verify you're on a `pep.*.hilton.com` URL
- Check you're logged into PEP (have `hk_token` in localStorage)
- Reload the PEP page after installing extension

**WebSocket connection failed?**
- Backend must be running on port 3001
- Check firewall/antivirus isn't blocking WebSocket
- Try `ws://localhost:3001` instead of `wss://`

---

## Credits

Built for **Embassy Suites by Hilton Lexington Green** (LEXLG)

Created to solve real hotel operations challenges — bridging legacy PEP system with modern real-time dashboards.

---

## License

MIT — Use freely, but not for commercial purposes without Hilton partnership.

---

**Questions?** Open an issue or reach out to the hotel tech team. 🏨
