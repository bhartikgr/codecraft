'use strict'

const { spawn, execSync } = require('child_process')
const fs = require('fs')
const os = require('os')

const isWindows = os.platform() === 'win32'

function findBash() {
  if (!isWindows) {
    return '/usr/bin/bash'
  }

  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
    process.env.PROGRAMFILES + '\\Git\\bin\\bash.exe',
    process.env.PROGRAMFILES + '\\Git\\usr\\bin\\bash.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Git\\bin\\bash.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Git\\usr\\bin\\bash.exe'
  ]

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p
  }

  try {
    const result = execSync('where bash', { encoding: 'utf8' })
    const lines = result.split('\n').map(l => l.trim()).filter(Boolean)

    for (const line of lines) {
      if (line.toLowerCase().includes('git') && fs.existsSync(line)) {
        return line
      }
    }
  } catch (_) {}

  return null
}

function toShortPath(longPath) {
  if (!isWindows) return longPath

  try {
    const result = execSync(
      `cmd /c for %I in ("${longPath}") do @echo %~sI`,
      { encoding: 'utf8' }
    )

    const short = result.trim()

    if (short && fs.existsSync(short)) {
      return short
    }
  } catch (_) {}

  return longPath
}

const BASH_PATH = isWindows
  ? toShortPath(findBash() || '')
  : '/usr/bin/bash'

if (!BASH_PATH || !fs.existsSync(BASH_PATH)) {
  throw new Error(`❌ Bash not found: ${BASH_PATH}`)
}

function execCommand(cmd, { cwd, log } = {}) {
  return new Promise((resolve) => {
    log?.info(`Using bash: ${BASH_PATH}`)
    log?.info(`$ ${cmd}`)

    let output = ''

    const child = spawn(
      BASH_PATH,
      ['-c', cmd],
      {
        cwd,
        shell: false,
        windowsHide: isWindows,
        env: process.env
      }
    )

    const handleData = (data, type) => {
      const text = data.toString()
      output += text

      text.split('\n').forEach((line) => {
        if (line.trim()) {
          log?.raw?.(`[${type}] ${line}`)
        }
      })
    }

    child.stdout.on('data', (d) => handleData(d, 'STDOUT'))
    child.stderr.on('data', (d) => handleData(d, 'STDERR'))

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        output
      })
    })

    child.on('error', (err) => {
      resolve({
        success: false,
        code: -1,
        error: err.message,
        output
      })
    })
  })
}

module.exports = { execCommand }