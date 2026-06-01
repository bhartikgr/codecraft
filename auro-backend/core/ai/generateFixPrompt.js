'use strict'

/**
 * extractStructure(obj)
 * File contents replace karo "..." se — AI sirf structure dekhe, content nahi.
 * Same as checkBuild's extractStructure.
 */
function extractStructure (obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string'
      ? '...'
      : extractStructure(value)
  }
  return result
}

/**
 * generateFixPrompt({ projectJson, buildError, language, framework, projectName, attempt })
 * Returns { systemPrompt, userPrompt }
 */
function generateFixPrompt ({ projectJson, buildError, language, framework, projectName, attempt, instructions }) {
  const structure = extractStructure(projectJson)

  const userPrompt = `Fix this error.
Language: ${language} | Framework: ${framework}
Project: ${projectName}
Attempt: ${attempt}
Instructions: ${instructions}

## Error
${buildError}

## Current Project (complete)
${JSON.stringify(projectJson, null, 2)}

## Required Folder Structure (DO NOT change this)
${JSON.stringify(structure, null, 2)}
Every key shown above MUST appear at the same level in your output.
Do NOT move, nest, rename, or add any folders. Only fix file contents.

## Output Rules
1. Return ONLY pure valid JSON — start with { end with }
2. No explanations, markdown, or code blocks
3. All file contents MUST be JSON-safe strings (escape \\n, \\" properly)
4. Return the COMPLETE project — ALL folders and ALL files
5. NEVER change the folder structure — only fix file contents

Return ONLY the complete project JSON.`

  const systemPrompt = `You are an expert ${language} developer. 
Return ONLY valid JSON with EXACTLY the same folder structure as given.
DO NOT move, rename, add, or remove any files or folders.
All file contents must be properly escaped JSON strings.`

  return { systemPrompt, userPrompt }
}

module.exports = { generateFixPrompt, extractStructure }