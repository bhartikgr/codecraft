'use strict'

const path = require('path')
const fs = require('fs')
const { execCommand } = require('../utils/execCommand')

/* =========================
   ENSURE FOLDER EXISTS
========================= */

async function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }
}

/* =========================
   COMMIT PROJECT REPOSITORY
========================= */

async function commitProjectRepository({ repoPath, branchName, user, message }) {

  await ensureFolderExists(repoPath)

  const log = {
    step: (msg) => console.log(`\n🔷 ${msg}`),
    info: (msg) => console.log(`ℹ️  ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    raw: (msg) => console.log(msg),
  }

  /* =========================
     BUILD SCRIPT PATH
  ========================= */

  const scriptPath = path.join(
    process.cwd(),
    'scripts',
    'git_automation.sh'
  )
  // Convert Windows backslashes → forward slashes for bash
  const posixScriptPath = scriptPath.replace(/\\/g, '/')

  // Convert repoPath too so bash doesn't choke on backslashes
  const posixRepoPath = repoPath.replace(/\\/g, '/')

  /* =========================
     BUILD GIT COMMAND
  ========================= */

  const gitCommand = `bash "${posixScriptPath}" "userprojects" "${branchName}" "${user}" "${posixRepoPath}" "${message}"`

  log.info(`Running: ${gitCommand}`)

  /* =========================
     EXECUTE
  ========================= */

  const result = await execCommand(gitCommand, { cwd: repoPath, log })

  /* =========================
     RESOLVE / REJECT
  ========================= */

  const response = {
    command: gitCommand,
    stdout: result.output,
    stderr: '',
  }

  if (!result.success) {
    response.message = result.error || `Script failed (code ${result.code})`
    throw response
  }

  response.message = 'Commit successful'
  return response
}

module.exports = { commitProjectRepository }