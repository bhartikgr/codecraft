const express = require('express')

const router = express.Router()

const { getDashboardData } = require('../data/dashboardData')

router.get('/', async (req, res) => {
  try {
    const data = await getDashboardData()

    res.json(data)
  } catch (err) {
    console.log(err)

    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = router
