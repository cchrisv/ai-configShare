#!/usr/bin/env node

// cli/ado-tools.ts
import { Command } from "commander";
import { readFileSync } from "fs";

// src/adoWorkItems.ts
import { Operation } from "azure-devops-node-api/interfaces/common/VSSInterfaces.js";

// src/adoClient.ts
import * as azdev from "azure-devops-node-api";

// src/lib/authAzureCli.ts
import { execSync } from "child_process";

// src/types/adoFieldTypes.ts
var ADO_RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";
var DEFAULT_ADO_ORG = "https://dev.azure.com/UMGC";
var DEFAULT_ADO_PROJECT = "Digital Platforms";
var ADO_FIELDS = {
  // System fields
  ID: "System.Id",
  TITLE: "System.Title",
  DESCRIPTION: "System.Description",
  STATE: "System.State",
  REASON: "System.Reason",
  AREA_PATH: "System.AreaPath",
  ITERATION_PATH: "System.IterationPath",
  WORK_ITEM_TYPE: "System.WorkItemType",
  ASSIGNED_TO: "System.AssignedTo",
  CREATED_BY: "System.CreatedBy",
  CREATED_DATE: "System.CreatedDate",
  CHANGED_BY: "System.ChangedBy",
  CHANGED_DATE: "System.ChangedDate",
  TAGS: "System.Tags",
  HISTORY: "System.History",
  // Microsoft VSTS Common fields
  STORY_POINTS: "Microsoft.VSTS.Scheduling.StoryPoints",
  PRIORITY: "Microsoft.VSTS.Common.Priority",
  SEVERITY: "Microsoft.VSTS.Common.Severity",
  VALUE_AREA: "Microsoft.VSTS.Common.ValueArea",
  RISK: "Microsoft.VSTS.Common.Risk",
  ACCEPTANCE_CRITERIA: "Microsoft.VSTS.Common.AcceptanceCriteria",
  // Microsoft VSTS TCM fields (Bug-specific)
  REPRO_STEPS: "Microsoft.VSTS.TCM.ReproSteps",
  SYSTEM_INFO: "Microsoft.VSTS.TCM.SystemInfo",
  // Custom fields
  WORK_CLASS_TYPE: "Custom.WorkClassType",
  REQUIRES_QA: "Custom.RequiresQA",
  SF_COMPONENTS: "Custom.SFComponents",
  TECHNICAL_NOTES: "Custom.TechnicalNotes",
  ROOT_CAUSE_DETAIL: "Custom.RootCauseDetail"
};

// src/lib/authAzureCli.ts
var tokenCache = null;
var TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1e3;
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

// src/lib/loggerStructured.ts
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
function logError(message, data, context) {
  if (!shouldLog("error")) return;
  const entry = createEntry("error", message, data, context);
  output("error", formatEntry(entry));
}
function createTimer() {
  const startTime = Date.now();
  return {
    elapsed: () => Date.now() - startTime,
    elapsedSeconds: () => (Date.now() - startTime) / 1e3,
    log: (operation, level = "info") => {
      const duration = Date.now() - startTime;
      const message = `${operation} completed in ${duration}ms`;
      const context = { operation, duration };
      switch (level) {
        case "debug":
          logDebug(message, void 0, context);
          break;
        case "info":
          logInfo(message, void 0, context);
          break;
        case "warn":
          logWarn(message, void 0, context);
          break;
        case "error":
          logError(message, void 0, context);
          break;
      }
    }
  };
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

// src/lib/retryWithBackoff.ts
var DEFAULT_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1e3,
  maxDelayMs: 3e4,
  backoffMultiplier: 2,
  jitterFactor: 0.1
};
function exponentialDelay(attempt, initialDelayMs, backoffMultiplier, maxDelayMs, jitterFactor) {
  const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(baseDelay, maxDelayMs);
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(cappedDelay + jitter));
}
function defaultIsRetryable(error) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    if (message.includes("network") || message.includes("timeout") || message.includes("econnreset") || message.includes("econnrefused") || message.includes("socket hang up")) {
      return true;
    }
    if (message.includes("rate limit") || message.includes("too many requests") || message.includes("429")) {
      return true;
    }
    if (message.includes("502") || message.includes("503") || message.includes("504") || message.includes("service unavailable") || message.includes("internal server error")) {
      return true;
    }
    if (name.includes("transient") || message.includes("temporarily")) {
      return true;
    }
  }
  if (typeof error === "object" && error !== null) {
    const statusCode = error["statusCode"] ?? error["status"];
    if (typeof statusCode === "number") {
      return [429, 502, 503, 504].includes(statusCode);
    }
  }
  return false;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    jitterFactor = DEFAULT_OPTIONS.jitterFactor,
    isRetryable = defaultIsRetryable,
    onRetry,
    operationName = "operation"
  } = options;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      logDebug(`${operationName}: attempt ${attempt}/${maxRetries + 1}`);
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt > maxRetries) {
        logError(`${operationName}: all ${maxRetries} retries exhausted`, {
          error: error instanceof Error ? error.message : String(error)
        });
        break;
      }
      if (!isRetryable(error)) {
        logError(`${operationName}: non-retryable error`, {
          error: error instanceof Error ? error.message : String(error)
        });
        break;
      }
      const delayMs = exponentialDelay(
        attempt,
        initialDelayMs,
        backoffMultiplier,
        maxDelayMs,
        jitterFactor
      );
      logWarn(`${operationName}: attempt ${attempt} failed, retrying in ${delayMs}ms`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        delayMs
      });
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }
      await sleep(delayMs);
    }
  }
  throw lastError;
}
var RETRY_PRESETS = {
  /** Quick retry for transient network issues */
  quick: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 2e3,
    backoffMultiplier: 2
  },
  /** Standard retry for API calls */
  standard: {
    maxRetries: 3,
    initialDelayMs: 1e3,
    maxDelayMs: 1e4,
    backoffMultiplier: 2
  },
  /** Aggressive retry for critical operations */
  aggressive: {
    maxRetries: 5,
    initialDelayMs: 1e3,
    maxDelayMs: 6e4,
    backoffMultiplier: 2
  },
  /** Rate limit specific retry (longer delays) */
  rateLimit: {
    maxRetries: 3,
    initialDelayMs: 5e3,
    maxDelayMs: 6e4,
    backoffMultiplier: 3
  }
};

// src/lib/validationSchemas.ts
import { z } from "zod";
var WorkClassTypeSchema = z.enum([
  "Critical/Escalation",
  "Development",
  "Fixed Date Delivery",
  "Maintenance/Recurring Tasks",
  "Standard"
]);
var RequiresQASchema = z.enum(["Yes", "No"]);
var PrioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4)
]);
var WorkItemTypeSchema = z.enum([
  "User Story",
  "Task",
  "Bug",
  "Feature",
  "Epic",
  "Issue",
  "Test Case",
  "Test Plan",
  "Test Suite"
]);
var LinkTypeAliasSchema = z.enum([
  "parent",
  "child",
  "related",
  "predecessor",
  "successor",
  "duplicate",
  "affects"
]);
var WorkItemFieldsSchema = z.object({
  // System fields
  "System.Title": z.string().optional(),
  "System.Description": z.string().optional(),
  "System.State": z.string().optional(),
  "System.AreaPath": z.string().optional(),
  "System.IterationPath": z.string().optional(),
  "System.AssignedTo": z.string().optional(),
  "System.Tags": z.string().optional(),
  // Microsoft VSTS Common fields
  "Microsoft.VSTS.Scheduling.StoryPoints": z.number().optional(),
  "Microsoft.VSTS.Common.Priority": PrioritySchema.optional(),
  "Microsoft.VSTS.Common.AcceptanceCriteria": z.string().optional(),
  // Microsoft VSTS TCM fields (Bug-specific)
  "Microsoft.VSTS.TCM.ReproSteps": z.string().optional(),
  "Microsoft.VSTS.TCM.SystemInfo": z.string().optional(),
  // Custom fields
  "Custom.WorkClassType": WorkClassTypeSchema.optional(),
  "Custom.RequiresQA": RequiresQASchema.optional(),
  "Custom.SFComponents": z.string().optional(),
  "Custom.TechnicalNotes": z.string().optional(),
  "Custom.RootCauseDetail": z.string().optional()
}).passthrough();
var GetWorkItemOptionsSchema = z.object({
  expand: z.enum(["None", "Relations", "Fields", "Links", "All"]).optional(),
  includeComments: z.boolean().optional(),
  fields: z.array(z.string()).optional()
});
var CreateWorkItemOptionsSchema = z.object({
  type: WorkItemTypeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  parentId: z.number().positive().optional(),
  areaPath: z.string().optional(),
  iterationPath: z.string().optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  additionalFields: WorkItemFieldsSchema.optional()
});
var UpdateWorkItemOptionsSchema = z.object({
  fields: WorkItemFieldsSchema.optional(),
  comment: z.string().optional()
});
var SearchWorkItemsOptionsSchema = z.object({
  searchText: z.string().optional(),
  wiql: z.string().optional(),
  workItemType: WorkItemTypeSchema.optional(),
  state: z.string().optional(),
  assignedTo: z.string().optional(),
  areaPath: z.string().optional(),
  iterationPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  top: z.number().positive().optional()
});
var LinkWorkItemsOptionsSchema = z.object({
  sourceId: z.number().positive(),
  targetId: z.number().positive(),
  linkType: LinkTypeAliasSchema,
  comment: z.string().optional()
});
var QueryOptionsSchema = z.object({
  query: z.string().min(1),
  useToolingApi: z.boolean().optional(),
  allRows: z.boolean().optional(),
  maxRecords: z.number().positive().optional()
});
var MetadataTypeSchema = z.enum([
  "CustomObject",
  "CustomField",
  "ApexClass",
  "ApexTrigger",
  "ApexPage",
  "ApexComponent",
  "AuraDefinitionBundle",
  "LightningComponentBundle",
  "Flow",
  "FlowDefinition",
  "ValidationRule",
  "WorkflowRule",
  "WorkflowFieldUpdate",
  "WorkflowAlert",
  "ProcessBuilder",
  "CustomMetadataType",
  "CustomSetting",
  "CustomLabel",
  "Layout",
  "RecordType",
  "FieldSet",
  "CompactLayout",
  "ListView",
  "Report",
  "Dashboard",
  "PermissionSet",
  "Profile",
  "Unknown"
]);
var DiscoverDependenciesOptionsSchema = z.object({
  rootType: MetadataTypeSchema,
  rootName: z.string().min(1),
  maxDepth: z.number().positive().optional(),
  includeStandardObjects: z.boolean().optional(),
  includeNamespaced: z.boolean().optional(),
  excludeTypes: z.array(MetadataTypeSchema).optional(),
  parallelQueries: z.number().positive().optional()
});
var WorkflowStatusSchema = z.enum([
  "pending",
  "in_progress",
  "paused",
  "completed",
  "failed",
  "cancelled"
]);
var WorkflowExecutionOptionsSchema = z.object({
  workItemId: z.number().positive(),
  phases: z.array(z.string()).optional(),
  steps: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
  verbose: z.boolean().optional(),
  continueOnError: z.boolean().optional()
});
function validate(schema, data) {
  return schema.parse(data);
}

// src/adoWorkItems.ts
function convertWorkItem(item) {
  return {
    id: item.id ?? 0,
    rev: item.rev ?? 0,
    url: item.url ?? "",
    fields: item.fields ?? {},
    relations: item.relations?.map((r) => ({
      rel: r.rel ?? "",
      url: r.url ?? "",
      attributes: r.attributes ?? {}
    })) ?? [],
    _links: item._links
  };
}
function mapExpandOption(expand) {
  if (!expand) return void 0;
  const expandMap = {
    "None": 0,
    "Relations": 1,
    "Fields": 2,
    "Links": 3,
    "All": 4
  };
  return expandMap[expand];
}
async function getWorkItem(id, options = {}, config2) {
  const timer = createTimer();
  const validatedOptions = validate(GetWorkItemOptionsSchema, options);
  logInfo(`Getting work item ${id}`, { expand: validatedOptions.expand });
  const conn = await createAdoConnection(config2);
  const witApi = await conn.getWorkItemTrackingApi();
  const workItem = await retryWithBackoff(
    () => witApi.getWorkItem(
      id,
      validatedOptions.fields,
      void 0,
      mapExpandOption(validatedOptions.expand),
      conn.project
    ),
    { ...RETRY_PRESETS.standard, operationName: `getWorkItem(${id})` }
  );
  if (!workItem) {
    throw new Error(`Work item ${id} not found`);
  }
  const result = convertWorkItem(workItem);
  if (validatedOptions.includeComments) {
    logDebug(`Fetching comments for work item ${id}`);
    const comments = await retryWithBackoff(
      () => witApi.getComments(conn.project, id),
      { ...RETRY_PRESETS.standard, operationName: `getComments(${id})` }
    );
    result.comments = comments.comments?.map((c) => ({
      id: c.id ?? 0,
      workItemId: c.workItemId ?? id,
      text: c.text ?? "",
      createdBy: {
        displayName: c.createdBy?.displayName ?? "",
        url: c.createdBy?.url ?? "",
        id: c.createdBy?.id ?? "",
        uniqueName: c.createdBy?.uniqueName ?? ""
      },
      createdDate: c.createdDate?.toISOString() ?? "",
      format: "html"
    })) ?? [];
  }
  timer.log(`getWorkItem(${id})`);
  return result;
}
async function updateWorkItem(id, options, config2) {
  const timer = createTimer();
  const validatedOptions = validate(UpdateWorkItemOptionsSchema, options);
  logInfo(`Updating work item ${id}`);
  const patchDoc = [];
  if (validatedOptions.fields) {
    for (const [key, value] of Object.entries(validatedOptions.fields)) {
      if (value !== void 0) {
        patchDoc.push({
          op: Operation.Add,
          path: `/fields/${key}`,
          value
        });
      }
    }
  }
  if (validatedOptions.comment) {
    patchDoc.push({
      op: Operation.Add,
      path: `/fields/${ADO_FIELDS.HISTORY}`,
      value: validatedOptions.comment
    });
  }
  if (patchDoc.length === 0) {
    logDebug("No updates to apply");
    return getWorkItem(id, {}, config2);
  }
  logDebug(`Applying ${patchDoc.length} patch operations`);
  const conn = await createAdoConnection(config2);
  const witApi = await conn.getWorkItemTrackingApi();
  const updatedItem = await retryWithBackoff(
    () => witApi.updateWorkItem(
      void 0,
      // customHeaders
      patchDoc,
      id,
      conn.project
    ),
    { ...RETRY_PRESETS.standard, operationName: `updateWorkItem(${id})` }
  );
  if (!updatedItem) {
    throw new Error(`Failed to update work item ${id}`);
  }
  timer.log(`updateWorkItem(${id})`);
  return convertWorkItem(updatedItem);
}
async function createWorkItem(options, config2) {
  const timer = createTimer();
  const validatedOptions = validate(CreateWorkItemOptionsSchema, options);
  logInfo(`Creating ${validatedOptions.type} work item: ${validatedOptions.title}`);
  const patchDoc = [];
  patchDoc.push({
    op: Operation.Add,
    path: `/fields/${ADO_FIELDS.TITLE}`,
    value: validatedOptions.title
  });
  if (validatedOptions.description) {
    patchDoc.push({
      op: Operation.Add,
      path: `/fields/${ADO_FIELDS.DESCRIPTION}`,
      value: validatedOptions.description
    });
  }
  if (validatedOptions.areaPath) {
    patchDoc.push({
      op: Operation.Add,
      path: `/fields/${ADO_FIELDS.AREA_PATH}`,
      value: validatedOptions.areaPath
    });
  }
  if (validatedOptions.iterationPath) {
    patchDoc.push({
      op: Operation.Add,
      path: `/fields/${ADO_FIELDS.ITERATION_PATH}`,
      value: validatedOptions.iterationPath
    });
  }
  if (validatedOptions.assignedTo) {
    patchDoc.push({
      op: Operation.Add,
      path: `/fields/${ADO_FIELDS.ASSIGNED_TO}`,
      value: validatedOptions.assignedTo
    });
  }
  if (validatedOptions.tags && validatedOptions.tags.length > 0) {
    patchDoc.push({
      op: Operation.Add,
      path: `/fields/${ADO_FIELDS.TAGS}`,
      value: validatedOptions.tags.join("; ")
    });
  }
  if (validatedOptions.parentId) {
    const conn2 = await createAdoConnection(config2);
    patchDoc.push({
      op: Operation.Add,
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `${conn2.orgUrl}/${conn2.project}/_apis/wit/workItems/${validatedOptions.parentId}`
      }
    });
  }
  if (validatedOptions.additionalFields) {
    for (const [key, value] of Object.entries(validatedOptions.additionalFields)) {
      if (value !== void 0 && !key.startsWith("System.")) {
        patchDoc.push({
          op: Operation.Add,
          path: `/fields/${key}`,
          value
        });
      }
    }
  }
  const conn = await createAdoConnection(config2);
  const witApi = await conn.getWorkItemTrackingApi();
  const createdItem = await retryWithBackoff(
    () => witApi.createWorkItem(
      void 0,
      // customHeaders
      patchDoc,
      conn.project,
      validatedOptions.type
    ),
    { ...RETRY_PRESETS.standard, operationName: "createWorkItem" }
  );
  if (!createdItem) {
    throw new Error("Failed to create work item");
  }
  logInfo(`Created work item ${createdItem.id}`);
  timer.log("createWorkItem");
  return convertWorkItem(createdItem);
}
async function searchWorkItems(options, config2) {
  const timer = createTimer();
  const validatedOptions = validate(SearchWorkItemsOptionsSchema, options);
  logInfo("Searching work items", validatedOptions);
  const conn = await createAdoConnection(config2);
  const witApi = await conn.getWorkItemTrackingApi();
  let wiqlQuery;
  if (validatedOptions.wiql) {
    wiqlQuery = validatedOptions.wiql;
  } else {
    const conditions = [];
    if (validatedOptions.searchText) {
      conditions.push(`[System.Title] CONTAINS '${validatedOptions.searchText}'`);
    }
    if (validatedOptions.workItemType) {
      conditions.push(`[System.WorkItemType] = '${validatedOptions.workItemType}'`);
    }
    if (validatedOptions.state) {
      conditions.push(`[System.State] = '${validatedOptions.state}'`);
    }
    if (validatedOptions.assignedTo) {
      conditions.push(`[System.AssignedTo] = '${validatedOptions.assignedTo}'`);
    }
    if (validatedOptions.areaPath) {
      conditions.push(`[System.AreaPath] UNDER '${validatedOptions.areaPath}'`);
    }
    if (validatedOptions.iterationPath) {
      conditions.push(`[System.IterationPath] UNDER '${validatedOptions.iterationPath}'`);
    }
    if (validatedOptions.tags && validatedOptions.tags.length > 0) {
      for (const tag of validatedOptions.tags) {
        conditions.push(`[System.Tags] CONTAINS '${tag}'`);
      }
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    wiqlQuery = `SELECT [System.Id] FROM WorkItems ${whereClause} ORDER BY [System.ChangedDate] DESC`;
  }
  logDebug("Executing WIQL", { wiql: wiqlQuery });
  const wiql = { query: wiqlQuery };
  const queryResult = await retryWithBackoff(
    () => witApi.queryByWiql(wiql, { project: conn.project }),
    { ...RETRY_PRESETS.standard, operationName: "queryByWiql" }
  );
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    logDebug("No work items found");
    return { workItems: [], count: 0 };
  }
  let ids = queryResult.workItems.map((wi) => wi.id).filter((id) => id !== void 0);
  if (validatedOptions.top && ids.length > validatedOptions.top) {
    ids = ids.slice(0, validatedOptions.top);
  }
  logDebug(`Found ${ids.length} work items, fetching details`);
  const BATCH_SIZE = 200;
  const allWorkItems = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIds = ids.slice(i, i + BATCH_SIZE);
    logDebug(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(ids.length / BATCH_SIZE)} (${batchIds.length} items)`);
    const batchWorkItems = await retryWithBackoff(
      () => witApi.getWorkItems(batchIds, void 0, void 0, void 0, void 0, conn.project),
      { ...RETRY_PRESETS.standard, operationName: `getWorkItems(batch ${Math.floor(i / BATCH_SIZE) + 1})` }
    );
    allWorkItems.push(...batchWorkItems.filter((wi) => wi !== null));
  }
  const results = allWorkItems.map(convertWorkItem);
  timer.log("searchWorkItems");
  return {
    workItems: results,
    count: results.length
  };
}

// src/adoWorkItemLinks.ts
import { Operation as Operation2 } from "azure-devops-node-api/interfaces/common/VSSInterfaces.js";

// src/types/adoLinkTypes.ts
var LINK_TYPE_MAP = {
  parent: "System.LinkTypes.Hierarchy-Forward",
  child: "System.LinkTypes.Hierarchy-Reverse",
  related: "System.LinkTypes.Related",
  predecessor: "System.LinkTypes.Dependency-Reverse",
  successor: "System.LinkTypes.Dependency-Forward",
  duplicate: "System.LinkTypes.Duplicate-Forward",
  affects: "Microsoft.VSTS.Common.Affects-Forward"
};
var LINK_TYPE_REVERSE_MAP = {
  "System.LinkTypes.Hierarchy-Forward": "parent",
  "System.LinkTypes.Hierarchy-Reverse": "child",
  "System.LinkTypes.Related": "related",
  "System.LinkTypes.Dependency-Reverse": "predecessor",
  "System.LinkTypes.Dependency-Forward": "successor",
  "System.LinkTypes.Duplicate-Forward": "duplicate",
  "System.LinkTypes.Duplicate-Reverse": "duplicate",
  "Microsoft.VSTS.Common.Affects-Forward": "affects",
  "Microsoft.VSTS.Common.Affects-Reverse": "affects"
};
function resolveLinkType(alias) {
  return LINK_TYPE_MAP[alias];
}
function parseLinkType(name) {
  return LINK_TYPE_REVERSE_MAP[name];
}
function extractWorkItemIdFromUrl(url) {
  const match = /\/workItems\/(\d+)$/.exec(url);
  return match ? parseInt(match[1], 10) : void 0;
}

// src/adoWorkItemLinks.ts
async function linkWorkItems(options, config2) {
  const timer = createTimer();
  const validatedOptions = validate(LinkWorkItemsOptionsSchema, options);
  const { sourceId, targetId, linkType, comment } = validatedOptions;
  const linkTypeName = resolveLinkType(linkType);
  logInfo(`Linking work items: ${sourceId} -> ${targetId} (${linkType})`);
  const conn = await createAdoConnection(config2);
  const witApi = await conn.getWorkItemTrackingApi();
  const targetUrl = `${conn.orgUrl}/${conn.project}/_apis/wit/workItems/${targetId}`;
  const patchDoc = [
    {
      op: Operation2.Add,
      path: "/relations/-",
      value: {
        rel: linkTypeName,
        url: targetUrl,
        attributes: comment ? { comment } : {}
      }
    }
  ];
  logDebug(`Adding link: ${linkTypeName} to ${targetUrl}`);
  const updatedItem = await retryWithBackoff(
    () => witApi.updateWorkItem(
      void 0,
      // customHeaders
      patchDoc,
      sourceId,
      conn.project
    ),
    { ...RETRY_PRESETS.standard, operationName: `linkWorkItems(${sourceId}->${targetId})` }
  );
  if (!updatedItem) {
    throw new Error(`Failed to link work items ${sourceId} -> ${targetId}`);
  }
  logInfo(`Successfully linked work items ${sourceId} -> ${targetId}`);
  timer.log(`linkWorkItems(${sourceId}->${targetId})`);
  return {
    id: updatedItem.id ?? 0,
    rev: updatedItem.rev ?? 0,
    url: updatedItem.url ?? "",
    fields: updatedItem.fields ?? {},
    relations: updatedItem.relations?.map((r) => ({
      rel: r.rel ?? "",
      url: r.url ?? "",
      attributes: r.attributes ?? {}
    })) ?? []
  };
}
async function getWorkItemRelations(options, config2) {
  const timer = createTimer();
  const { workItemId, linkTypes } = options;
  logInfo(`Getting relations for work item ${workItemId}`);
  const workItem = await getWorkItem(workItemId, { expand: "Relations" }, config2);
  if (!workItem.relations || workItem.relations.length === 0) {
    logDebug(`Work item ${workItemId} has no relations`);
    return { workItemId, relations: [] };
  }
  const parsedRelations = [];
  for (const relation of workItem.relations) {
    const friendlyType = parseLinkType(relation.rel);
    if (linkTypes && linkTypes.length > 0 && friendlyType && !linkTypes.includes(friendlyType)) {
      continue;
    }
    const targetId = extractWorkItemIdFromUrl(relation.url);
    if (targetId !== void 0) {
      const parsed = {
        targetId,
        linkType: friendlyType ?? "related",
        linkTypeName: relation.rel,
        url: relation.url
      };
      const commentValue = relation.attributes?.comment;
      if (typeof commentValue === "string") {
        parsed.comment = commentValue;
      }
      parsedRelations.push(parsed);
    }
  }
  logDebug(`Found ${parsedRelations.length} relations for work item ${workItemId}`);
  timer.log(`getWorkItemRelations(${workItemId})`);
  return { workItemId, relations: parsedRelations };
}

// cli/ado-tools.ts
var program = new Command();
program.name("ado-tools").description("Azure DevOps work item operations").version("2.0.0");
program.command("get <id>").description("Get a work item by ID").option("-e, --expand <type>", "Expand relations (None, Relations, Fields, Links, All)", "None").option("-c, --comments", "Include comments").option("-f, --fields <fields>", "Comma-separated list of fields to include").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (id, options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const workItem = await getWorkItem(parseInt(id, 10), {
      expand: options.expand,
      includeComments: options.comments,
      fields: options.fields?.split(",")
    });
    if (options.json) {
      console.log(JSON.stringify(workItem, null, 2));
    } else {
      console.log(`Work Item ${workItem.id}: ${workItem.fields["System.Title"]}`);
      console.log(`  Type: ${workItem.fields["System.WorkItemType"]}`);
      console.log(`  State: ${workItem.fields["System.State"]}`);
      console.log(`  Assigned To: ${workItem.fields["System.AssignedTo"] ?? "Unassigned"}`);
      if (workItem.relations && workItem.relations.length > 0) {
        console.log(`  Relations: ${workItem.relations.length}`);
      }
      if (workItem.comments && workItem.comments.length > 0) {
        console.log(`  Comments: ${workItem.comments.length}`);
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("update <id>").description("Update a work item").option("-t, --title <title>", "New title").option("-d, --description <description>", "New description (HTML)").option("-s, --state <state>", "New state").option("--tags <tags>", 'Tags (semicolon-separated, e.g., "Tag1; Tag2")').option("--ac <criteria>", "Acceptance criteria (HTML)").option("--acceptance-criteria <criteria>", "Acceptance criteria (HTML) - alias for --ac").option("--repro-steps <steps>", "Repro steps for bugs (HTML)").option("--system-info <info>", "System info for bugs (HTML)").option("--story-points <points>", "Story points", parseFloat).option("--priority <priority>", "Priority (1-4)", parseInt).option("--work-class <type>", "Work class type").option("--requires-qa <value>", "Requires QA (Yes/No)").option("--description-file <file>", "Read description from file").option("--ac-file <file>", "Read acceptance criteria from file").option("--repro-steps-file <file>", "Read repro steps from file").option("--system-info-file <file>", "Read system info from file").option("--field <path>", "Field path for arbitrary update (use with --value)").option("--value <value>", "Value for arbitrary field update (use with --field)").option("--value-file <file>", "Read value from file for arbitrary field update").option("--fields-file <file>", 'Read fields from JSON file (expects { "fields": { ... } } or grooming-result.json format)').option("--comment <comment>", "Add a comment/history entry").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (id, options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const fields = {};
    if (options.title) fields["System.Title"] = options.title;
    if (options.description) fields["System.Description"] = options.description;
    if (options.state) fields["System.State"] = options.state;
    if (options.tags) fields["System.Tags"] = options.tags;
    const acValue = options.ac || options.acceptanceCriteria;
    if (acValue) fields["Microsoft.VSTS.Common.AcceptanceCriteria"] = acValue;
    if (options.reproSteps) fields["Microsoft.VSTS.TCM.ReproSteps"] = options.reproSteps;
    if (options.systemInfo) fields["Microsoft.VSTS.TCM.SystemInfo"] = options.systemInfo;
    if (options.storyPoints) fields["Microsoft.VSTS.Scheduling.StoryPoints"] = options.storyPoints;
    if (options.priority) fields["Microsoft.VSTS.Common.Priority"] = options.priority;
    if (options.workClass) fields["Custom.WorkClassType"] = options.workClass;
    if (options.requiresQa) fields["Custom.RequiresQA"] = options.requiresQa;
    if (options.descriptionFile) {
      fields["System.Description"] = readFileSync(options.descriptionFile, "utf-8");
    }
    if (options.acFile) {
      fields["Microsoft.VSTS.Common.AcceptanceCriteria"] = readFileSync(options.acFile, "utf-8");
    }
    if (options.reproStepsFile) {
      fields["Microsoft.VSTS.TCM.ReproSteps"] = readFileSync(options.reproStepsFile, "utf-8");
    }
    if (options.systemInfoFile) {
      fields["Microsoft.VSTS.TCM.SystemInfo"] = readFileSync(options.systemInfoFile, "utf-8");
    }
    if (options.field) {
      if (options.valueFile) {
        fields[options.field] = readFileSync(options.valueFile, "utf-8");
      } else if (options.value !== void 0) {
        fields[options.field] = options.value;
      } else {
        console.error("Error: --field requires either --value or --value-file");
        process.exit(1);
      }
    }
    if (options.fieldsFile) {
      const fileContent = readFileSync(options.fieldsFile, "utf-8");
      const parsed = JSON.parse(fileContent);
      const fieldsFromFile = parsed.fields || parsed;
      for (const [key, value] of Object.entries(fieldsFromFile)) {
        if (value !== void 0 && value !== null) {
          fields[key] = value;
        }
      }
    }
    const workItem = await updateWorkItem(parseInt(id, 10), {
      fields: Object.keys(fields).length > 0 ? fields : void 0,
      comment: options.comment
    });
    if (options.json) {
      console.log(JSON.stringify(workItem, null, 2));
    } else {
      console.log(`Updated work item ${workItem.id}`);
      console.log(`  Fields updated: ${Object.keys(fields).length}`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("create <type>").description("Create a new work item").requiredOption("-t, --title <title>", "Work item title").option("-d, --description <description>", "Description").option("-p, --parent <id>", "Parent work item ID", parseInt).option("-a, --area <path>", "Area path").option("-i, --iteration <path>", "Iteration path").option("--assigned-to <user>", "Assign to user").option("--tags <tags>", "Comma-separated tags").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (type, options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const workItem = await createWorkItem({
      type,
      title: options.title,
      description: options.description,
      parentId: options.parent,
      areaPath: options.area,
      iterationPath: options.iteration,
      assignedTo: options.assignedTo,
      tags: options.tags?.split(",")
    });
    if (options.json) {
      console.log(JSON.stringify(workItem, null, 2));
    } else {
      console.log(`Created work item ${workItem.id}: ${workItem.fields["System.Title"]}`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("search").description("Search for work items").option("-t, --text <text>", "Search text").option("--type <type>", "Work item type").option("-s, --state <state>", "State filter").option("-a, --assigned-to <user>", "Assigned to filter").option("--area <path>", "Area path filter").option("--iteration <path>", "Iteration path filter").option("--tags <tags>", "Comma-separated tags filter").option("--wiql <query>", "Raw WIQL query").option("--top <n>", "Maximum results", parseInt).option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const results = await searchWorkItems({
      searchText: options.text,
      workItemType: options.type,
      state: options.state,
      assignedTo: options.assignedTo,
      areaPath: options.area,
      iterationPath: options.iteration,
      tags: options.tags?.split(","),
      wiql: options.wiql,
      top: options.top
    });
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`Found ${results.count} work items:`);
      for (const wi of results.workItems) {
        console.log(`  ${wi.id}: ${wi.fields["System.Title"]} [${wi.fields["System.State"]}]`);
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("link <sourceId> <targetId>").description("Link two work items").requiredOption("--type <type>", "Link type (parent, child, related, predecessor, successor)").option("--comment <comment>", "Link comment").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (sourceId, targetId, options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const workItem = await linkWorkItems({
      sourceId: parseInt(sourceId, 10),
      targetId: parseInt(targetId, 10),
      linkType: options.type,
      comment: options.comment
    });
    if (options.json) {
      console.log(JSON.stringify(workItem, null, 2));
    } else {
      console.log(`Linked ${sourceId} -> ${targetId} (${options.type})`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("relations <id>").description("Get work item relations").option("--type <types>", "Filter by link types (comma-separated)").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (id, options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const result = await getWorkItemRelations({
      workItemId: parseInt(id, 10),
      linkTypes: options.type?.split(",")
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Work Item ${id} Relations:`);
      for (const rel of result.relations) {
        console.log(`  ${rel.linkType}: ${rel.targetId}`);
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.parse();
//# sourceMappingURL=ado-tools.js.map