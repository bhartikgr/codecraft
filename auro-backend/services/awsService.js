const {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand
} = require('@aws-sdk/client-cloudwatch-logs')


const region = process.env.AWS_REGION || 'us-east-1'

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
}

const ERRORS_IN_MEMORY = parseInt(process.env.ERRORS_IN_MEMORY, 10) || 10

const logsClient = new CloudWatchLogsClient({
  region,
  credentials
})

function detectErrors(events = []) {
  const validationPatterns = [
    /\bvalidation\b/i,
    /\bvalidation failed\b/i,
    /\binvalid\b/i,
    /\brequired\b/i,
    /\bmissing\b/i,
    /\bbad request\b/i,
    /\bconstraint\b/i,
    /\bcheck constraint\b/i,
    /\bviolates check constraint\b/i,
    /\bmust be\b/i,
    /\bnot null\b/i,
    /\b400\b/i,
    /\b23514\b/i
  ];

  const errorPatterns = [
    /\bERROR\b/i,
    /\bFATAL\b/i,
    /\bTypeError\b/i,
    /\bReferenceError\b/i,
    /\bSyntaxError\b/i,
    /\bRangeError\b/i,
    /\bUnhandledPromiseRejection\b/i,
    /\bpanic:\b/i,
    /\btimeout\b/i,
    /\bECONNREFUSED\b/i,
    /\bOOMKilled\b/i,
    /\bException\b/i,
    /\bStackTrace\b/i,
    /\bCannot read\b/i,
    /\bfailed to connect\b/i
  ];

  return events
    .filter(item => {
      const msg = (item.message || "").trim();

      // ❌ Validation errors ignore
      if (validationPatterns.some(p => p.test(msg))) {
        return false;
      }

      // ✅ Actual code/runtime errors only
      return errorPatterns.some(p => p.test(msg));
    })
    .map(item => ({
      timestamp: item.timestamp,
      message: item.message
    }));
}

function detectAwsType(logGroupName = "") {
  const name = logGroupName.toLowerCase();

  if (name.includes("/aws/lambda/")) {
    return "lambda";
  }

  if (
    name.includes("api-gateway") ||
    name.includes("apigateway")
  ) {
    return "api";
  }

  if (name.includes("/ecs/")) {
    return "ecs";
  }

  if (name.includes("/eks/")) {
    return "eks";
  }

  return "unknown";
}

function detectRuntime(logGroupName = '', logs = []) {
  const combined = `${logGroupName} ${logs
    .map(l => l.message || '')
    .join(' ')}`.toLowerCase()

  if (combined.includes('nodejs')) return 'Node.js'
  if (combined.includes('python')) return 'Python'
  if (combined.includes('dotnet')) return '.NET'
  if (combined.includes('java')) return 'Java'
  if (combined.includes('go')) return 'Go'
  if (combined.includes('ruby')) return 'Ruby'
  if (combined.includes('php')) return 'PHP'
  if (combined.includes('next')) return 'Next.js App'
  if (combined.includes('react')) return 'React App'
  if (combined.includes('vue')) return 'Vue App'
  if (combined.includes('angular')) return 'Angular App'

  return 'Unknown Runtime'
}


async function getAllAppsLogs() {
  try {
    const groupsResponse = await logsClient.send(
      new DescribeLogGroupsCommand({})
    )

    const groups = groupsResponse.logGroups || []

    const finalApps = []

    let errorsInMemory = [];

    const appPromises = groups.map(async (group) => {
      const logGroupName = group.logGroupName;
      try {
        const streamResponse = await logsClient.send(
          new DescribeLogStreamsCommand({
            logGroupName,
            orderBy: 'LastEventTime',
            descending: true,
            limit: 1
          })
        );
        const latestStream = streamResponse.logStreams?.[0];
        if (!latestStream) {
          return null;
        }
        const logsResponse = await logsClient.send(
          new GetLogEventsCommand({
            logGroupName,
            logStreamName: latestStream.logStreamName,
            limit: 100,
            startFromHead: false
          })
        );
        const logs = logsResponse.events || [];
        const errors = detectErrors(logs);

        const appErrors = errors.map(err => ({
          appId: logGroupName,
          appName: logGroupName.split('/').pop(),
          ...err
        }));

        return {
          appData: {
            id: logGroupName,
            name: logGroupName.split('/').pop(),
            env: 'aws',
            type: detectAwsType(logGroupName),
            lang: detectRuntime(logGroupName, logs),
            severity:
              errors.length === 0
                ? 'low'
                : errors.length < 5
                  ? 'medium'
                  : errors.length < 15
                    ? 'high'
                    : 'critical',
            occurrences: errors.length,
            lastSeen: new Date(latestStream.lastEventTimestamp).toLocaleString(),
            errorType:
              errors?.[0]?.message?.split('\n')[0]?.slice(0, 60) || 'No errors',
            error: errors?.[0]?.message || 'No errors found',
            app: logGroupName,
            repo: 'https://github.com/dorthyuser/userprojects',
            branch: logGroupName.split('/').pop(),
            status:
              errors.length === 0
                ? 'healthy'
                : errors.length < 5
                  ? 'warning'
                  : errors.length < 15
                    ? 'degraded'
                    : 'critical',
            lastCreated: latestStream.lastEventTimestamp,
            totalLogs: logs.length,
            totalErrors: errors.length,
            logExcerpt: logs.slice(0, 2).map(x => x.message),
            logs: logs.map(log => ({
              timestamp: log.timestamp,
              message: log.message
            })),
            errorLogs: errors
          },
          appErrors
        };
      } catch (err) {

        return null;
      }
    });

    const appResults = await Promise.all(appPromises);

    for (const result of appResults) {
      if (result && result.appData) {
        finalApps.push(result.appData);
        for (const err of result.appErrors) {
          if (errorsInMemory.length < ERRORS_IN_MEMORY) {
            errorsInMemory.push(err);
          }
        }
      }
    }

    const totalErrors = finalApps.reduce((sum, app) => sum + app.totalErrors, 0)

    const totalApps = finalApps.length

    const unhealthyApps = finalApps.filter(
      app => app.status !== 'healthy'
    ).length

    let health = 100

    if (totalErrors > 0) {
      health -= Math.min(totalErrors * 2, 60)
    }

    if (unhealthyApps > 0) {
      health -= unhealthyApps * 5
    }

    if (health < 0) {
      health = 0
    }

    let status = 'healthy'

    if (health < 90) {
      status = 'warning'
    }

    if (health < 70) {
      status = 'degraded'
    }

    if (health < 40) {
      status = 'critical'
    }

    finalApps.sort((a, b) => {
      if (b.totalErrors !== a.totalErrors) {
        return b.totalErrors - a.totalErrors
      }

      return b.lastCreated - a.lastCreated
    })

    return {
      id: 'aws',
      name: 'AWS',
      kind: 'CloudWatch',
      region,
      status,
      health,
      instances: totalApps,
      errors: totalErrors,
      apps: finalApps,
      errorsInMemory
    }
  } catch (err) {
    console.log('AWS ERROR:', err.message)

    return []
  }
}

module.exports = {
  getAllAppsLogs
}
