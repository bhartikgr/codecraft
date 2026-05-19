// src/services/dashboardService.js

import axios from 'axios'

const API = 'http://localhost:5000/api/dashboard'

export const getDashboard = async () => {
  const res = await axios.get(API)
  return res.data
}

export const getApps = async () => {
  const res = await axios.get(`${API}/apps`)
  return res.data
}

export const getEnvironments = async () => {
  const res = await axios.get(`${API}/environments`)
  return res.data
}

export const getFixed = async () => {
  const res = await axios.get(`${API}/fixed`)
  return res.data
}

export const getFixSteps = async () => {
  const res = await axios.get(`${API}/fix-steps`)
  return res.data
}
