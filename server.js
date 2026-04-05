// PEP Bridge Server
// Receives data from Chrome Extension and broadcasts to dashboard via WebSocket

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

let latestSnapshot = null;

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('[WS] Client connected. Total:', wss.clients.size);
  
  // Send latest data immediately on connect
  if (latestSnapshot) {
    ws.send(JSON.stringify({ type: 'PEP_SNAPSHOT', data: latestSnapshot }));
  }

  ws.on('close', () => {
    console.log('[WS] Client disconnected. Total:', wss.clients.size);
  });
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function computeDelta(prev, curr) {
  if (!prev || !curr) return { hasChanges: false };
  const changes = {};
  
  // Dashboard changes
  const fields = ['in_house','available','occupancy_pct','dirty','arrivals_expected','departures_expected'];
  if (prev.dashboard && curr.dashboard) {
    fields.forEach(f => {
      if (prev.dashboard[f] !== curr.dashboard[f]) {
        changes[f] = { from: prev.dashboard[f], to: curr.dashboard[f] };
      }
    });
  }

  // New check-ins
  const prevIds = new Set((prev.arrivals || []).map(r => r.id));
  const newCheckins = (curr.arrivals || []).filter(r => 
    r.status === 'CHECKED_IN' && 
    (!prevIds.has(r.id) || (prev.arrivals||[]).find(p=>p.id===r.id)?.status !== 'CHECKED_IN')
  );
  if (newCheckins.length) changes.new_checkins = newCheckins;

  return { hasChanges: Object.keys(changes).length > 0, changes };
}

// Webhook receiver from Chrome Extension
app.post('/api/pep-sync', (req, res) => {
  const payload = req.body;
  
  if (!payload?.meta?.property?.id) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const delta = computeDelta(latestSnapshot, payload);
  latestSnapshot = payload;

  // Broadcast to all connected dashboards
  broadcast('PEP_SNAPSHOT', payload);
  if (delta.hasChanges) {
    broadcast('PEP_DELTA', delta);
  }

  console.log('[PEP] Synced:', payload.meta.property.name, '| In-house:', payload.dashboard?.in_house, '| Occ:', payload.dashboard?.occupancy_pct + '%');
  res.json({ ok: true, ts: new Date().toISOString(), ws_clients: wss.clients.size });
});

// REST API endpoints
app.get('/api/pep/snapshot', (req, res) => {
  res.json(latestSnapshot || { ok: false, message: 'No data - waiting for Chrome extension sync' });
});

app.get('/api/pep/dashboard', (req, res) => {
  res.json(latestSnapshot?.dashboard || {});
});

app.get('/api/pep/arrivals', (req, res) => {
  let data = latestSnapshot?.arrivals || [];
  if (req.query.status) {
    data = data.filter(r => r.status === req.query.status.toUpperCase());
  }
  res.json(data);
});

app.get('/api/pep/in-house', (req, res) => {
  res.json(latestSnapshot?.in_house || []);
});

app.get('/api/status', (req, res) => {
  res.json({
    running: true,
    has_data: !!latestSnapshot,
    last_sync: latestSnapshot?.meta?.fetched_at || null,
    ws_clients: wss.clients.size,
    property: latestSnapshot?.meta?.property?.name || null
  });
});

app.get('/', (req, res) => {
  res.json({ 
    name: 'PEP Bridge Server', 
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'POST /api/pep-sync',
      'GET /api/pep/snapshot',
      'GET /api/pep/dashboard',
      'GET /api/pep/arrivals',
      'GET /api/pep/in-house',
      'GET /api/status',
      'WebSocket: ws://localhost:3001'
    ]
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🏨 PEP Bridge Server running on port', PORT);
  console.log('   Dashboard WebSocket: ws://localhost:' + PORT);
  console.log('   Webhook endpoint:    POST http://localhost:' + PORT + '/api/pep-sync');
  console.log('   Status check:        GET  http://localhost:' + PORT + '/api/status');
  console.log('\nWaiting for Chrome extension to send data...\n');
});
