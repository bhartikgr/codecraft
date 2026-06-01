import api from './api'

export const getDashboard = async () => {
  const res = await api.get('/dashboard')
  return res.data
}

export const getApps = async () => {
  const res = await api.get('/dashboard/apps')
  return res.data
}

export const getEnvironments = async () => {
  const res = await api.get('/dashboard/environments')
  return res.data
}

export const getFixed = async () => {
  const res = await api.get('/dashboard/fixed')
  return res.data
}