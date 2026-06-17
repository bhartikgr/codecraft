const { AzureCliCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");
const { LogsQueryClient } = require("@azure/monitor-query");

const credential = new AzureCliCredential();
const logsClient = new LogsQueryClient(credential);

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const workspaceId = process.env.AZURE_WORKSPACE_ID;

function detectErrors(events = []) {
  if (!Array.isArray(events)) return [];

  const ERROR_LEVELS = new Set([
    "error",
    "critical",
    "fatal"
  ]);

  // ❌ Inko fix/commit nahi karna
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
    /\b23514\b/i // PostgreSQL check constraint
  ];

  // ✅ Sirf actual code/runtime issues
  const errorPatterns = [
    /\bFATAL\b/i,
    /\bTypeError\b/i,
    /\bReferenceError\b/i,
    /\bSyntaxError\b/i,
    /\bRangeError\b/i,
    /\bUnhandledPromiseRejection\b/i,
    /\btimeout\b/i,
    /\bECONNREFUSED\b/i,
    /\bOOMKilled\b/i,
    /\bException\b/i,
    /\bStackTrace\b/i,
    /\bUnhandled\b/i,
    /\bCannot read\b/i,
    /\bfailed to connect\b/i
  ];

  return events.filter(item => {
    const msg = (
      item.Message ||
      item.message ||
      item.RenderedDescription ||
      ""
    )
      .toString()
      .trim();

    // Step 1: Validation errors ignore
    if (validationPatterns.some(p => p.test(msg))) {
      return false;
    }

    // Step 2: Actual runtime errors
    if (typeof item.SeverityLevel === "number") {
      return item.SeverityLevel >= 3;
    }

    const levelStr = (
      item.Level ||
      item.level ||
      item.Category ||
      item.category ||
      ""
    )
      .toString()
      .toLowerCase()
      .trim();

    if (levelStr) {
      return ERROR_LEVELS.has(levelStr);
    }

    return errorPatterns.some(p => p.test(msg));
  });
}

function detectAzureType(app) {
  const kind = (app.kind || "").toLowerCase();

  if (kind.includes("functionapp")) return "function";

  if (kind.includes("app")) return "webapp";

  if (kind.includes("linux")) return "container";

  return kind || "unknown";
}

function detectAzureRuntime(app = {}) {
  const stack = (
    app.siteConfig?.linuxFxVersion ||
    app.siteConfig?.windowsFxVersion ||
    ""
  ).toLowerCase();

  if (stack.includes("node")) return "Node.js";
  if (stack.includes("python")) return "Python";
  if (stack.includes("dotnet")) return ".NET";
  if (stack.includes("java")) return "Java";

  return "Unknown Runtime";
}

function timeRange(hours = 24) {
  return {
    startTime: new Date(Date.now() - hours * 60 * 60 * 1000),
    endTime: new Date()
  };
}

async function fetchLogsOnce() {
  try {
    const res = await logsClient.queryWorkspace(
      workspaceId,
      `union isfuzzy=true
        (AppTraces
          | where SeverityLevel >= 3
          | project TimeGenerated, AppRoleName, Message, SeverityLevel, Level = ""),
        (AppExceptions
          | project TimeGenerated, AppRoleName, Message = OuterMessage, SeverityLevel = 3, Level = ""),
        (FunctionAppLogs
          | where Level in ("Error", "Critical")
          | project TimeGenerated, AppRoleName = HostInstanceId, Message, SeverityLevel = -1, Level)
      | where TimeGenerated > ago(24h)
      | order by TimeGenerated desc`,
      timeRange(24)
    );

    const table = res.tables?.[0];
    const rows = table?.rows || [];
    const cols = table?.columns?.map(c => c.name) || [];

    return rows.map(row => {
      const obj = {};
      cols.forEach((c, i) => (obj[c] = row[i]));
      return obj;
    });
  } catch (err) {
    console.log("LOG FETCH ERROR:", err.message);
    return [];
  }
}

async function getAzureData() {
  try {
    const webClient = new WebSiteManagementClient(
      credential,
      subscriptionId
    );

    const logs = await fetchLogsOnce();

    const apps = [];

    const iterator = webClient.webApps.list();

    for await (const app of iterator) {
      const kind = (app.kind || "").toLowerCase();
      if (!kind.includes("functionapp")) continue;

      const appLogs = logs.filter(l =>
        (l.AppRoleName || "").includes(app.name)
      );

      const errors = detectErrors(appLogs);

      apps.push({
        id: app.id,
        name: app.name,
        env: "azure",
        url: app.defaultHostName
          ? `https://${app.defaultHostName}`
          : null,

        type: detectAzureType(app),
        lang: detectAzureRuntime(app),
        severity:
          errors.length === 0 ? "low"
            : errors.length < 5 ? "medium"
              : "high",

        occurrences: errors.length,

        lastSeen: app.lastModifiedTimeUtc || null,

        errorType: errors?.[0]?.Message || "No errors",
        error: errors?.[0]?.Message || "No errors found",

        app: app.id,
        repo: 'https://github.com/dorthyuser/userprojects',
        branch: app.name,

        status:
          app.state === "Running" ? "healthy" : "warning",

        lastCreated: new Date(
          app.lastModifiedTimeUtc || Date.now()
        ).getTime(),

        totalLogs: appLogs.length,
        totalErrors: errors.length,

        logExcerpt: appLogs.slice(0, 2).map(x =>
          x.Message || x.message || x.RenderedDescription
        ),
        logs: appLogs.slice(0, 50).map(x => ({
          message: x.Message || x.message || x.RenderedDescription || "",
          timestamp: x.TimeGenerated || x.timestamp || x.time || null
        })),
        errorLogs: errors
      });
    }

    const totalErrors = apps.reduce(
      (sum, a) => sum + a.totalErrors,
      0
    );

    const unhealthyApps = apps.filter(
      a => a.status !== "healthy"
    ).length;

    let health = 100 - unhealthyApps * 10;
    if (health < 0) health = 0;

    return {
      id: "azure",
      name: "Azure",
      kind: "Function Apps",
      provider: "azure",
      region: "global",

      health,
      status:
        health > 90
          ? "healthy"
          : health > 70
            ? "warning"
            : "critical",

      instances: apps.length,
      errors: totalErrors,

      apps
    };
  } catch (err) {
    console.log("AZURE ERROR:", err.message);

    return {
      id: "azure",
      status: "error",
      health: 0,
      instances: 0,
      errors: 1,
      apps: [],
      message: err.message
    };
  }
}

module.exports = { getAzureData };