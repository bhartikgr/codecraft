'use strict'

const fs = require('fs')
const path = require('path')

// ─── helpers ────────────────────────────────────────────────────────────────

const readSafe = (filePath) => {
  try { return fs.readFileSync(filePath, 'utf8') } catch { return null }
}

const hasSafe = (dir, file) => fs.existsSync(path.join(dir, file))

const filesSafe = (dir) => {
  try { return fs.readdirSync(dir) } catch { return [] }
}

// ─── version hint files per language ────────────────────────────────────────
// We collect small, version-revealing files and pass them to AI.
// Keep total chars low — we only need version signals, not full file contents.

const VERSION_HINT_FILES = {
  'node js': ['package.json', '.nvmrc', '.node-version', '.tool-versions'],
  python: ['requirements.txt', 'pyproject.toml', 'setup.cfg', 'setup.py',
    'Pipfile', '.python-version', '.tool-versions', 'runtime.txt'],
  java: ['pom.xml', 'build.gradle', 'build.gradle.kts', '.tool-versions'],
  'c#': [], // .csproj — discovered dynamically below
}

/**
 * Scan .github/workflows/*.yml and return first file that mentions
 * the language keyword (python-version, node-version, java-version, etc.)
 * Trimmed to 80 lines — CI files are noisy, we only need the version matrix.
 */
function collectCIHints(cloneDir, language) {
  const snippets = []

  const versionKey = {
    python: 'python-version',
    'node js': 'node-version',
    java: 'java-version',
    'c#': 'dotnet-version',
  }[language]

  if (!versionKey) return ''

  // Check .github/workflows/
  const workflowDir = path.join(cloneDir, '.github', 'workflows')
  const workflowFiles = fs.existsSync(workflowDir)
    ? fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    : []

  for (const wf of workflowFiles) {
    const content = readSafe(path.join(workflowDir, wf))
    if (!content || !content.includes(versionKey)) continue
    const trimmed = content.split('\n').slice(0, 80).join('\n')
    snippets.push(`### .github/workflows/${wf}\n${trimmed}`)
    break // one CI file is enough
  }

  return snippets.join('\n\n')
}

/**
 * Scan Dockerfile / docker-compose.yml for FROM python:3.12 style lines.
 * Only grab lines containing the version keyword — keeps tokens tiny.
 */
function collectDockerHints(cloneDir, language) {
  const dockerFiles = ['Dockerfile', 'Dockerfile.prod', 'docker-compose.yml', 'docker-compose.yaml']

  const imageKeyword = {
    python: 'python',
    'node js': 'node',
    java: 'eclipse-temurin',   // most common on Docker Hub
    'c#': 'dotnet',
  }[language] ?? language

  const snippets = []

  for (const file of dockerFiles) {
    const content = readSafe(path.join(cloneDir, file))
    if (!content) continue
    // Only lines that look like version pins — FROM python:3.12, image: node:20
    const relevant = content
      .split('\n')
      .filter(l => l.toLowerCase().includes(imageKeyword))
      .slice(0, 10)
      .join('\n')
    if (relevant.trim()) snippets.push(`### ${file}\n${relevant}`)
  }

  return snippets.join('\n\n')
}

function collectVersionHints(cloneDir, language) {
  const snippets = []

  let files = VERSION_HINT_FILES[language] ?? []

  // For C# grab the first .csproj
  if (language === 'c#') {
    const csproj = filesSafe(cloneDir).find(f => f.endsWith('.csproj'))
    if (csproj) files = [csproj]
  }

  for (const file of files) {
    const content = readSafe(path.join(cloneDir, file))
    if (!content) continue
    // Trim to first 120 lines — enough for version signals, cheap on tokens
    const trimmed = content.split('\n').slice(0, 120).join('\n')
    snippets.push(`### ${file}\n${trimmed}`)
  }

  // Also check Dockerfile and CI workflows — often the only place version is pinned
  const dockerHints = collectDockerHints(cloneDir, language)
  const ciHints = collectCIHints(cloneDir, language)

  if (dockerHints) snippets.push(dockerHints)
  if (ciHints) snippets.push(ciHints)

  return snippets.join('\n\n')
}

// ─── AI version detection ────────────────────────────────────────────────────

/**
 * Ask AI for the exact runtime version from project files.
 * Returns e.g. "3.12" | "18" | "21" | null (null → fall back to file scan)
 */
async function detectVersionWithAI(cloneDir, language, callAI, devLog) {
  const hints = collectVersionHints(cloneDir, language)

  if (!hints.trim()) {
    await devLog?.(`[detectVersion] No version hint files found for ${language}`)
    return null
  }

  const systemPrompt = `You are a build-environment detector.
Given project config files, extract the EXACT runtime version required.
Reply with ONLY a JSON object — no markdown, no explanation:
{"version": "<major.minor>" | "<major>" | null, "source": "<filename that told you>"}

Rules:
- For Python: return major.minor e.g. "3.12"
- For Node.js: return major only e.g. "20"  
- For Java: return major only e.g. "21"
- For C#/.NET: return major.minor e.g. "8.0"
- If multiple versions are listed (e.g. CI matrix), return the FIRST / lowest supported one
- If you cannot determine a version with confidence, return null`

  const userPrompt = `Language: ${language}\n\nProject files:\n${hints}`

  try {
    const raw = await callAI({ systemPrompt, userPrompt, devLog })

    // Strip possible markdown fences
    const cleaned = raw.replace(/```json|```/gi, '').trim()
    const parsed = JSON.parse(cleaned)

    const version = parsed?.version ?? null
    await devLog?.(`[detectVersion] AI says ${language} version = ${version} (from ${parsed?.source})`)
    return version

  } catch (err) {
    await devLog?.(`[detectVersion] AI parse failed: ${err.message}`)
    return null
  }
}

// ─── framework detection (unchanged, kept sync) ─────────────────────────────

function detectFramework(cloneDir, language) {
  const has = f => hasSafe(cloneDir, f)

  if (language === 'java') {
    try {
      const pom = readSafe(path.join(cloneDir, 'pom.xml'))
      if (pom?.includes('spring-boot')) return 'springboot'
    } catch { }
    return 'java'
  }

  if (language === 'node js') {
    try {
      const pkg = JSON.parse(readSafe(path.join(cloneDir, 'package.json')) ?? '{}')
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.express) return 'express'
      if (deps.next) return 'nextjs'
      if (deps.nuxt) return 'nuxtjs'
    } catch { }
    return 'node js'
  }

  if (language === 'python') {
    const toml = readSafe(path.join(cloneDir, 'pyproject.toml')) ?? ''
    const req = readSafe(path.join(cloneDir, 'requirements.txt')) ?? ''
    if (toml.includes('fastapi') || req.includes('fastapi')) return 'fastapi'
    if (toml.includes('django') || req.includes('django')) return 'django'
    if (toml.includes('flask') || req.includes('flask')) return 'flask'
    return 'python'
  }

  if (language === 'c#') return 'dotnet'

  return ''
}

// ─── stack detection (sync, unchanged) ──────────────────────────────────────

function detectStack(cloneDir) {
  const has = f => hasSafe(cloneDir, f)
  const files = filesSafe(cloneDir)

  if (has('package.json')) return 'node js'
  if (has('pom.xml') || has('build.gradle')) return 'java'
  if (files.some(f => f.endsWith('.csproj'))) return 'c#'
  if (has('requirements.txt') ||
    has('pyproject.toml') ||
    has('setup.py') ||
    files.some(f => f.endsWith('.py'))) return 'python'

  return 'unknown'
}

// ─── main async export ───────────────────────────────────────────────────────

/**
 * detectStackAndVersion(cloneDir, callAI, devLog)
 *
 * Returns:
 * {
 *   language:  'python' | 'node js' | 'java' | 'c#' | 'unknown'
 *   framework: 'fastapi' | 'express' | 'springboot' | ...
 *   version:   '3.12' | '20' | null          ← NEW
 *   label:     'Python 3.12 · FastAPI'        ← human-readable for logs/prompts
 * }
 */
async function detectStackAndVersion(cloneDir, callAI, devLog) {
  const language = detectStack(cloneDir)
  const framework = detectFramework(cloneDir, language)
  const version = language !== 'unknown'
    ? await detectVersionWithAI(cloneDir, language, callAI, devLog)
    : null

  // Build a clean label: "Python 3.12 · FastAPI"
  const langLabel = language === 'node js' ? 'Node.js' :
    language === 'c#' ? 'C#' :
      language.charAt(0).toUpperCase() + language.slice(1)

  const versionStr = version ? ` ${version}` : ''
  const frameworkStr = framework && framework !== language
    ? ` · ${framework.charAt(0).toUpperCase() + framework.slice(1)}`
    : ''

  const label = `${langLabel}${versionStr}${frameworkStr}`

  return { language, framework, version, label }
}

module.exports = { detectStack, detectFramework, detectStackAndVersion }