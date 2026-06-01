'use strict'

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const dashboardRoutes = require('./routes/dashboardRoutes')
const fixFlowRoutes = require('./routes/fixFlowRoutes')
const logRoutes = require('./routes/logRoutes')

const app = express()

app.use(helmet())

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://auro.ai2dev.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key'
  ],
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests'
  }
})

app.use(limiter)

app.use(express.json({ limit: '10mb' }))

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key']

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden'
    })
  }

  next()
})

app.use('/api/dashboard', dashboardRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/fixflow', fixFlowRoutes)

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Running 🚀'
  })
})

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})

server.setTimeout(10 * 60 * 1000)

module.exports = app