'use strict'
const { v4: uuidv4 } = require('uuid');
const { runFixPipeline } = require('../core/fixPipeline');
const path = require('path')
const { commitProjectRepository } = require('../core/git/gitCommit')
const { getPaths } = require('../core/utils/paths')
const fixJobs = new Map();
const { createLogger } = require('../core/logger/logger')
const db = require('../config/db')

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

function formatDiff(stat) {
  if (!stat) return "";

  const insertMatch = stat.match(/(\d+)\s+insertion/);
  const deleteMatch = stat.match(/(\d+)\s+deletion/);

  const insertions = insertMatch ? insertMatch[1] : "0";
  const deletions = deleteMatch ? deleteMatch[1] : "0";

  return `+${insertions} / -${deletions}`;
}

exports.commitFix = async (req, res) => {
  try {
    const {
      repoUrl,
      branch,
      projectName,
      message,
      summary,
      mainbranch,
      env
    } = req.body

    if (!repoUrl || !branch || !projectName || !message || !mainbranch) {
      return res.status(400).json({
        success: false,
        message:
          'repoUrl, branch, projectName, message, and mainbranch are required',
      })
    }

    const repoName = repoUrl
      .split('/')
      .pop()
      .replace(/\.git$/, '')

    const paths = getPaths(projectName, repoName, mainbranch)

    const {
      uiLog,
      devLog,
      logFilePath,
    } = createLogger(paths.logFile)

    uiLog('🚀 Commit request received')
    devLog(`Repo: ${repoUrl}`)
    devLog(`Branch: ${branch}`)
    devLog(`Project: ${projectName}`)
    devLog(`Message: ${message}`)

    const result = await commitProjectRepository({
      repoPath: paths.fixDir,
      branchName: branch,
      user: 'dorthyuser',
      message,
      logger: {
        uiLog,
        devLog,
      },
    });

    const diff = formatDiff(result.stdout || result.output || "");

    uiLog('✅ Commit completed')

    try {
      const insertQuery = `
    INSERT INTO \`fixed-app\`
    (app, env, summary, diff, \`commit\`, \`fixed-date\`)
    VALUES (?, ?, ?, ?, ?, NOW())
  `

      const values = [
        projectName,
        env,
        summary,
        diff || '',
        message,
      ]

      await new Promise((resolve, reject) => {
        db.query(insertQuery, values, (err, result) => {
          if (err) return reject(err)
          resolve(result)
        })
      })

      devLog('✅ Fix data saved to database')
    } catch (dbErr) {
      devLog(`⚠️ Failed to save fix data to DB: ${dbErr.message}`)
      console.error('DB insert error:', dbErr)
    }

    return res.json({
      success: true,
      committed: true,
      branch,
      message,
      logFilePath,
      pr: `${repoUrl}/pull/new/${branch}`,
    })
  } catch (err) {
    console.error('commitFix error:', err)

    return res.status(500).json({
      success: false,
      message: err.message || err.error || 'Internal server error',
    })
  }
}


exports.fixedApp = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        app,
        env,
        summary,
        diff,
        \`commit\`,
        \`fixed-date\`
      FROM \`fixed-app\`
      ORDER BY \`fixed-date\` DESC
    `;

    const rows = await new Promise((resolve, reject) => {
      db.query(query, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    const formatted = rows.map(r => {
      let additions = 0;
      let deletions = 0;

      const diffStr = (r.diff || "").trim();

      let match = diffStr.match(/\+(\d+)[^-\d]*[-−](\d+)/);

      if (match) {
        additions = parseInt(match[1], 10) || 0;
        deletions = parseInt(match[2], 10) || 0;
      } else {

        match = diffStr.match(/\+(\d+)\s*\/\s*[-−](\d+)/);
        if (match) {
          additions = parseInt(match[1], 10) || 0;
          deletions = parseInt(match[2], 10) || 0;
        }
      }

      return {
        id: r.id,
        app: r.app,
        env: r.env,
        summary: r.summary,
        commit: r.commit,
        fixedAt: r["fixed-date"]
          ? new Date(r["fixed-date"]).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
          : '—',
        additions,
        deletions,
        branch: r.env || 'main',
        duration: "—"
      };
    });

    return res.json({
      success: true,
      data: formatted,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};