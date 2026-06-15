'use strict'

const path = require('path')
const fs = require('fs')
const { execCommand } = require('../utils/execCommand')

async function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }
}

async function commitProjectRepository({
  repoPath,
  branchName,
  user,
  message,
  logger,
}) {
  await ensureFolderExists(repoPath)

  const log = {
    step: (msg) => {
      console.log(`🔷 ${msg}`)
      logger?.uiLog?.(`🔷 ${msg}`)
    },

    info: (msg) => {
      console.log(`ℹ️ ${msg}`)
      logger?.devLog?.(`ℹ️ ${msg}`)
    },

    error: (msg) => {
      console.error(`❌ ${msg}`)
      logger?.devLog?.(`❌ ${msg}`)
    },

    raw: (msg) => {
      console.log(msg)
      logger?.devLog?.(msg)
    },
  }

  log.step('Starting Commit Process')

  const scriptPath = path.join(
    process.cwd(),
    'scripts',
    'git_automation.sh'
  )

  const posixScriptPath = scriptPath.replace(/\\/g, '/')
  const posixRepoPath = repoPath.replace(/\\/g, '/')

  const gitCommand = `bash "${posixScriptPath}" "userprojects" "${branchName}" "${user}" "${posixRepoPath}" "${message.replace(/"/g, '\\"')}"`

  log.info(`Repository Path: ${repoPath}`)
  log.info(`Branch: ${branchName}`)
  log.info(`User: ${user}`)
  log.info(`Commit Message: ${message}`)
  log.info(`Command: ${gitCommand}`)

  const result = await execCommand(
    gitCommand,
    {
      cwd: repoPath,
      log,
    }
  )

  if (result.output) {
    log.raw(result.output)
  }

  if (!result.success) {
    log.error(result.error || 'Commit failed')

    throw new Error(
      result.error ||
      `Git script failed with code ${result.code}`
    )
  }

  if (
    result.output.includes('CONFLICT') ||
    result.output.includes('failed to push') ||
    result.output.includes('[rejected]')
  ) {
    throw new Error('Git push failed')
  }

  log.step('Commit Successful')

  return {
    command: gitCommand,
    stdout: result.output,
    stderr: '',
    message: 'Commit successful',
  }
}

module.exports = {
  commitProjectRepository,
}