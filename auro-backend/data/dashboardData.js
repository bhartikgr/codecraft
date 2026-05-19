// server/data/dashboardData.js

const { getAllAppsLogs } = require('../services/awsService')

async function getDashboardData () {
  // =========================================
  // REAL AWS DATA
  // =========================================

  const aws = await getAllAppsLogs()

  // =========================================
  // MOCK AZURE
  // =========================================

  const azure = {
    id: 'azure',

    name: 'Azure',

    kind: 'Public cloud',

    region: 'eastus, westeurope',

    instances: 31,

    errors: 3,

    health: 91,

    status: 'healthy',

    logs: [],

    errorLogs: []
  }

  // =========================================
  // MOCK GCP
  // =========================================

  const gcp = {
    id: 'gcp',

    name: 'GCP',

    kind: 'Public cloud',

    region: 'us-central1',

    instances: 18,

    errors: 5,

    health: 84,

    status: 'degraded',

    logs: [],

    errorLogs: []
  }

  // =========================================
  // MOCK VPS
  // =========================================

  const vps = {
    id: 'vps',

    name: 'VPS',

    kind: 'Self-hosted',

    region: 'Hetzner · DO · Linode',

    instances: 12,

    errors: 2,

    health: 95,

    status: 'healthy',

    logs: [],

    errorLogs: []
  }

  // =========================================
  // DYNAMIC APPS
  // =========================================

  const apps = [
    // ============================
    // REAL AWS APP
    // ============================

    {
      id: 'app-01',

      name: 'checkout-service',

      env: 'aws',

      lang: 'Node.js 20',

      severity:
        aws.errors > 10 ? 'critical' : aws.errors > 5 ? 'high' : 'medium',

      occurrences: aws.errors,

      lastSeen: '2 min ago',

      errorType: aws.latestError?.type || 'None',

      error: aws.latestError?.message || 'No errors found',

      logExcerpt: aws.logs?.slice(0, 5)?.map(log => log.message) || [],

      repo: 'github.com/auro/checkout-service',

      branch: 'main'
    },

    // ============================
    // MOCK APPS
    // ============================

    {
      id: 'app-02',

      name: 'warehouse-sync',

      env: 'azure',

      lang: 'Python 3.12',

      severity: 'high',

      occurrences: 24,

      lastSeen: '26 min ago',

      errorType: 'DataIntegrityError',

      error: 'duplicate key violates constraint',

      logExcerpt: ['sync batch started', 'ERROR duplicate sku'],

      repo: 'github.com/auro/warehouse-sync',

      branch: 'release/2.4'
    },

    {
      id: 'app-03',

      name: 'notifications-fanout',

      env: 'gcp',

      lang: 'Rust 1.78',

      severity: 'medium',

      occurrences: 15,

      lastSeen: '44 min ago',

      errorType: 'ChannelClosed',

      error: 'send on closed channel',

      logExcerpt: ['pubsub backpressure', 'worker restart'],

      repo: 'github.com/auro/notifications-fanout',

      branch: 'main'
    }
  ]

  // =========================================
  // FIXED
  // =========================================

  const fixed = [
    {
      id: 'fix-01',

      app: 'billing-cron',

      env: 'aws',

      errorType: 'MemoryLeak',

      summary: 'Patched dangling event listener',

      filesChanged: 3,

      additions: 41,

      deletions: 18,

      commit: 'a4f8c91',

      branch: 'main',

      repo: 'github.com/auro/billing-cron',

      fixedAt: 'Today · 07:42',

      duration: '1m 38s'
    }
  ]

  // =========================================
  // FIX STEPS
  // =========================================

  const fixSteps = [
    {
      phase: 'clone',

      label: 'Cloning repository',

      detail: 'git clone --depth=20'
    },

    {
      phase: 'ingest',

      label: 'Reading logs',

      detail: 'Pulled CloudWatch logs'
    },

    {
      phase: 'analyze',

      label: 'Locating root cause',

      detail: 'Stack trace mapped'
    },

    {
      phase: 'patch',

      label: 'Generating fix',

      detail: 'AI generated patch'
    }
  ]

  // =========================================
  // FINAL RESPONSE
  // =========================================

  return {
    environments: [aws, azure, gcp, vps],

    apps,

    fixed,

    fixSteps,

    // GLOBAL LOGS
    logs: aws.logs || [],

    // GLOBAL ERRORS
    errorLogs: aws.errorLogs || []
  }
}

module.exports = {
  getDashboardData
}
