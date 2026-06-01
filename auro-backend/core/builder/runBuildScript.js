'use strict'

const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const BUILD_SCRIPT_MAP = {
  'node js': 'nodejs-docker-image-build.sh',
  'node.js': 'nodejs-docker-image-build.sh',
  java: null,
  'c#': 'csharp-build-docker-image.sh',
  'dotnet': 'csharp-build-docker-image.sh',
  '.net': 'csharp-build-docker-image.sh',
  python: 'check_python_build.sh',
}

// Safe fallback versions per language if AI detection returns null
const VERSION_FALLBACK = {
  python: '3.13',
  'node js': '22',
  java: '21',
  'c#': '8.0',
}

const SCRIPTS_DIR = path.resolve(
  __dirname,
  '../../scripts/release/check-build'
)

const ENV = process.env.NODE_ENV || 'development'
const IS_WIN = process.platform === 'win32'
const BASH_PATH = IS_WIN
  ? 'C:/Program Files/Git/bin/bash.exe'
  : '/bin/bash'

function toBashPath(winPath) {
  return winPath
    .replace(/\\/g, '/')
    .replace(/^([A-Z]):/i, (_, d) => `/${d.toLowerCase()}`)
}

function log(devLog, step, msg) {
  devLog?.(`[${step}] ${msg}`)
}

function runBuildScript({
  projectPath,
  language,
  framework,
  version,        // ← now received from detectStackAndVersion
  projectName,
  devLog
}) {
  return new Promise((resolve) => {
    try {
      log(devLog, 'INIT', `ENV=${ENV} | OS=${process.platform}`)

      const langKey = language?.toLowerCase()
      const isSpring = framework?.toLowerCase()?.includes('spring')

      log(devLog, 'LANG', langKey)
      log(devLog, 'FRAMEWORK', framework)

      let scriptFile = BUILD_SCRIPT_MAP[langKey]

      if (langKey === 'java') {
        scriptFile = isSpring
          ? 'springboot-docker-build.sh'
          : 'java-docker-build.sh'
      }

      log(devLog, 'SCRIPT_SELECT', scriptFile)

      if (!scriptFile) {
        return resolve({ success: false, error: `Unsupported language: ${language}` })
      }

      const rawScriptPath = path.join(SCRIPTS_DIR, scriptFile)
      log(devLog, 'SCRIPT_PATH', rawScriptPath)

      if (!fs.existsSync(rawScriptPath)) {
        return resolve({ success: false, error: `Build script not found: ${rawScriptPath}` })
      }

      // ── VERSION RESOLUTION ──────────────────────────────────────────────────
      // Priority: 1) version from AI detection  2) safe fallback per language
      // Never extract from framework name — frameworks don't carry runtime versions.
      const resolvedVersion = version ?? VERSION_FALLBACK[langKey] ?? '3.13'
      log(devLog, 'VERSION', `${resolvedVersion} (${version ? 'from AI' : 'fallback'})`)

      const SPRING_GRADLE_VERSION =
        langKey === 'java' && parseInt(resolvedVersion, 10) >= 21
          ? '8.14.2'
          : '8.10.2'

      log(devLog, 'GRADLE', SPRING_GRADLE_VERSION)

      const scriptPath = toBashPath(rawScriptPath)
      const bashProjectPath = toBashPath(projectPath)

      const args = IS_WIN
        ? ['-c', `"${scriptPath}" "${bashProjectPath}" "${projectName}" "${resolvedVersion}"`]
        : [scriptPath, bashProjectPath, projectName, resolvedVersion]

      log(devLog, 'SPAWN', JSON.stringify({ bash: BASH_PATH, args, cwd: projectPath }))

      let buildOutput = ''

      const child = spawn(BASH_PATH, args, {
        cwd: projectPath,
        shell: false,
        windowsHide: true,
        env: { ...process.env, NODE_ENV: ENV }
      })

      log(devLog, 'PID', child.pid)

      const capture = (data, type = 'INFO') => {
        const text = data.toString()
        buildOutput += text
        text.split('\n').forEach(line => { if (line.trim()) log(devLog, type, line) })
      }

      child.stdout.on('data', (d) => capture(d, 'BUILD'))
      child.stderr.on('data', (d) => capture(d, 'ERROR'))

      child.on('close', (code) => {
        log(devLog, 'EXIT', `Code=${code}`)
        const success = code === 0
        if (!success) log(devLog, 'FULL_OUTPUT', buildOutput, 'ERROR')
        resolve({ success, error: success ? null : `Exit code ${code}\n\n${buildOutput}` })
      })

      child.on('error', (err) => {
        log(devLog, 'SPAWN_ERROR', err.message, 'ERROR')
        resolve({ success: false, error: err.message })
      })

    } catch (err) {
      log(devLog, 'FATAL', err.message, 'ERROR')
      resolve({ success: false, error: err.message })
    }
  })
}

module.exports = { runBuildScript }