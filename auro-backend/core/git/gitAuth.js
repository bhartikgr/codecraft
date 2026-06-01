'use strict'

function getAuthenticatedUrl (repoUrl) {
  const token = process.env.GITHUB_API_KEY
  if (!token) throw new Error('GITHUB_API_KEY not set in .env')
  // https://github.com/user/repo  →  https://TOKEN@github.com/user/repo
  return repoUrl.replace('https://', `https://${token}@`)
}

function parseRepoInfo (repoUrl) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) throw new Error(`Cannot parse GitHub URL: ${repoUrl}`)
  return { owner: match[1], repo: match[2] }
}

module.exports = { getAuthenticatedUrl, parseRepoInfo }