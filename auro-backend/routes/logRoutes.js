const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../data/dashboardData');

// =====================
// LOG LEVEL DETECTOR
// =====================
function inferLevel(message) {
  const msg = message || '';

  if (
    msg.includes('ERROR') ||
    msg.includes('FATAL') ||
    msg.includes('TypeError') ||
    msg.includes('ECONNREFUSED') 
  ) return 'ERROR';

  if (
    msg.includes('WARN') ||
    msg.includes('slow') ||
    msg.includes('backpressure')
  ) return 'WARN';

  if (
    msg.includes('INFO') ||
    msg.includes('started') ||
    msg.includes('completed')
  ) return 'INFO';

  return 'DEBUG';
}

// =====================
// AZURE LOG NORMALIZER
// =====================
function normalizeAzureLogs(environments) {
  const logs = [];

  const azureEnv = environments.find(e => e.id === 'azure');

  if (!azureEnv || !azureEnv.apps) return logs;

  for (const app of azureEnv.apps) {
    if (!Array.isArray(app.logs)) continue;
    
    for (const log of app.logs) {
      for (const log of app.logs) {
        logs.push({
          id: `${app.id}-${log.TimeGenerated || log.timestamp}-${Math.random()}`,
          ts: new Date(log.TimeGenerated || log.timestamp).toLocaleString('en-IN', {
            hour12: false
          }).replace(',', ''),

          env: app.env || 'azure', // 🔥 FIX THIS
          app: app.name,

          level: inferLevel(log.Message || log.message || log.msg),
          msg: log.Message || log.message || log.msg
        });
      }
    }
  }

  return logs;
}

// =====================
// AWS LOG NORMALIZER
// =====================
function normalizeAwsLogs(environments) {
  const logs = [];

  const awsEnv = environments.find(e => e.id === 'aws');

  if (!awsEnv || !awsEnv.apps) return logs;

  for (const app of awsEnv.apps) {
    if (!Array.isArray(app.logs)) continue;

    for (const log of app.logs) {
      logs.push({
        id: `${app.id}-${log.timestamp}-${Math.random()}`,
        ts: new Date(log.timestamp)
          .toLocaleString('en-IN', { hour12: false })
          .replace(',', ''),
        env: 'aws',
        app: app.name,
        level: inferLevel(log.message),
        msg: log.message
      });
    }
  }

  return logs;
}

// =====================
// MERGE ALL LOGS
// =====================
async function getAllLogs() {
  const data = await getDashboardData();

  const envs = data.environments || [];

  const awsLogs = normalizeAwsLogs(envs);
  const azureLogs = normalizeAzureLogs(envs);

  const allLogs = [...awsLogs, ...azureLogs];

  // sort newest first
  allLogs.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return allLogs;
}

// =====================
// API: RECENT LOGS
// =====================
router.get('/recent', async (req, res) => {
  try {
    const logs = await getAllLogs();
    res.json({ logs: logs.slice(0, 200) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// BACKWARD COMPATIBILITY
// =====================
router.get('/', async (req, res) => {
  const data = await getDashboardData();
  res.json({ logs: data.logs || [] });
});

module.exports = router;