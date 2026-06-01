'use strict'

const fs   = require('fs')
const path = require('path')

/**
 * createLogger(logFilePath)
 * Returns { uiLog, devLog } — same dual-channel pattern as checkBuild.js
 *
 * uiLog  → high-level milestones (jo frontend ko dikhani hain)
 * devLog → verbose internals (sirf file mein, console mein nahi)
 */
function createLogger (logFilePath) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true })

  const write = (channel, message, data) => {
    const ts   = new Date().toISOString()
    let line   = `[${ts}] [${channel}] ${message}`
    if (data !== undefined) {
      line += '\n' + (typeof data === 'string' ? data : JSON.stringify(data, null, 2))
    }
    line += '\n'
    fs.appendFileSync(logFilePath, line, 'utf8')
  }

  // uiLog is async-compatible (like checkBuild — callers await it)
  const uiLog  = async (msg, data) => write('UI',  msg, data)
  const devLog = async (msg, data) => write('DEV', msg, data)

  return { uiLog, devLog, logFilePath }
}

module.exports = { createLogger }