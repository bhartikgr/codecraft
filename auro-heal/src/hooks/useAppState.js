// src/hooks/useAppState.js

import { useEffect, useMemo, useState } from 'react'

import { getDashboard } from '../services/dashboardService'

export function useAppState () {
  const [errorApps, setErrorApps] = useState([])
  const [fixedItems, setFixedItems] = useState([])
  const [environments, setEnvironments] = useState([])
  const [fixSteps, setFixSteps] = useState([])

  const [dismissed, setDismissed] = useState([])
  const [modalApp, setModalApp] = useState(null)

  const [loading, setLoading] = useState(true)

  // FETCH DATA
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await getDashboard()

        const envs = data.environments || []


        const allApps = envs.flatMap(env => env.apps || [])

        setErrorApps(allApps)

        setFixedItems(data.fixed || [])

        setEnvironments(envs)

        setFixSteps(data.fixSteps || [])
      } catch (err) {
        console.log(err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()

    // AUTO REFRESH
  }, [])

  // ACTIVE ALERTS
  const activeAlerts = useMemo(() => {
    return errorApps
      .filter(app => !dismissed.includes(app.id) && app.occurrences > 0)
      .sort((a, b) => {
        // highest errors first
        if (b.occurrences !== a.occurrences) {
          return b.occurrences - a.occurrences
        }

        // then severity
        // eslint-disable-next-line no-undef
        return SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
      })
  }, [errorApps, dismissed])

  // FIX ITEM
  const handleFixed = rec => {
    setErrorApps(xs => xs.filter(a => a.name !== rec.app))

    setFixedItems(xs => [
      {
        ...rec,
        id: 'fix-' + Date.now()
      },
      ...xs
    ])

    setModalApp(null)
  }

  // RE-FIX
  const handleRefix = item => {
    setModalApp({
      id: 'refix-' + item.id,
      name: item.app,
      env: item.env,
      lang: '—',
      severity: 'medium',
      occurrences: 1,
      lastSeen: 'now',
      errorType: item.errorType,
      repo: item.repo,
      branch: item.branch
    })
  }

  // DISMISS
  const handleDismiss = id => {
    setDismissed(xs => [...xs, id])
  }

  // RESET
  const reset = () => {
    setDismissed([])
  }

  // ENV DATA
  const envData = useMemo(() => {
    return environments.map(env => ({
      ...env,
      errors: errorApps.filter(app => app.env === env.id).length
    }))
  }, [environments, errorApps])

  return {
    loading,

    errorApps,
    fixedItems,
    environments,
    fixSteps,

    dismissed,
    modalApp,

    activeAlerts,
    envData,

    setModalApp,

    handleFixed,
    handleRefix,
    handleDismiss,
    reset
  }
}
