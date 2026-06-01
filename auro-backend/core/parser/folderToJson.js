'use strict'

const fs   = require('fs')
const path = require('path')
const { IGNORE_DIRS, IGNORE_EXTENSIONS } = require('./ignoreRules')

/**
 * folderToJson(dir)
 * Converts a project folder into a nested JSON object.
 * { 'src': { 'index.js': 'file content...', 'utils': { ... } } }
 *
 * Same pattern as checkBuild's folderToJson util.
 */
function folderToJson (dir, base = dir) {
  const result = {}
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const nested = folderToJson(fullPath, base)
      if (Object.keys(nested).length > 0) result[entry.name] = nested
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (IGNORE_EXTENSIONS.has(ext)) continue

    try {
      result[entry.name] = fs.readFileSync(fullPath, 'utf8')
    } catch {
      // binary ya unreadable — skip
    }
  }

  return result
}

/**
 * jsonToFolder(json, targetDir)
 * Writes AI-returned nested JSON back to disk.
 */
function jsonToFolder (json, targetDir) {
  for (const [key, value] of Object.entries(json)) {
    const fullPath = path.join(targetDir, key)
    if (typeof value === 'string') {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, value, 'utf8')
    } else if (value && typeof value === 'object') {
      fs.mkdirSync(fullPath, { recursive: true })
      jsonToFolder(value, fullPath)
    }
  }
}

module.exports = { folderToJson, jsonToFolder }