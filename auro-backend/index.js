// server/index.js

const express = require('express')
const cors = require('cors')
require('dotenv').config();
const dashboardRoutes = require('./routes/dashboardRoutes')

const app = express()

app.use(cors())
app.use(express.json())

// ROUTES
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/logs', require('./routes/logRoutes'));

app.get('/', (req, res) => {
  res.send('API Running 🚀')
})

const PORT = 5000

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})
