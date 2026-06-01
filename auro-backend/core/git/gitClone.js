'use strict'

const fs = require('fs')
const path = require('path')

const { execCommand } = require('../utils/execCommand')
const { getAuthenticatedUrl } = require('./gitAuth')

/**
 * cloneRepo({ repoUrl, branch, cloneDir, log })
 */
async function cloneRepo({
  repoUrl,
  branch,
  cloneDir,
  log
}) {
  log?.info(`📦 Cloning ${repoUrl} [${branch}] → ${cloneDir}`)

  // remove old dir
  if (fs.existsSync(cloneDir)) {
    log?.info('⚠️ Clone dir exists — removing first')

    fs.rmSync(cloneDir, {
      recursive: true,
      force: true
    })
  }

  // ensure parent exists
  fs.mkdirSync(path.dirname(cloneDir), {
    recursive: true
  })

  const authUrl = getAuthenticatedUrl(repoUrl)

  const result = await execCommand(
    `git clone --branch ${branch} --single-branch "${authUrl}" "${cloneDir}"`,
    {
      cwd: process.cwd(),
      log
    }
  )

  if (!result.success) {
    throw new Error(result.error || 'Clone failed')
  }

  log?.info('✅ Clone complete')
}

module.exports = { cloneRepo }