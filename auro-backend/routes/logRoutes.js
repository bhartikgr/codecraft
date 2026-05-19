const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../data/dashboardData');

// Helper: infer log level from message text
function inferLevel(message) {
  const msg = message || '';
  if (msg.includes('ERROR') || msg.includes('FATAL') || msg.includes('TypeError') || msg.includes('ECONNREFUSED'))
    return 'ERROR';
  if (msg.includes('WARN') || msg.includes('slow') || msg.includes('backpressure'))
    return 'WARN';
  if (msg.includes('INFO') || msg.includes('started') || msg.includes('completed'))
    return 'INFO';
  return 'DEBUG';
}

// Extract app name from logGroupName (e.g., "/aws/lambda/my-app" -> "my-app")
function extractAppName(logGroupName) {
  return logGroupName.split('/').pop();
}

// Flatten all logs from all environments into a single array
async function getAllLogs() {
  const data = await getDashboardData();
  const allLogs = [];

  // 1. Process AWS logs (real data)
  const awsEnv = data.environments.find(e => e.id === 'aws');
  if (awsEnv && awsEnv.apps) {
    for (const app of awsEnv.apps) {
      if (app.logs && Array.isArray(app.logs)) {
        for (const log of app.logs) {
          allLogs.push({
            id: `${app.id}-${log.timestamp}-${Math.random()}`,
            ts: new Date(log.timestamp).toLocaleString('en-IN', { hour12: false }).replace(',', ''),
            env: 'aws',
            app: app.name,
            level: inferLevel(log.message),
            msg: log.message
          });
        }
      }
    }
  }

  // 2. Mock Azure logs (if any – you can add sample errors later)
  // 3. Mock GCP logs
  // 4. Mock VPS logs

  // Sort by timestamp descending (newest first)
  allLogs.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return allLogs;
}

// GET /api/logs/recent - returns last 200 logs (or all if less)
router.get('/recent', async (req, res) => {
  try {
    const logs = await getAllLogs();
    res.json({ logs: logs.slice(0, 200) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Keep original root for backward compatibility
router.get('/', async (req, res) => {
  const data = await getDashboardData();
  res.json({ logs: data.logs || [] });
});

module.exports = router;