'use strict'

const fsExtra = require('fs-extra')

const { cloneRepo } = require('./git/gitClone')
const { detectStackAndVersion } = require('./parser/detectStack')   // ← fixed
const { folderToJson, jsonToFolder } = require('./parser/folderToJson')
const { runBuildScript } = require('./builder/runBuildScript')
const { callAI } = require('./ai/callAI')
const { generateFixPrompt } = require('./ai/generateFixPrompt')
const { parseAIResponse } = require('./ai/parseAIResponse')
const { createLogger } = require('./logger/logger')
const { getPaths } = require('./utils/paths')

const MAX_ATTEMPTS = parseInt(process.env.AI_FIX_ATTEMPTS || '10', 10)

async function runFixPipeline({
  projectName,
  repoUrl,
  branch,
  commitMessage,
  errorLog,
  instructions,
  onStatus
}) {
  const repoName = repoUrl.split('/').pop().replace(/\.git$/, '')
  const paths = getPaths(projectName, repoName, branch)

  const { uiLog, devLog, logFilePath } = createLogger(paths.logFile)

  const status = async (s) => {
    await devLog(`STATUS → ${s}`)
    onStatus?.(s)
  }

  try {
    // ── 1. INIT WORK DIR ─────────────────────────
    await status('analyzing')

    await fsExtra.ensureDir(paths.workDir)

    await uiLog(`Cloning ${repoUrl} [${branch}]`)

    await cloneRepo({
      repoUrl,
      branch,
      cloneDir: paths.workDir,
      devLog
    })

    await uiLog('Clone complete')

    // ── 2. DETECT STACK ───────────────────────────
    await status('detecting')

    const { language, framework, version, label } = await detectStackAndVersion(
      paths.workDir,
      callAI,
      devLog
    )

    await devLog(`Stack: ${label}, ${version}`)   // e.g. "Python 3.12 · FastAPI"

    // ── 3. AI FIX LOOP ────────────────────────────
    let lastError = errorLog
    let buildResult = { success: false, error: lastError }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await devLog(`── Attempt ${attempt}/${MAX_ATTEMPTS} ──`)
      await status('patching')

      const projectJson = folderToJson(paths.workDir)

      const { systemPrompt, userPrompt } = generateFixPrompt({
        projectJson,
        buildError: lastError,
        language,
        framework,
        version,
        projectName,
        attempt,
        instructions,
      })

      await status('validating')

      let rawResponse
      try {
        rawResponse = await callAI({ systemPrompt, userPrompt, devLog })
      } catch (err) {
        await devLog(`AI error: ${err.message}`)
        continue
      }

      let fixedJson
      try {
        fixedJson = await parseAIResponse(rawResponse, devLog)
      } catch (err) {
        await devLog(`Parse error: ${err.message}`)
        continue
      }

      await status('preparing')

      jsonToFolder(fixedJson, paths.fixDir)

      await uiLog(`Build checking (attempt ${attempt})…`)

      buildResult = await runBuildScript({
        projectPath: paths.fixDir,
        language,
        framework: version,
        projectName,
        devLog
      })

      if (buildResult.success) {
        await uiLog(`Build passed ✓ (attempt ${attempt})`)
        break
      }

      lastError = buildResult.error
      await uiLog(`Build failed → retrying`)
    }

    // ── 4. FINAL RESULT ───────────────────────────
    if (!buildResult.success) {
      await status('failed')
      await uiLog('All attempts failed ❌')

      return {
        success: false,
        error: lastError,
        logFile: logFilePath
      }
    }

    await status('completed')
    await uiLog('Build successful 🚀')

    return {
      success: true,
      message: 'Build fixed successfully',
      projectPath: paths.workDir,
      logFile: logFilePath
    }

  } catch (err) {
    await devLog(`Pipeline crashed: ${err.message}`)
    await status('failed')

    return {
      success: false,
      error: err.message,
      logFile: logFilePath
    }
  }
}

module.exports = { runFixPipeline }