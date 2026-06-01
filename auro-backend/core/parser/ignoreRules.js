'use strict'

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out',
  '.next', '.nuxt', 'coverage', '__pycache__',
  'target', 'bin', 'obj', '.gradle',
])

const IGNORE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.jar', '.war', '.class',
])

module.exports = { IGNORE_DIRS, IGNORE_EXTENSIONS }