'use strict'

const path = require('path')

const BASE = path.resolve(__dirname, '../../fix-project')

function getPaths(projectName, repoName, branch) {
  const slug = `${repoName}-${branch}`
  const root = path.join(BASE, projectName, slug)

  const datetime = new Date().toISOString().replace(/[:.]/g, '-')

  return {
    root,

    // SINGLE WORKING FOLDER
    workDir: path.join(root, 'generatedRepos'),

    tempDir: path.join(root, 'temp'),

    logsDir: path.join(root, 'logs'),
    logFile: path.join(root, 'logs', `${projectName}-${datetime}.txt`),
  }
}

module.exports = { getPaths }