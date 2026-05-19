const axios = require('axios')

async function getVPSData () {
  try {
    const response = await axios.get(
      'https://api.digitalocean.com/v2/droplets',
      {
        headers: {
          Authorization: `Bearer ${process.env.DO_TOKEN}`
        }
      }
    )

    const droplets = response.data.droplets || []

    const running = droplets.filter(
      d => d.status === 'active'
    ).length

    return {
      id: 'vps',
      name: 'VPS',
      kind: 'Self-hosted',
      region: 'DigitalOcean',
      instances: droplets.length,
      active: running,
      errors: 0,
      health: droplets.length ? 98 : 0,
      status: 'healthy'
    }
  } catch (err) {
    console.error('DO API ERROR:', err.response?.data || err.message)

    return {
      id: 'vps',
      name: 'VPS',
      kind: 'Self-hosted',
      region: 'DigitalOcean',
      instances: 0,
      errors: 1,
      health: 0,
      status: 'down'
    }
  }
}

module.exports = {
  getVPSData
}