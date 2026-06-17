'use strict'

/**
 * extractStructure(obj)
 * File contents replace karo "..." se — AI sirf structure dekhe, content nahi.
 * Same as checkBuild's extractStructure.
 */
function extractStructure(obj) {
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
function generateFixPrompt({
  projectJson,
  buildError,
  language,
  framework,
  projectName,
  attempt,
  instructions
}) {
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

## README Requirement
- If a README.md file already exists, update it and make it complete.
- If README.md does NOT exist, create one at the project root.
- The README.md must be detailed and production-ready.
- Include:
  1. Project name and description
  2. Features
  3. Tech stack
  4. Installation steps
  5. Environment variables (.env example)
  6. Run commands (development and production)
  7. Build and deployment steps
  8. Folder structure overview
  9. API documentation (if applicable)
     - Endpoint URL
     - HTTP method
     - Request headers
     - Request body examples
     - Query parameters
     - Response examples
     - Error responses
  10. Authentication instructions
  11. Usage examples
  12. Troubleshooting section
  13. License section

## Output Rules
1. Return ONLY pure valid JSON — start with { end with }
2. No explanations, markdown, or code blocks
3. All file contents MUST be JSON-safe strings (escape \\n, \\" properly)
4. Return the COMPLETE project — ALL folders and ALL files
5. NEVER change the folder structure — only fix file contents
6. README.md must exist in the final output (either updated or newly created).

Return ONLY the complete project JSON.`

  const systemPrompt = `You are an expert ${language} developer.

Return ONLY valid JSON with EXACTLY the same folder structure as given.
DO NOT move, rename, add, or remove any files or folders.

Exception:
- If README.md does not exist, create a README.md file at the project root.
- If README.md exists, update it with complete project documentation.

README.md must include:
- Project overview
- Setup instructions
- Installation commands
- Environment variables
- Build and run instructions
- Deployment guide
- Folder structure explanation
- API documentation with endpoints, headers, request body, query params, and response examples
- Authentication details
- Usage examples
- Troubleshooting information

All file contents must be properly escaped JSON strings.`

  return { systemPrompt, userPrompt }
}

module.exports = { generateFixPrompt, extractStructure }