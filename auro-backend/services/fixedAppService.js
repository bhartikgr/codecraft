// server/services/fixedAppService.js
const db = require('../config/db')

async function getFixedApps() {
    const query = `
    SELECT
      id,
      app,
      env,
      git_repo,
      git_branch,
      summary,
      diff,
      \`commit\`,
      \`fixed-date\`
    FROM \`fixed-app\`
    ORDER BY \`fixed-date\` DESC
  `

    const rows = await new Promise((resolve, reject) => {
        db.query(query, (err, result) => {
            if (err) return reject(err)
            resolve(result)
        })
    })

    return rows.map(r => ({
        id: `fix-${r.id}`,
        app: r.app,
        env: r.env,
        errorType: 'Fixed',
        summary: r.summary,
        commit: r.commit,
        branch: r.git_branch || 'main',
        repo: r.git_repo || '',
        fixedAt: r['fixed-date']
            ? new Date(r['fixed-date']).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            : '—',
        duration: '—'
    }))
}

module.exports = {
    getFixedApps
}