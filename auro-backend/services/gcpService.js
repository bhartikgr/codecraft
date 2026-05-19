const compute = require('@google-cloud/compute')

const instancesClient =
  new compute.InstancesClient()

async function getGCPData () {
  try {
    const [response] =
      await instancesClient.list({
        project: process.env.GCP_PROJECT_ID,
        zone: 'us-central1-a'
      })

    const running =
      response.filter(
        i => i.status === 'RUNNING'
      ).length

    return {
      id: 'gcp',
      name: 'GCP',
      kind: 'Public cloud',
      region: 'us-central1',
      instances: response.length,
      active: running,
      errors: 0,
      health: response.length ? 94 : 0,
      status: 'healthy'
    }
  } catch (err) {
    console.error(
      'GCP ERROR:',
      err.message
    )

    return {
      id: 'gcp',
      name: 'GCP',
      kind: 'Public cloud',
      region: 'us-central1',
      instances: 0,
      errors: 1,
      health: 0,
      status: 'down'
    }
  }
}

module.exports = {
  getGCPData
}