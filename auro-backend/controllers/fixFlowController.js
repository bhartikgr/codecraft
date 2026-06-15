'use strict'
const { v4: uuidv4 } = require('uuid');
const { runFixPipeline } = require('../core/fixPipeline');
const path = require('path')
const { commitProjectRepository } = require('../core/git/gitCommit')
const { getPaths } = require('./utils/paths')
const fixJobs = new Map();

exports.startFix = async (req, res) => {
  try {
    const { appId, repoUrl, branch, projectName, commitMessage, error, instructions } = req.body

    console.log('startFix payload:', { appId, repoUrl, branch, projectName, error: error?.substring(0, 100), instructions })

    if (!appId || !repoUrl || !branch || !projectName) {
      return res.status(400).json({
        success: false,
        message: `Missing: ${[
          !appId && 'appId',
          !repoUrl && 'repoUrl',
          !branch && 'branch',
          !projectName && 'projectName',
        ].filter(Boolean).join(', ')}`,
      })
    }

    if (!error) {
      return res.status(400).json({ success: false, message: 'error log is required' })
    }

    const fixId = require('uuid').v4()
    fixJobs.set(fixId, { fixId, appId, status: 'analyzing', startedAt: Date.now() })

    // Background mein run karo
    runFixPipeline({
      projectName,
      repoUrl,
      branch,
      commitMessage,
      errorLog: error,          // ← frontend ka original error
      instructions,
      onStatus: (s) => {
        const job = fixJobs.get(fixId)
        if (job) fixJobs.set(fixId, { ...job, status: s })
      },
    }).then(result => {
      const job = fixJobs.get(fixId)
      fixJobs.set(fixId, {
        ...job,
        status: result.success ? 'completed' : 'failed',
        result,
      })
    })

    return res.status(201).json({ success: true, fixId })
  } catch (err) {
    console.error('startFix error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

exports.getFixStatus = async (req, res) => {
  try {
    const job = fixJobs.get(req.params.fixId);
    if (!job) return res.status(404).json({ success: false, message: 'Fix job not found' });

    return res.json({
      success: true,
      fixId: job.fixId,
      status: job.status,
      appId: job.appId,
      result: job.result ?? null,
    });
  } catch (err) {
    console.error('getFixStatus error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const BASE = path.resolve(__dirname, '../fix-project')

exports.commitFix = async (req, res) => {
  try {
    const { repoUrl, branch, projectName, message, mainbranch } = req.body

    const repoName = repoUrl.split('/').pop().replace(/\.git$/, '')
    const paths = getPaths(projectName, repoName, branch)

    if (!repoUrl || !branch || !projectName || !message || !mainbranch) {
      return res.status(400).json({
        success: false,
        message: 'repoUrl, branch, projectName, message, and mainbranch are required',
      })
    }

    await commitProjectRepository({
      repoPath: paths.fixDir,
      branchName: branch,
      user: 'dorthyuser',
      message: message,
    })

    return res.json({
      success: true,
      committed: true,
      branch,
      message,
      pr: `${repoUrl}/pull/new/${branch}`,
    })

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    })
    console.error('commitFix error:', err)
  }
}

