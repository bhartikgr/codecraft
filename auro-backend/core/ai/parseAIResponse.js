'use strict'

/**
 * parseAIResponse(raw, devLog)
 * Strips markdown fences, parses JSON, validates structure.
 * Returns parsed nested JSON object (same format as folderToJson output).
 */
async function parseAIResponse (raw, devLog) {
  devLog?.(`Parsing AI response (${raw.length} chars)`)

  // Strip ```json ... ``` or ``` ... ```
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Sometimes AI adds explanation before/after JSON — extract first { }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace  = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    devLog?.(`JSON.parse failed: ${err.message}`)
    devLog?.(`Raw preview: ${cleaned.substring(0, 300)}`)
    throw new Error(`AI response is not valid JSON: ${err.message}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response must be a JSON object (nested folder structure)')
  }

  devLog?.('AI response parsed successfully ✓')
  return parsed
}

module.exports = { parseAIResponse }