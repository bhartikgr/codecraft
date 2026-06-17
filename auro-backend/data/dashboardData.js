// server/data/dashboardData.js

const { getAllAppsLogs } = require('../services/awsService')
const { getAzureData } = require('../services/azureService')
const { getFixedApps } = require('../services/fixedAppService')

async function getDashboardData() {

  const aws = await getAllAppsLogs()


  const azure = await getAzureData()


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


  const apps = [

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

  const fixed = await getFixedApps()


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


  return {
    environments: [aws, azure, gcp, vps],

    apps,

    fixed,

    fixSteps,

    logs: aws.logs || [],

    errorLogs: aws.errorLogs || []
  }
}

module.exports = {
  getDashboardData
}
