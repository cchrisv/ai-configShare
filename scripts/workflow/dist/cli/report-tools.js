#!/usr/bin/env node
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var init_esm_shims = __esm({
  "node_modules/tsup/assets/esm_shims.js"() {
    "use strict";
  }
});

// src/types/adoFieldTypes.ts
var ADO_RESOURCE_ID, DEFAULT_ADO_ORG, DEFAULT_ADO_PROJECT;
var init_adoFieldTypes = __esm({
  "src/types/adoFieldTypes.ts"() {
    "use strict";
    init_esm_shims();
    ADO_RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";
    DEFAULT_ADO_ORG = "https://dev.azure.com/UMGC";
    DEFAULT_ADO_PROJECT = "Digital Platforms";
  }
});

// src/lib/authAzureCli.ts
import { execSync } from "child_process";
function getAzureBearerToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return tokenCache.token;
  }
  try {
    const result = execSync(
      `az account get-access-token --resource ${ADO_RESOURCE_ID} --query "{token:accessToken,expiresOn:expiresOn}" -o json`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const parsed = JSON.parse(result);
    const expiresAt = new Date(parsed.expiresOn).getTime();
    tokenCache = {
      token: parsed.token,
      expiresAt
    };
    return parsed.token;
  } catch (error) {
    tokenCache = null;
    if (error instanceof Error) {
      if (error.message.includes("az: command not found") || error.message.includes("is not recognized")) {
        throw new Error(
          "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        );
      }
      if (error.message.includes("AADSTS") || error.message.includes("Please run")) {
        throw new Error(
          "Azure CLI is not authenticated. Please run: az login"
        );
      }
      throw new Error(`Failed to get Azure bearer token: ${error.message}`);
    }
    throw error;
  }
}
function validateAzureAuth() {
  try {
    execSync("az account show", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("az: command not found") || error.message.includes("is not recognized")) {
        throw new Error(
          "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        );
      }
      throw new Error(
        "Azure CLI is not authenticated. Please run: az login"
      );
    }
    throw error;
  }
}
var tokenCache, TOKEN_EXPIRY_BUFFER_MS;
var init_authAzureCli = __esm({
  "src/lib/authAzureCli.ts"() {
    "use strict";
    init_esm_shims();
    init_adoFieldTypes();
    tokenCache = null;
    TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1e3;
  }
});

// cli/report-tools.ts
init_esm_shims();
import { Command } from "commander";

// src/adoActivityReport.ts
init_esm_shims();
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";

// src/adoClient.ts
init_esm_shims();
init_authAzureCli();
init_adoFieldTypes();
import * as azdev from "azure-devops-node-api";

// src/lib/loggerStructured.ts
init_esm_shims();
var LOG_LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var config = {
  minLevel: "info",
  jsonOutput: false,
  includeTimestamp: true,
  silent: false,
  useStderr: false
};
function configureLogger(newConfig) {
  config = { ...config, ...newConfig };
}
function shouldLog(level) {
  if (config.silent) return false;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.minLevel];
}
function output(level, message) {
  if (config.useStderr) {
    console.error(message);
  } else {
    switch (level) {
      case "debug":
        console.debug(message);
        break;
      case "info":
        console.info(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        break;
    }
  }
}
function formatEntry(entry) {
  if (config.jsonOutput) {
    return JSON.stringify(entry);
  }
  const parts = [];
  if (config.includeTimestamp) {
    parts.push(`[${entry.timestamp}]`);
  }
  parts.push(`[${entry.level.toUpperCase()}]`);
  parts.push(entry.message);
  if (entry.data !== void 0) {
    if (typeof entry.data === "object") {
      parts.push(JSON.stringify(entry.data, null, 2));
    } else {
      parts.push(String(entry.data));
    }
  }
  return parts.join(" ");
}
function createEntry(level, message, data, context) {
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    message,
    data,
    context: context ?? config.context
  };
}
function logDebug(message, data, context) {
  if (!shouldLog("debug")) return;
  const entry = createEntry("debug", message, data, context);
  output("debug", formatEntry(entry));
}
function logInfo(message, data, context) {
  if (!shouldLog("info")) return;
  const entry = createEntry("info", message, data, context);
  output("info", formatEntry(entry));
}
function logWarn(message, data, context) {
  if (!shouldLog("warn")) return;
  const entry = createEntry("warn", message, data, context);
  output("warn", formatEntry(entry));
}

// src/adoClient.ts
var cachedConnection = null;
var cachedConfig = null;
function configChanged(config2) {
  if (!cachedConfig) return true;
  return config2.orgUrl !== cachedConfig.orgUrl || config2.project !== cachedConfig.project;
}
async function createAdoConnection(config2 = {}) {
  const orgUrl = config2.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2.project ?? DEFAULT_ADO_PROJECT;
  if (cachedConnection && !configChanged(config2)) {
    logDebug("Using cached ADO connection");
    return cachedConnection;
  }
  logInfo(`Creating ADO connection to ${orgUrl}`);
  if (!config2.skipAuthValidation) {
    validateAzureAuth();
  }
  const token = getAzureBearerToken();
  const authHandler = azdev.getBearerHandler(token);
  const connection = new azdev.WebApi(orgUrl, authHandler);
  const adoConnection = {
    connection,
    orgUrl,
    project,
    getWorkItemTrackingApi: () => connection.getWorkItemTrackingApi(),
    getWikiApi: () => connection.getWikiApi(),
    getCoreApi: () => connection.getCoreApi(),
    getGitApi: () => connection.getGitApi()
  };
  cachedConnection = adoConnection;
  cachedConfig = { orgUrl, project };
  logDebug("ADO connection created successfully");
  return adoConnection;
}

// src/adoActivityReport.ts
var WIKI_REPO_ID = "c7b64b09-35f3-4d8a-889c-5650655281ee";
var ADO_ORG = "UMGC";
var ADO_SEARCH_URL = `https://almsearch.dev.azure.com/${ADO_ORG}/_apis/search/workitemsearchresults?api-version=7.1`;
function cleanHtml(rawHtml) {
  if (!rawHtml) return "";
  const cleanText = rawHtml.replace(/<[^>]*>/g, "");
  return cleanText.replace(/\s+/g, " ").trim();
}
function classifyMention(text) {
  const lowerText = text.toLowerCase();
  if (text.includes("?")) return "ActionableMention";
  const actionableKeywords = [
    "please",
    "can you",
    "could you",
    "review",
    "approve",
    "check",
    "verify",
    "update",
    "fix",
    "status",
    "what is",
    "when"
  ];
  if (actionableKeywords.some((k) => lowerText.includes(k))) {
    return "ActionableMention";
  }
  const fyiKeywords = [
    "fyi",
    "cc:",
    "cc ",
    "copying",
    "adding",
    "heads up",
    "for info",
    "just to note"
  ];
  if (fyiKeywords.some((k) => lowerText.includes(k))) {
    return "FYIMention";
  }
  const cleanText = lowerText.replace(/@[a-z\s]+/g, "").trim();
  if (cleanText.length < 10) return "FYIMention";
  return "DiscussionMention";
}
function isMatch(target, nameToCheck, emailToCheck) {
  if (!nameToCheck && !emailToCheck) return false;
  const nameMatch = target.name && nameToCheck && nameToCheck.toLowerCase().includes(target.name.toLowerCase());
  const emailMatch = target.email && emailToCheck && emailToCheck.toLowerCase().includes(target.email.toLowerCase());
  return !!(nameMatch || emailMatch);
}
async function queryWorkItemIds(conn, query) {
  const witApi = await conn.getWorkItemTrackingApi();
  const result = await witApi.queryByWiql({ query }, conn.project);
  if (!result.workItems || result.workItems.length === 0) {
    return [];
  }
  return result.workItems.map((wi) => wi.id).filter((id) => id !== void 0);
}
async function fetchTargetedWorkItems(conn, targets, days) {
  const witApi = await conn.getWorkItemTrackingApi();
  logInfo(`Fetching work items for ${targets.length} people in last ${days} days...`);
  const allIds = /* @__PURE__ */ new Set();
  for (const target of targets) {
    const changedByQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.ChangedBy] = '${target.name}' AND [System.ChangedDate] >= @Today - ${days}`;
    const changedByIds = await queryWorkItemIds(conn, changedByQuery);
    logInfo(`  ${target.name}: ${changedByIds.length} items changed by`);
    changedByIds.forEach((id) => allIds.add(id));
    const assignedToQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = '${target.name}' AND [System.ChangedDate] >= @Today - ${days}`;
    const assignedToIds = await queryWorkItemIds(conn, assignedToQuery);
    logInfo(`  ${target.name}: ${assignedToIds.length} items assigned to`);
    assignedToIds.forEach((id) => allIds.add(id));
    const createdByQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.CreatedBy] = '${target.name}' AND [System.CreatedDate] >= @Today - ${days}`;
    const createdByIds = await queryWorkItemIds(conn, createdByQuery);
    logInfo(`  ${target.name}: ${createdByIds.length} items created by`);
    createdByIds.forEach((id) => allIds.add(id));
  }
  const uniqueIds = Array.from(allIds);
  logInfo(`Total unique work items to process: ${uniqueIds.length}`);
  if (uniqueIds.length === 0) {
    return [];
  }
  const allItems = [];
  const batchSize = 200;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batchIds = uniqueIds.slice(i, i + batchSize);
    const items = await witApi.getWorkItems(
      batchIds,
      ["System.Id", "System.Title", "System.WorkItemType", "System.State", "System.AreaPath"],
      void 0,
      void 0,
      void 0,
      conn.project
    );
    if (items) {
      allItems.push(...items.map((item) => ({
        id: item.id,
        fields: item.fields
      })));
    }
    logDebug(`Fetched ${allItems.length}/${uniqueIds.length} work items...`);
  }
  return allItems;
}
async function fetchRecentWorkItems(conn, days) {
  const witApi = await conn.getWorkItemTrackingApi();
  logInfo(`--- Fetching Work Items ---`);
  logInfo(`Querying work items changed in last ${days} days...`);
  const query = `SELECT [System.Id] FROM WorkItems WHERE [System.ChangedDate] >= @Today - ${days} ORDER BY [System.ChangedDate] DESC`;
  let result;
  try {
    result = await witApi.queryByWiql({ query }, conn.project);
  } catch (error) {
    logWarn(`WIQL query failed: ${error}`);
    throw new Error(`Failed to query work items: ${error instanceof Error ? error.message : error}`);
  }
  if (!result.workItems || result.workItems.length === 0) {
    logInfo("No work items found in the specified date range");
    return [];
  }
  const ids = result.workItems.map((wi) => wi.id).filter((id) => id !== void 0);
  logInfo(`Found ${ids.length.toLocaleString()} work items to scan`);
  const allItems = [];
  let errors = 0;
  const batchSize = 200;
  const concurrentBatches = 20;
  const startTime = Date.now();
  const batches = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }
  logInfo(`Fetching details in ${batches.length} batches (${concurrentBatches} concurrent)...`);
  for (let i = 0; i < batches.length; i += concurrentBatches) {
    const batchGroup = batches.slice(i, i + concurrentBatches);
    const batchPromises = batchGroup.map(
      (batchIds) => witApi.getWorkItems(
        batchIds,
        ["System.Id", "System.Title", "System.WorkItemType", "System.State", "System.AreaPath"],
        void 0,
        void 0,
        void 0,
        conn.project
      ).catch((err) => {
        errors++;
        logDebug(`Batch fetch error: ${err}`);
        return null;
      })
    );
    const results = await Promise.all(batchPromises);
    for (const items of results) {
      if (items) {
        allItems.push(...items.map((item) => ({
          id: item.id,
          fields: item.fields
        })));
      }
    }
  }
  const elapsed = (Date.now() - startTime) / 1e3;
  logInfo(`Fetched ${allItems.length.toLocaleString()} work items in ${elapsed.toFixed(1)}s${errors > 0 ? ` (${errors} batch errors)` : ""}`);
  return allItems;
}
async function fetchWorkItemUpdates(conn, workItemId) {
  const witApi = await conn.getWorkItemTrackingApi();
  try {
    const updates = await witApi.getUpdates(workItemId, conn.project);
    return updates || [];
  } catch (error) {
    logWarn(`Failed to fetch updates for work item ${workItemId}: ${error}`);
    return [];
  }
}
async function processWorkItem(conn, item, targets, cutoffDate) {
  const activities = [];
  const updates = await fetchWorkItemUpdates(conn, item.id);
  const wiTitle = String(item.fields["System.Title"] || "No Title");
  const wiType = String(item.fields["System.WorkItemType"] || "Unknown");
  const wiState = String(item.fields["System.State"] || "Unknown");
  const wiArea = String(item.fields["System.AreaPath"] || "Unknown");
  for (const update of updates) {
    let updateDate;
    try {
      const rawDate = update.revisedDate;
      if (!rawDate) continue;
      updateDate = typeof rawDate === "string" ? new Date(rawDate) : new Date(rawDate);
      if (isNaN(updateDate.getTime())) continue;
    } catch {
      continue;
    }
    if (updateDate.getFullYear() > 3e3) continue;
    if (updateDate < cutoffDate) continue;
    const revisedByName = update.revisedBy?.displayName || "";
    const revisedByEmail = update.revisedBy?.uniqueName || "";
    for (const target of targets) {
      const matched = isMatch(target, revisedByName, revisedByEmail);
      if (matched) {
        if (!update.fields) continue;
        const changes = [];
        let commentText = "";
        for (const [fieldName, fieldVal] of Object.entries(update.fields)) {
          if (fieldName === "System.State") {
            const oldState = String(fieldVal.oldValue || "New");
            const newState = String(fieldVal.newValue || "Unknown");
            changes.push(`State: ${oldState}->${newState}`);
          } else if (fieldName === "System.History") {
            commentText = cleanHtml(String(fieldVal.newValue || ""));
          } else {
            changes.push(fieldName);
          }
        }
        let activityType = "Edit";
        let details = `Changed: ${changes.join(", ")}`;
        if (update.fields["System.History"]) {
          activityType = "Comment";
          if (commentText) {
            details = `Comment: ${commentText.substring(0, 300)}`;
          }
        }
        activities.push({
          target: target.name,
          date: update.revisedDate,
          workItemId: String(item.id),
          workItemType: wiType,
          state: wiState,
          areaPath: wiArea,
          title: wiTitle,
          activityType,
          details,
          actor: revisedByName
        });
      }
      if (update.fields) {
        for (const [fieldName, fieldVal] of Object.entries(update.fields)) {
          const newValue = fieldVal.newValue;
          if (fieldName === "System.AssignedTo") {
            let assigneeMatch = false;
            if (typeof newValue === "object" && newValue !== null) {
              const assignee = newValue;
              assigneeMatch = isMatch(target, assignee.displayName || "", assignee.uniqueName || "");
            } else if (typeof newValue === "string") {
              assigneeMatch = isMatch(target, newValue, newValue);
            }
            if (assigneeMatch) {
              activities.push({
                target: target.name,
                date: update.revisedDate,
                workItemId: String(item.id),
                workItemType: wiType,
                state: wiState,
                areaPath: wiArea,
                title: wiTitle,
                activityType: "AssignedTo",
                details: `Assigned to ${target.name} by ${revisedByName}`,
                actor: revisedByName
              });
            }
          }
          if (typeof newValue === "string" && fieldName !== "System.AssignedTo") {
            const nameInText = target.name && newValue.toLowerCase().includes(target.name.toLowerCase());
            const emailInText = target.email && newValue.toLowerCase().includes(target.email.toLowerCase());
            if ((nameInText || emailInText) && !isMatch(target, revisedByName, revisedByEmail)) {
              const cleanVal = cleanHtml(newValue);
              const mentionType = classifyMention(cleanVal);
              activities.push({
                target: target.name,
                date: update.revisedDate,
                workItemId: String(item.id),
                workItemType: wiType,
                state: wiState,
                areaPath: wiArea,
                title: wiTitle,
                activityType: mentionType,
                details: `Mentioned in ${fieldName}: ${cleanVal}`,
                actor: revisedByName
              });
            }
          }
        }
      }
      if (update.relations?.added) {
        for (const link of update.relations.added) {
          const comment = link.attributes?.comment || "";
          if (comment && target.name && comment.toLowerCase().includes(target.name.toLowerCase())) {
            if (!isMatch(target, revisedByName, revisedByEmail)) {
              const mentionType = classifyMention(comment);
              activities.push({
                target: target.name,
                date: update.revisedDate,
                workItemId: String(item.id),
                workItemType: wiType,
                state: wiState,
                areaPath: wiArea,
                title: wiTitle,
                activityType: mentionType,
                details: `Mentioned in link comment: ${comment}`,
                actor: revisedByName
              });
            }
          }
        }
      }
    }
  }
  return activities;
}
async function writeCsvReport(activities, targetName, outputDir, timestamp) {
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:writeCsvReport:entry", message: "writeCsvReport called", data: { activitiesCount: activities.length, targetName, outputDir, timestamp }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2-H3" }) }).catch(() => {
  });
  if (!existsSync(outputDir)) {
    fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:writeCsvReport:mkdir", message: "Creating output directory", data: { outputDir }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H3" }) }).catch(() => {
    });
    mkdirSync(outputDir, { recursive: true });
  }
  const safeName = targetName.toLowerCase().replace(/\s+/g, "-");
  const filename = `${safeName}-activity-${timestamp}.csv`;
  const filepath = join(outputDir, filename);
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:writeCsvReport:filepath", message: "Resolved filepath", data: { filepath, cwd: process.cwd() }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H3" }) }).catch(() => {
  });
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const stream = createWriteStream(filepath, { encoding: "utf-8" });
  stream.on("error", (err) => {
    fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:writeCsvReport:streamError", message: "Stream error occurred", data: { error: String(err), filepath }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H5" }) }).catch(() => {
    });
  });
  const headers = [
    "Date",
    "WorkItemId",
    "PRNumber",
    "WorkItemType",
    "State",
    "AreaPath",
    "Title",
    "ActivityType",
    "Details",
    "Actor"
  ];
  stream.write(headers.join(",") + "\n");
  for (const activity of activities) {
    const row = [
      activity.date,
      activity.workItemId,
      activity.prNumber || "",
      activity.workItemType,
      activity.state,
      `"${activity.areaPath.replace(/"/g, '""')}"`,
      `"${activity.title.replace(/"/g, '""')}"`,
      activity.activityType,
      `"${activity.details.replace(/"/g, '""').substring(0, 500)}"`,
      activity.actor
    ];
    stream.write(row.join(",") + "\n");
  }
  return new Promise((resolve, reject) => {
    stream.on("finish", () => {
      fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:writeCsvReport:finish", message: "Stream finished successfully", data: { filepath, activitiesWritten: activities.length }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H1" }) }).catch(() => {
      });
      resolve(filepath);
    });
    stream.on("error", reject);
    stream.end();
  });
}
async function processWorkItemsBatch(conn, items, targets, cutoffDate, concurrency = 100) {
  const allActivities = [];
  let processed = 0;
  let errors = 0;
  let skipped = 0;
  const total = items.length;
  const startTime = Date.now();
  let lastReportTime = startTime;
  const rateHistory = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchStart = Date.now();
    const batchPromises = batch.map(
      (item) => processWorkItem(conn, item, targets, cutoffDate).then((activities) => ({ success: true, activities, error: null })).catch((error) => ({ success: false, activities: [], error }))
    );
    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      if (result.success) {
        allActivities.push(...result.activities);
        if (result.activities.length === 0) {
          skipped++;
        }
      } else {
        errors++;
      }
    }
    processed += batch.length;
    const batchElapsed = (Date.now() - batchStart) / 1e3;
    const batchRate = batch.length / batchElapsed;
    rateHistory.push(batchRate);
    if (rateHistory.length > 10) rateHistory.shift();
    const now = Date.now();
    if (processed === total || now - lastReportTime > 1e4) {
      const elapsed2 = (now - startTime) / 1e3;
      const avgRate2 = rateHistory.reduce((a, b) => a + b, 0) / rateHistory.length;
      const remaining = (total - processed) / avgRate2;
      const pct = (processed / total * 100).toFixed(1);
      const eta = new Date(Date.now() + remaining * 1e3).toLocaleTimeString();
      logInfo(`Progress: ${processed}/${total} (${pct}%) | Rate: ${avgRate2.toFixed(0)}/sec | ETA: ${eta} | Activities: ${allActivities.length} | Errors: ${errors}`);
      lastReportTime = now;
    }
  }
  const elapsed = (Date.now() - startTime) / 1e3;
  const avgRate = processed / elapsed;
  logInfo(`--- Processing Complete ---`);
  logInfo(`  Total work items: ${total}`);
  logInfo(`  Processed successfully: ${processed - errors}`);
  logInfo(`  Errors: ${errors} (${(errors / total * 100).toFixed(1)}%)`);
  logInfo(`  Items with activity: ${processed - errors - skipped}`);
  logInfo(`  Activities found: ${allActivities.length}`);
  logInfo(`  Duration: ${formatDuration(elapsed)}`);
  logInfo(`  Average rate: ${avgRate.toFixed(0)} items/sec`);
  return allActivities;
}
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor(seconds % 3600 / 60);
    return `${hrs}h ${mins}m`;
  }
}
async function fetchWikiActivities(conn, target, startDate, endDate) {
  const activities = [];
  try {
    const gitApi = await conn.getGitApi();
    const commits = await gitApi.getCommits(
      WIKI_REPO_ID,
      {
        author: target.name,
        fromDate: startDate,
        toDate: endDate
      },
      conn.project
    );
    if (!commits || commits.length === 0) {
      logInfo(`  No wiki commits found for ${target.name}`);
      return activities;
    }
    logInfo(`  Found ${commits.length} wiki commits for ${target.name}`);
    for (const commit of commits) {
      const commitId = commit.commitId?.substring(0, 8) || "unknown";
      const comment = commit.comment?.trim() || "Wiki commit";
      const authorDate = commit.author?.date;
      const changeCounts = commit.changeCounts || { Add: 0, Edit: 0, Delete: 0 };
      let activityType = "WikiEdit";
      if (comment.toLowerCase().startsWith("added")) {
        activityType = "WikiCreate";
      } else if (comment.toLowerCase().includes("page move") || comment.toLowerCase().includes("rename")) {
        activityType = "WikiMove";
      } else if (changeCounts.Delete > 0 && changeCounts.Add === 0 && changeCounts.Edit === 0) {
        activityType = "WikiDelete";
      }
      activities.push({
        target: target.name,
        date: authorDate?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        workItemId: `Wiki:${commitId}`,
        workItemType: "Wiki",
        state: "",
        areaPath: "Wiki",
        title: comment.substring(0, 100),
        activityType,
        details: `Changes: +${changeCounts.Add} ~${changeCounts.Edit} -${changeCounts.Delete}`,
        actor: target.name
      });
    }
  } catch (error) {
    logWarn(`Failed to fetch wiki commits for ${target.name}: ${error}`);
  }
  return activities;
}
async function fetchPRActivities(conn, target, startDate, endDate) {
  const activities = [];
  try {
    const gitApi = await conn.getGitApi();
    const repos = await gitApi.getRepositories(conn.project);
    if (!repos) return activities;
    const activeRepos = repos.filter((r) => !r.isDisabled);
    logInfo(`  Scanning ${activeRepos.length} repositories for PR activity...`);
    const processedPRs = /* @__PURE__ */ new Set();
    for (const repo of activeRepos) {
      if (!repo.id) continue;
      try {
        const prs = await gitApi.getPullRequests(repo.id, {
          status: 4
          // All statuses
        }, conn.project, void 0, void 0, 50);
        if (!prs) continue;
        for (const pr of prs) {
          if (!pr.pullRequestId || processedPRs.has(pr.pullRequestId)) continue;
          const creationDate = pr.creationDate ? new Date(pr.creationDate) : null;
          const closedDate = pr.closedDate ? new Date(pr.closedDate) : null;
          const inRange = creationDate && creationDate >= startDate && creationDate <= endDate || closedDate && closedDate >= startDate && closedDate <= endDate;
          if (!inRange) continue;
          const prLink = `https://dev.azure.com/UMGC/${conn.project}/_git/${repo.name}/pullrequest/${pr.pullRequestId}`;
          const createdByName = pr.createdBy?.displayName || "";
          const createdByEmail = pr.createdBy?.uniqueName || "";
          if (isMatch(target, createdByName, createdByEmail) && creationDate && creationDate >= startDate) {
            processedPRs.add(pr.pullRequestId);
            activities.push({
              target: target.name,
              date: creationDate.toISOString(),
              workItemId: "",
              prNumber: String(pr.pullRequestId),
              workItemType: "PullRequest",
              state: "",
              areaPath: "Git",
              title: pr.title || "Pull Request",
              activityType: "PRCreated",
              details: `Created PR in ${repo.name}`,
              actor: target.name,
              link: prLink
            });
          }
          if (pr.reviewers) {
            for (const reviewer of pr.reviewers) {
              const reviewerName = reviewer.displayName || "";
              const reviewerEmail = reviewer.uniqueName || "";
              const vote = reviewer.vote || 0;
              if (isMatch(target, reviewerName, reviewerEmail) && vote !== 0) {
                let activityType;
                let details;
                if (vote === 10) {
                  activityType = "PRApproved";
                  details = `Approved PR in ${repo.name}`;
                } else if (vote === 5) {
                  activityType = "PRApprovedWithSuggestions";
                  details = `Approved with suggestions PR in ${repo.name}`;
                } else if (vote === -5) {
                  activityType = "PRWaitingOnAuthor";
                  details = `Requested changes on PR in ${repo.name}`;
                } else if (vote === -10) {
                  activityType = "PRRejected";
                  details = `Rejected PR in ${repo.name}`;
                } else {
                  continue;
                }
                const voteDate = closedDate || creationDate;
                if (voteDate) {
                  activities.push({
                    target: target.name,
                    date: voteDate.toISOString(),
                    workItemId: "",
                    prNumber: String(pr.pullRequestId),
                    workItemType: "PullRequest",
                    state: "",
                    areaPath: "Git",
                    title: pr.title || "Pull Request",
                    activityType,
                    details,
                    actor: target.name,
                    link: prLink
                  });
                }
              }
            }
          }
        }
      } catch (repoError) {
        continue;
      }
    }
    logInfo(`  Found ${activities.length} PR activities for ${target.name}`);
  } catch (error) {
    logWarn(`Failed to fetch PR activities for ${target.name}: ${error}`);
  }
  return activities;
}
async function generateActivityReport(options) {
  const {
    people,
    days,
    outputDir = "reports",
    fast = false,
    full = false,
    includeWiki = true,
    includePullRequests = true
  } = options;
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:entry", message: "generateActivityReport called", data: { peopleCount: people.length, people: people.map((p) => p.name), days, outputDir, fast, full, includeWiki, includePullRequests, cwd: process.cwd() }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2-H4" }) }).catch(() => {
  });
  if (people.length === 0) {
    fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:noPeople", message: "No people specified - early return", data: {}, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2" }) }).catch(() => {
    });
    return {
      success: false,
      message: "No people specified for report",
      files: [],
      activityCounts: {},
      totalActivities: 0
    };
  }
  const startTime = Date.now();
  logInfo(`Generating activity report for ${people.length} people, last ${days} days`);
  let mode;
  if (fast) {
    mode = "fast";
  } else {
    mode = "full";
  }
  const modeDescriptions = {
    fast: "FAST (targeted only, ~20s, ~45% coverage)",
    hybrid: "HYBRID (targeted + search, ~50s, ~90% coverage)",
    full: "FULL (comprehensive scan, ~5min, 100% coverage)"
  };
  logInfo(`Mode: ${modeDescriptions[mode]}`);
  for (const p of people) {
    logInfo(`  - ${p.name} (${p.email})`);
  }
  const conn = await createAdoConnection();
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const endDate = /* @__PURE__ */ new Date();
  let workItems;
  if (mode === "fast") {
    workItems = await fetchTargetedWorkItems(conn, people, days);
  } else {
    workItems = await fetchRecentWorkItems(conn, days);
  }
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:afterFetchWorkItems", message: "Work items fetched", data: { workItemsCount: workItems.length, mode, sampleIds: workItems.slice(0, 5).map((w) => w.id) }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H4" }) }).catch(() => {
  });
  const activitiesByTarget = {};
  for (const p of people) {
    activitiesByTarget[p.name] = [];
  }
  const concurrency = mode === "fast" ? 100 : 150;
  const workItemPromise = workItems.length > 0 ? (logInfo(`Processing ${workItems.length} work items with ${concurrency} concurrent requests...`), processWorkItemsBatch(conn, workItems, people, cutoffDate, concurrency)) : Promise.resolve([]);
  const wikiPromise = includeWiki ? (logInfo("Fetching wiki activities in parallel..."), Promise.all(people.map((target) => fetchWikiActivities(conn, target, cutoffDate, endDate)))) : Promise.resolve(people.map(() => []));
  const prPromise = includePullRequests ? (logInfo("Fetching PR activities in parallel..."), Promise.all(people.map((target) => fetchPRActivities(conn, target, cutoffDate, endDate)))) : Promise.resolve(people.map(() => []));
  const [workItemActivities, wikiResults, prResults] = await Promise.all([
    workItemPromise,
    wikiPromise,
    prPromise
  ]);
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:afterPromiseAll", message: "All activity fetches completed", data: { workItemActivitiesCount: workItemActivities.length, wikiResultsCounts: wikiResults.map((r) => r.length), prResultsCounts: prResults.map((r) => r.length) }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2-H4" }) }).catch(() => {
  });
  for (const activity of workItemActivities) {
    if (!activitiesByTarget[activity.target]) {
      activitiesByTarget[activity.target] = [];
    }
    activitiesByTarget[activity.target].push(activity);
  }
  for (let i = 0; i < people.length; i++) {
    activitiesByTarget[people[i].name].push(...wikiResults[i]);
  }
  for (let i = 0; i < people.length; i++) {
    activitiesByTarget[people[i].name].push(...prResults[i]);
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const files = [];
  const activityCounts = {};
  let totalActivities = 0;
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:beforeWriteCsv", message: "About to write CSV files", data: { activitiesByTargetKeys: Object.keys(activitiesByTarget), activitiesByTargetCounts: Object.fromEntries(Object.entries(activitiesByTarget).map(([k, v]) => [k, v.length])), outputDir }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2" }) }).catch(() => {
  });
  for (const [targetName, activities] of Object.entries(activitiesByTarget)) {
    fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:loopIteration", message: "Processing target for CSV", data: { targetName, activitiesLength: activities.length, willWrite: activities.length > 0 }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2" }) }).catch(() => {
    });
    if (activities.length > 0) {
      const filepath = await writeCsvReport(activities, targetName, outputDir, timestamp);
      files.push(filepath);
      activityCounts[targetName] = activities.length;
      totalActivities += activities.length;
    }
  }
  fetch("http://127.0.0.1:7242/ingest/2c547237-6ce5-425f-96fd-6cbcdeebd57b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "adoActivityReport.ts:generateActivityReport:afterWriteCsv", message: "Finished writing CSV files", data: { filesWritten: files, totalActivities }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H1-H2" }) }).catch(() => {
  });
  const activityTypeBreakdown = {};
  for (const activities of Object.values(activitiesByTarget)) {
    for (const activity of activities) {
      activityTypeBreakdown[activity.activityType] = (activityTypeBreakdown[activity.activityType] || 0) + 1;
    }
  }
  const wikiCount = wikiResults.reduce((sum, arr) => sum + arr.length, 0);
  const prCount = prResults.reduce((sum, arr) => sum + arr.length, 0);
  const workItemCount = workItemActivities.length;
  const elapsed = (Date.now() - startTime) / 1e3;
  logInfo("");
  logInfo("========================================");
  logInfo("         ACTIVITY REPORT SUMMARY        ");
  logInfo("========================================");
  logInfo(`Date Range: ${cutoffDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
  logInfo(`Mode: ${modeDescriptions[mode]}`);
  logInfo("");
  logInfo("--- Sources ---");
  logInfo(`  Work Items: ${workItemCount} activities`);
  logInfo(`  Wiki: ${wikiCount} activities`);
  logInfo(`  Pull Requests: ${prCount} activities`);
  logInfo("");
  logInfo("--- Activity Types ---");
  const sortedTypes = Object.entries(activityTypeBreakdown).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = (count / totalActivities * 100).toFixed(1);
    logInfo(`  ${type}: ${count} (${pct}%)`);
  }
  logInfo("");
  logInfo("--- Per Person ---");
  for (const [name, count] of Object.entries(activityCounts)) {
    logInfo(`  ${name}: ${count} activities`);
  }
  logInfo("");
  logInfo("--- Output ---");
  for (const file of files) {
    logInfo(`  ${file}`);
  }
  logInfo("");
  logInfo(`Total: ${totalActivities} activities`);
  logInfo(`Duration: ${formatDuration(elapsed)}`);
  logInfo("========================================");
  return {
    success: true,
    message: `Generated ${files.length} report(s) with ${totalActivities} total activities in ${formatDuration(elapsed)}`,
    files,
    activityCounts,
    totalActivities
  };
}
function parsePerson(input) {
  if (input.includes("|")) {
    const [name, email] = input.split("|");
    return { name: name.trim(), email: email.trim() };
  }
  return { name: input.trim(), email: "" };
}

// cli/report-tools.ts
var program = new Command();
program.name("report-tools").description("Azure DevOps activity report generation tool").version("2.0.0");
program.command("activity").description("Generate comprehensive activity report for specified users").requiredOption(
  "-p, --people <people...>",
  'People to track in format "Name|email@domain.com"'
).option("-d, --days <days>", "Number of days to look back", "30").option("-o, --output <dir>", "Output directory for reports", "reports").option("--no-wiki", "Exclude wiki activities").option("--no-prs", "Exclude pull request activities").option("--fast", "Fast mode (~20s) - only direct activity, may miss mentions from others").option("--json", "Output result as JSON (suppresses progress output)").option("-q, --quiet", "Quiet mode - minimal output").option("-v, --verbose", "Verbose output with debug information").action(async (options) => {
  const startTime = Date.now();
  try {
    if (options.json || options.quiet) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ minLevel: "info" });
    }
    const people = options.people.map((p) => parsePerson(p));
    if (people.length === 0) {
      console.error("Error: At least one person must be specified");
      console.error('Usage: report-tools activity --people "Name|email@domain.com"');
      process.exit(1);
    }
    const days = parseInt(options.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      console.error("Error: --days must be a number between 1 and 365");
      process.exit(1);
    }
    const result = await generateActivityReport({
      people,
      days,
      outputDir: options.output,
      includeWiki: options.wiki !== false,
      includePullRequests: options.prs !== false,
      fast: options.fast
    });
    if (options.json) {
      console.log(JSON.stringify({
        ...result,
        durationMs: Date.now() - startTime
      }, null, 2));
    } else if (!options.quiet) {
      console.log("");
    }
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : void 0;
    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        message: errorMessage,
        error: {
          name: error instanceof Error ? error.name : "Error",
          message: errorMessage,
          stack: errorStack
        },
        files: [],
        activityCounts: {},
        totalActivities: 0,
        durationMs: Date.now() - startTime
      }, null, 2));
    } else {
      console.error("\n========================================");
      console.error("              ERROR                     ");
      console.error("========================================");
      console.error(`Message: ${errorMessage}`);
      if (options.verbose && errorStack) {
        console.error("\nStack trace:");
        console.error(errorStack);
      }
      console.error("========================================");
      console.error("\nTroubleshooting:");
      console.error("  1. Ensure you are logged in: az login");
      console.error("  2. Check Azure DevOps access: az account show");
      console.error("  3. Verify the person name matches ADO exactly");
      console.error("  4. Run with --verbose for more details");
    }
    process.exit(1);
  }
});
program.addHelpText("after", `
Examples:
  $ report-tools activity --people "John Doe|john.doe@company.com" --days 30
  $ report-tools activity --people "John Doe|john@co.com" "Jane Doe|jane@co.com" --days 7
  $ report-tools activity --people "John Doe|john@co.com" --fast
  $ report-tools activity --people "John Doe|john@co.com" --json > report.json

Modes:
  Default (no flag)  Full scan, ~5min, 100% accuracy - scans all work items
  --fast             Fast mode, ~20s, ~45% accuracy - only direct activity

Output:
  CSV file with columns: Date, WorkItemId, PRNumber, WorkItemType, State,
  AreaPath, Title, ActivityType, Details, Actor
`);
program.parse();
//# sourceMappingURL=report-tools.js.map