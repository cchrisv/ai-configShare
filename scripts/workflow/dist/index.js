var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

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

// src/types/adoWikiTypes.ts
var WIKI_DEFAULTS = {
  WIKI_NAME: "Digital Platforms Wiki",
  PROJECT: "Digital Platforms"
};

// src/types/sfMetadataTypes.ts
var SF_DEFAULTS = {
  ORG_ALIAS: "production",
  API_VERSION: "59.0"
};

// src/types/sfQueryTypes.ts
function buildSOQL(options) {
  const { object, fields, where, orderBy, limit, offset, includeDeleted } = options;
  let query = `SELECT ${fields.join(", ")} FROM ${object}`;
  if (where) {
    query += ` WHERE ${where}`;
  }
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  if (limit !== void 0) {
    query += ` LIMIT ${limit}`;
  }
  if (offset !== void 0) {
    query += ` OFFSET ${offset}`;
  }
  if (includeDeleted) {
    query += " ALL ROWS";
  }
  return query;
}

// src/adoClient.ts
import * as azdev from "azure-devops-node-api";

// src/lib/authAzureCli.ts
import { execSync } from "child_process";
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
function logEvent(event, data, context) {
  if (!shouldLog("info")) return;
  const entry = createEntry("info", `[EVENT] ${event}`, data, context);
  output("info", formatEntry(entry));
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

// src/adoWorkItems.ts
import { Operation } from "azure-devops-node-api/interfaces/common/VSSInterfaces.js";

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
  return new Promise((resolve5) => setTimeout(resolve5, ms));
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

// src/adoWikiPages.ts
import { readFileSync } from "fs";
function getAuthHeaders() {
  validateAzureAuth();
  const token = getAzureBearerToken();
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}
function buildWikiPageUrl(orgUrl, project, wikiIdentifier, path, queryParams) {
  const encodedPath = encodeURIComponent(path);
  const baseUrl = `${orgUrl}/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages`;
  const params = new URLSearchParams();
  params.set("path", path);
  params.set("api-version", "7.1");
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== void 0) {
        params.set(key, String(value));
      }
    }
  }
  return `${baseUrl}?${params.toString()}`;
}
function convertWikiPage(page) {
  return {
    id: page.id ?? 0,
    path: page.path ?? "",
    url: page.url ?? "",
    remoteUrl: page.remoteUrl ?? "",
    gitItemPath: page.gitItemPath,
    content: page.content,
    order: page.order,
    isParentPage: page.isParentPage,
    subPages: page.subPages?.map(convertWikiPage)
  };
}
function getWikiIdentifier(wikiId) {
  return wikiId ?? WIKI_DEFAULTS.WIKI_NAME;
}
async function getPageRest(orgUrl, project, wikiIdentifier, path, options) {
  const headers = getAuthHeaders();
  const queryParams = {
    includeContent: options?.includeContent ?? true,
    recursionLevel: options?.recursionLevel
  };
  const url = buildWikiPageUrl(orgUrl, project, wikiIdentifier, path, queryParams);
  const response = await fetch(url, {
    method: "GET",
    headers
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wiki API error (${response.status}): ${errorText}`);
  }
  const page = await response.json();
  return page;
}
async function createOrUpdatePageRest(orgUrl, project, wikiIdentifier, path, content, comment, eTag) {
  const headers = getAuthHeaders();
  if (eTag) {
    headers["If-Match"] = eTag;
  }
  const params = new URLSearchParams();
  params.set("path", path);
  params.set("api-version", "7.1");
  if (comment) {
    params.set("comment", comment);
  }
  const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages?${params.toString()}`;
  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ content })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wiki API error (${response.status}): ${errorText}`);
  }
  const page = await response.json();
  const responseETag = response.headers.get("ETag") ?? "";
  return {
    page,
    eTag: responseETag
  };
}
async function getWikiPage(options, config2) {
  const timer = createTimer();
  const { path, includeContent = true, recursionLevel } = options;
  if (!path) {
    throw new Error("Page path must be specified");
  }
  logInfo(`Getting wiki page: ${path}`);
  const orgUrl = config2?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(options.wikiId);
  const page = await retryWithBackoff(
    () => getPageRest(orgUrl, project, wikiIdentifier, path, {
      includeContent,
      recursionLevel
    }),
    { ...RETRY_PRESETS.standard, operationName: `getWikiPage(${path})` }
  );
  if (!page) {
    throw new Error(`Wiki page ${path} not found`);
  }
  const result = {
    ...convertWikiPage(page),
    content: page.content ?? "",
    eTag: page.eTag
  };
  timer.log(`getWikiPage(${path})`);
  return result;
}
async function updateWikiPage(options, config2) {
  const timer = createTimer();
  const { path, content, comment, eTag } = options;
  if (!path) {
    throw new Error("Page path is required for updates");
  }
  logInfo(`Updating wiki page: ${path}`);
  let pageContent = content;
  if (content.endsWith(".md") || content.includes("/") || content.includes("\\")) {
    try {
      logDebug(`Loading content from file: ${content}`);
      pageContent = readFileSync(content, "utf-8");
    } catch {
      logDebug("Content is not a file path, using as raw content");
    }
  }
  const orgUrl = config2?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(options.wikiId);
  let currentETag = eTag;
  if (!currentETag) {
    try {
      const currentPage = await getWikiPage({ path, wikiId: options.wikiId }, config2);
      currentETag = currentPage.eTag;
    } catch {
      logDebug("Could not get current page eTag, will attempt update without it");
    }
  }
  const result = await retryWithBackoff(
    () => createOrUpdatePageRest(
      orgUrl,
      project,
      wikiIdentifier,
      path,
      pageContent,
      comment ?? "Updated via API",
      currentETag
    ),
    { ...RETRY_PRESETS.standard, operationName: `updateWikiPage(${path})` }
  );
  logInfo(`Successfully updated wiki page: ${path}`);
  timer.log(`updateWikiPage(${path})`);
  return {
    page: convertWikiPage(result.page),
    eTag: result.eTag
  };
}
async function createWikiPage(options, config2) {
  const timer = createTimer();
  const { path, content, comment } = options;
  logInfo(`Creating wiki page: ${path}`);
  let pageContent = content;
  if (content.endsWith(".md") || content.includes("/") || content.includes("\\")) {
    try {
      logDebug(`Loading content from file: ${content}`);
      pageContent = readFileSync(content, "utf-8");
    } catch {
      logDebug("Content is not a file path, using as raw content");
    }
  }
  const orgUrl = config2?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(options.wikiId);
  const result = await retryWithBackoff(
    () => createOrUpdatePageRest(
      orgUrl,
      project,
      wikiIdentifier,
      path,
      pageContent,
      comment ?? "Created via API"
      // No eTag for new pages
    ),
    { ...RETRY_PRESETS.standard, operationName: `createWikiPage(${path})` }
  );
  logInfo(`Successfully created wiki page: ${path}`);
  timer.log(`createWikiPage(${path})`);
  return {
    page: convertWikiPage(result.page),
    eTag: result.eTag
  };
}

// src/lib/authSalesforceCli.ts
import { AuthInfo, Org, ConfigAggregator } from "@salesforce/core";
var connectionCache = /* @__PURE__ */ new Map();
async function getDefaultOrgAlias() {
  try {
    const configAggregator = await ConfigAggregator.create();
    const targetOrg = configAggregator.getPropertyValue("target-org");
    return typeof targetOrg === "string" ? targetOrg : void 0;
  } catch {
    return void 0;
  }
}
async function getSfConnection(aliasOrUsername) {
  let targetAlias = aliasOrUsername;
  if (!targetAlias) {
    targetAlias = await getDefaultOrgAlias();
    if (!targetAlias) {
      throw new Error(
        "No default Salesforce org is set. Please run: sf config set target-org <alias>"
      );
    }
  }
  const cached = connectionCache.get(targetAlias);
  if (cached) {
    try {
      await cached.identity();
      return cached;
    } catch {
      connectionCache.delete(targetAlias);
    }
  }
  try {
    const org = await Org.create({ aliasOrUsername: targetAlias });
    const connection = org.getConnection();
    connectionCache.set(targetAlias, connection);
    return connection;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("No authorization found") || error.message.includes("NamedOrgNotFound") || error.message.includes("No authorization information")) {
        throw new Error(
          `Salesforce org '${targetAlias}' is not authenticated. Please run: sf org login web -a ${targetAlias}`
        );
      }
      throw new Error(`Failed to connect to Salesforce: ${error.message}`);
    }
    throw error;
  }
}
async function validateSfAuth(alias) {
  let targetAlias = alias;
  if (!targetAlias) {
    targetAlias = await getDefaultOrgAlias();
    if (!targetAlias) {
      throw new Error("No default Salesforce org is set.");
    }
  }
  const auths = await AuthInfo.listAllAuthorizations();
  const found = auths.some(
    (auth) => auth.username === targetAlias || auth.aliases?.includes(targetAlias)
  );
  if (!found) {
    throw new Error(
      `Salesforce org '${targetAlias}' is not authenticated. Please run: sf org login web -a ${targetAlias}`
    );
  }
}

// src/sfClient.ts
async function createSfConnection(config2 = {}) {
  const apiVersion = config2.apiVersion ?? SF_DEFAULTS.API_VERSION;
  logInfo(`Creating SF connection${config2.alias ? ` to ${config2.alias}` : " (using default org)"}`);
  if (!config2.skipAuthValidation) {
    await validateSfAuth(config2.alias);
  }
  const connection = await getSfConnection(config2.alias);
  if (apiVersion !== connection.version) {
    logDebug(`Setting API version to ${apiVersion}`);
    connection.version = apiVersion;
  }
  logDebug(`SF connection created: ${connection.instanceUrl}`);
  const identity = await connection.identity();
  return {
    connection,
    alias: config2.alias ?? identity.username,
    apiVersion: connection.version,
    instanceUrl: connection.instanceUrl
  };
}

// src/sfQueryExecutor.ts
async function executeSoqlQuery(query, config2) {
  const timer = createTimer();
  logInfo("Executing SOQL query");
  logDebug("Query", { query });
  const { connection } = await createSfConnection(config2);
  const result = await retryWithBackoff(
    async () => {
      const queryResult = await connection.query(query);
      return {
        done: queryResult.done,
        totalSize: queryResult.totalSize,
        records: queryResult.records,
        nextRecordsUrl: queryResult.nextRecordsUrl
      };
    },
    { ...RETRY_PRESETS.standard, operationName: "executeSoqlQuery" }
  );
  logInfo(`Query returned ${result.totalSize} records`);
  timer.log("executeSoqlQuery");
  return result;
}
async function executeToolingQuery(query, config2) {
  const timer = createTimer();
  logInfo("Executing Tooling API query");
  logDebug("Query", { query });
  const { connection } = await createSfConnection(config2);
  const result = await retryWithBackoff(
    async () => {
      const queryResult = await connection.tooling.query(query);
      return {
        done: queryResult.done,
        totalSize: queryResult.totalSize,
        records: queryResult.records,
        nextRecordsUrl: queryResult.nextRecordsUrl,
        entityTypeName: queryResult.entityTypeName
      };
    },
    { ...RETRY_PRESETS.standard, operationName: "executeToolingQuery" }
  );
  logInfo(`Tooling query returned ${result.totalSize} records`);
  timer.log("executeToolingQuery");
  return result;
}

// src/sfMetadataDescriber.ts
async function describeObject(objectName, config2) {
  const timer = createTimer();
  logInfo(`Describing object: ${objectName}`);
  const { connection } = await createSfConnection(config2);
  const result = await retryWithBackoff(
    () => connection.describe(objectName),
    { ...RETRY_PRESETS.standard, operationName: `describeObject(${objectName})` }
  );
  const describe = {
    name: result.name,
    label: result.label,
    labelPlural: result.labelPlural,
    keyPrefix: result.keyPrefix ?? "",
    custom: result.custom,
    customSetting: result.customSetting,
    createable: result.createable,
    updateable: result.updateable,
    deletable: result.deletable,
    queryable: result.queryable,
    searchable: result.searchable,
    layoutable: result.layoutable,
    triggerable: result.triggerable,
    fields: result.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      length: f.length,
      precision: f.precision,
      scale: f.scale,
      nillable: f.nillable,
      unique: f.unique,
      createable: f.createable,
      updateable: f.updateable,
      filterable: f.filterable,
      sortable: f.sortable,
      groupable: f.groupable,
      custom: f.custom,
      calculated: f.calculated,
      defaultValue: f.defaultValue,
      inlineHelpText: f.inlineHelpText ?? void 0,
      picklistValues: f.picklistValues?.map((p) => ({
        value: p.value,
        label: p.label,
        active: p.active,
        defaultValue: p.defaultValue
      })),
      referenceTo: f.referenceTo,
      relationshipName: f.relationshipName ?? void 0
    })),
    recordTypeInfos: result.recordTypeInfos?.map((rt) => ({
      recordTypeId: rt.recordTypeId ?? "",
      name: rt.name,
      developerName: rt.developerName ?? "",
      available: rt.available,
      master: rt.master,
      defaultRecordTypeMapping: rt.defaultRecordTypeMapping
    })),
    childRelationships: result.childRelationships?.map((cr) => ({
      childSObject: cr.childSObject,
      field: cr.field,
      relationshipName: cr.relationshipName ?? "",
      cascadeDelete: cr.cascadeDelete,
      deprecatedAndHidden: cr.deprecatedAndHidden,
      restrictedDelete: cr.restrictedDelete
    }))
  };
  logInfo(`Described ${objectName}: ${describe.fields.length} fields`);
  timer.log(`describeObject(${objectName})`);
  return describe;
}
async function describeField(objectName, fieldName, config2) {
  const timer = createTimer();
  logInfo(`Describing field: ${objectName}.${fieldName}`);
  const objectDescribe = await describeObject(objectName, config2);
  const field = objectDescribe.fields.find(
    (f) => f.name.toLowerCase() === fieldName.toLowerCase()
  );
  if (!field) {
    throw new Error(`Field ${fieldName} not found on ${objectName}`);
  }
  timer.log(`describeField(${objectName}.${fieldName})`);
  return field;
}

// src/sfDependencyTraverser.ts
function traverseDependencies(graph, options) {
  const visited = /* @__PURE__ */ new Set();
  const result = [];
  const stack = [];
  function dfs(nodeId, depth) {
    if (depth > options.maxDepth) {
      return;
    }
    if (visited.has(nodeId)) {
      if (options.detectCycles && stack.includes(nodeId)) {
        const cycleStart = stack.indexOf(nodeId);
        const cyclePath = [...stack.slice(cycleStart), nodeId];
        logWarn("Cycle detected", { path: cyclePath });
        if (options.onCycleDetected) {
          options.onCycleDetected(cyclePath);
        }
      }
      return;
    }
    visited.add(nodeId);
    stack.push(nodeId);
    const node = graph.nodes.get(nodeId);
    if (node) {
      result.push(node);
      if (options.onNodeVisit) {
        options.onNodeVisit(node);
      }
      const outgoingEdges = graph.edges.filter((e) => e.sourceId === nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.targetId, depth + 1);
      }
    }
    stack.pop();
  }
  dfs(graph.rootId, 0);
  return result;
}
function detectCycles(nodes, edges, startNodeId) {
  const visited = /* @__PURE__ */ new Set();
  const recursionStack = /* @__PURE__ */ new Set();
  const cycles = [];
  const adjacencyList = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    if (!adjacencyList.has(edge.sourceId)) {
      adjacencyList.set(edge.sourceId, []);
    }
    adjacencyList.get(edge.sourceId).push(edge.targetId);
  }
  function dfs(nodeId, path) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    const neighbors = adjacencyList.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor);
          cycles.push(cycle);
        }
      }
    }
    recursionStack.delete(nodeId);
  }
  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }
  return {
    hasCycles: cycles.length > 0,
    cycles,
    visitedNodes: visited
  };
}
function getNodesAtDepth(graph, depth) {
  return Array.from(graph.nodes.values()).filter((n) => n.depth === depth);
}
function getLeafNodes(graph) {
  const nodesWithOutgoing = new Set(graph.edges.map((e) => e.sourceId));
  return Array.from(graph.nodes.values()).filter(
    (n) => !nodesWithOutgoing.has(n.id)
  );
}
function getRootNodes(graph) {
  const nodesWithIncoming = new Set(graph.edges.map((e) => e.targetId));
  return Array.from(graph.nodes.values()).filter(
    (n) => !nodesWithIncoming.has(n.id)
  );
}
function getPathToNode(graph, targetNodeId) {
  const visited = /* @__PURE__ */ new Set();
  const parent = /* @__PURE__ */ new Map();
  function bfs() {
    const queue = [graph.rootId];
    visited.add(graph.rootId);
    while (queue.length > 0) {
      const current2 = queue.shift();
      if (current2 === targetNodeId) {
        return true;
      }
      const outgoingEdges = graph.edges.filter((e) => e.sourceId === current2);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          parent.set(edge.targetId, current2);
          queue.push(edge.targetId);
        }
      }
    }
    return false;
  }
  if (!bfs()) {
    return null;
  }
  const path = [];
  let current = targetNodeId;
  while (current !== void 0) {
    path.unshift(current);
    current = parent.get(current);
  }
  return path;
}
function getAllDependencies(graph, nodeId) {
  const dependencies = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  function collect(currentId) {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const outgoingEdges = graph.edges.filter((e) => e.sourceId === currentId);
    for (const edge of outgoingEdges) {
      dependencies.add(edge.targetId);
      collect(edge.targetId);
    }
  }
  collect(nodeId);
  return dependencies;
}
function getAllDependents(graph, nodeId) {
  const dependents = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  function collect(currentId) {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const incomingEdges = graph.edges.filter((e) => e.targetId === currentId);
    for (const edge of incomingEdges) {
      dependents.add(edge.sourceId);
      collect(edge.sourceId);
    }
  }
  collect(nodeId);
  return dependents;
}
function calculateImpactScore(graph, nodeId) {
  const dependents = getAllDependents(graph, nodeId);
  return dependents.size;
}
function sortByImpact(graph) {
  const results = [];
  for (const node of graph.nodes.values()) {
    const score = calculateImpactScore(graph, node.id);
    results.push({ node, score });
  }
  return results.sort((a, b) => b.score - a.score);
}
function extractSubgraph(graph, nodeId, includeDepth = Infinity) {
  const subNodes = /* @__PURE__ */ new Map();
  const subEdges = [];
  const visited = /* @__PURE__ */ new Set();
  function collect(currentId, depth) {
    if (visited.has(currentId) || depth > includeDepth) return;
    visited.add(currentId);
    const node = graph.nodes.get(currentId);
    if (node) {
      subNodes.set(currentId, { ...node, depth });
    }
    const outgoingEdges = graph.edges.filter((e) => e.sourceId === currentId);
    for (const edge of outgoingEdges) {
      subEdges.push(edge);
      collect(edge.targetId, depth + 1);
    }
  }
  collect(nodeId, 0);
  return {
    nodes: subNodes,
    edges: subEdges,
    rootId: nodeId,
    metadata: {
      ...graph.metadata,
      rootName: graph.nodes.get(nodeId)?.name ?? nodeId,
      nodeCount: subNodes.size,
      edgeCount: subEdges.length
    }
  };
}

// src/sfDependencyEnrichment.ts
var DEFAULT_ENRICHMENT_OPTIONS = {
  includeApexUsage: true,
  includeFlowUsage: true,
  includeValidationUsage: true,
  includeWorkflowUsage: true,
  includeFormulaUsage: false,
  includeLayoutUsage: false,
  includeReportUsage: false
};
async function enrichWithUsagePills(graph, config2, options = DEFAULT_ENRICHMENT_OPTIONS) {
  const timer = createTimer();
  const pills = [];
  logInfo("Enriching graph with usage pills");
  const objectNames = /* @__PURE__ */ new Set();
  const fieldNames = /* @__PURE__ */ new Set();
  for (const node of graph.nodes.values()) {
    if (node.type === "CustomObject") {
      objectNames.add(node.apiName);
    } else if (node.type === "CustomField") {
      fieldNames.add(node.apiName);
    }
  }
  if (options.includeApexUsage && (objectNames.size > 0 || fieldNames.size > 0)) {
    const apexPills = await analyzeApexUsage(objectNames, fieldNames, config2);
    pills.push(...apexPills);
  }
  if (options.includeFlowUsage && objectNames.size > 0) {
    const flowPills = await analyzeFlowUsage(objectNames, config2);
    pills.push(...flowPills);
  }
  if (options.includeValidationUsage && fieldNames.size > 0) {
    const validationPills = await analyzeValidationUsage(fieldNames, config2);
    pills.push(...validationPills);
  }
  logInfo(`Created ${pills.length} usage pills`);
  timer.log("enrichWithUsagePills");
  return pills;
}
async function analyzeApexUsage(objectNames, fieldNames, config2) {
  const pills = [];
  if (objectNames.size === 0 && fieldNames.size === 0) {
    return pills;
  }
  logDebug("Analyzing Apex usage");
  for (const objectName of objectNames) {
    try {
      const query = `
        SELECT Id, Name FROM ApexClass 
        WHERE Status = 'Active'
        LIMIT 100
      `;
      const result = await executeToolingQuery(query, config2);
      if (result.records.length > 0) {
        pills.push(createPill({
          type: "apex_usage",
          label: `${objectName} Apex Usage`,
          description: `${result.records.length} Apex classes in org may reference this object`,
          severity: "info",
          affectedComponents: result.records.slice(0, 10).map((r) => r.Name),
          recommendation: "Review Apex classes for direct object references before making schema changes"
        }));
      }
    } catch (error) {
      logDebug(`Error analyzing Apex for ${objectName}: ${error}`);
    }
  }
  return pills;
}
async function analyzeFlowUsage(objectNames, config2) {
  const pills = [];
  logDebug("Analyzing Flow usage");
  for (const objectName of objectNames) {
    try {
      const query = `
        SELECT Id, MasterLabel, ProcessType, Status
        FROM Flow
        WHERE TriggerObjectOrEvent = '${objectName}'
        AND IsActive = true
      `;
      const result = await executeToolingQuery(query, config2);
      if (result.records.length > 0) {
        const severity = result.records.length > 3 ? "warning" : "info";
        pills.push(createPill({
          type: "flow_usage",
          label: `${objectName} Flow Usage`,
          description: `${result.records.length} active Flow(s) trigger on this object`,
          severity,
          affectedComponents: result.records.map((r) => r.MasterLabel),
          recommendation: severity === "warning" ? "Multiple flows may cause performance issues or conflicts" : "Review flows before making changes to this object"
        }));
      }
    } catch (error) {
      logDebug(`Error analyzing Flows for ${objectName}: ${error}`);
    }
  }
  return pills;
}
async function analyzeValidationUsage(fieldNames, config2) {
  const pills = [];
  logDebug("Analyzing Validation Rule usage");
  const fieldsByObject = /* @__PURE__ */ new Map();
  for (const fieldName of fieldNames) {
    const parts = fieldName.split(".");
    if (parts.length === 2) {
      const objectName = parts[0];
      const field = parts[1];
      if (!fieldsByObject.has(objectName)) {
        fieldsByObject.set(objectName, []);
      }
      fieldsByObject.get(objectName).push(field);
    }
  }
  for (const [objectName, fields] of fieldsByObject) {
    try {
      const query = `
        SELECT Id, ValidationName, ErrorMessage, Active
        FROM ValidationRule
        WHERE EntityDefinition.QualifiedApiName = '${objectName}'
        AND Active = true
      `;
      const result = await executeToolingQuery(query, config2);
      if (result.records.length > 0) {
        pills.push(createPill({
          type: "validation_usage",
          label: `${objectName} Validation Rules`,
          description: `${result.records.length} active validation rule(s) on this object`,
          severity: "info",
          affectedComponents: result.records.map((r) => r.ValidationName),
          recommendation: "Review validation rules when modifying fields on this object"
        }));
      }
    } catch (error) {
      logDebug(`Error analyzing Validation Rules for ${objectName}: ${error}`);
    }
  }
  return pills;
}
function createPill(options) {
  return {
    id: `pill_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    ...options
  };
}
function filterPillsBySeverity(pills, minSeverity) {
  const severityOrder = {
    info: 0,
    warning: 1,
    critical: 2
  };
  const minLevel = severityOrder[minSeverity];
  return pills.filter((p) => severityOrder[p.severity] >= minLevel);
}
function filterPillsByType(pills, types) {
  return pills.filter((p) => types.includes(p.type));
}
function groupPillsBySeverity(pills) {
  const result = {
    info: [],
    warning: [],
    critical: []
  };
  for (const pill of pills) {
    result[pill.severity].push(pill);
  }
  return result;
}
function getPillsSummary(pills) {
  const grouped = groupPillsBySeverity(pills);
  return {
    total: pills.length,
    byCategory: {
      info: grouped.info.length,
      warning: grouped.warning.length,
      critical: grouped.critical.length
    },
    topRecommendations: pills.filter((p) => p.recommendation).slice(0, 5).map((p) => p.recommendation)
  };
}
function formatPillsForDisplay(pills) {
  const lines = [];
  const grouped = groupPillsBySeverity(pills);
  if (grouped.critical.length > 0) {
    lines.push("\u{1F534} CRITICAL:");
    for (const pill of grouped.critical) {
      lines.push(`  - ${pill.label}: ${pill.description}`);
    }
    lines.push("");
  }
  if (grouped.warning.length > 0) {
    lines.push("\u{1F7E1} WARNINGS:");
    for (const pill of grouped.warning) {
      lines.push(`  - ${pill.label}: ${pill.description}`);
    }
    lines.push("");
  }
  if (grouped.info.length > 0) {
    lines.push("\u2139\uFE0F INFO:");
    for (const pill of grouped.info) {
      lines.push(`  - ${pill.label}: ${pill.description}`);
    }
  }
  return lines.join("\n");
}

// src/sfDependencyDiscovery.ts
async function discoverDependencies(options, config2) {
  const timer = createTimer();
  const validatedOptions = validate(DiscoverDependenciesOptionsSchema, options);
  const { rootType, rootName, maxDepth = 3 } = validatedOptions;
  logInfo(`Discovering dependencies for ${rootType}:${rootName}`, { maxDepth });
  const nodes = /* @__PURE__ */ new Map();
  const edges = [];
  const warnings = [];
  const rootId = createNodeId(rootType, rootName);
  const rootNode = {
    id: rootId,
    name: rootName,
    type: rootType,
    apiName: rootName,
    depth: 0,
    isLeaf: false
  };
  nodes.set(rootId, rootNode);
  try {
    await discoverForType(
      rootType,
      rootName,
      0,
      maxDepth,
      nodes,
      edges,
      warnings,
      validatedOptions,
      config2
    );
  } catch (error) {
    warnings.push(`Error discovering dependencies: ${error instanceof Error ? error.message : String(error)}`);
  }
  const cycleResult = detectCycles(nodes, edges, rootId);
  if (cycleResult.hasCycles) {
    logWarn(`Circular dependencies detected`, { cycles: cycleResult.cycles });
    for (const cycle of cycleResult.cycles) {
      for (const nodeId of cycle) {
        const node = nodes.get(nodeId);
        if (node) {
          node.isCircular = true;
        }
      }
    }
  }
  const metadata = {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    rootType,
    rootName,
    maxDepth,
    nodeCount: nodes.size,
    edgeCount: edges.length,
    hasCircularDependencies: cycleResult.hasCycles,
    circularPaths: cycleResult.hasCycles ? cycleResult.cycles : void 0
  };
  const graph = {
    nodes,
    edges,
    rootId,
    metadata
  };
  const pills = await enrichWithUsagePills(graph, config2);
  const executionTime = timer.elapsed();
  logInfo(`Dependency discovery complete`, {
    nodes: nodes.size,
    edges: edges.length,
    executionTime
  });
  return {
    graph,
    pills,
    warnings,
    executionTime
  };
}
function createNodeId(type, name) {
  return `${type}:${name}`;
}
async function discoverForType(type, name, currentDepth, maxDepth, nodes, edges, warnings, options, config2) {
  if (currentDepth >= maxDepth) {
    return;
  }
  logDebug(`Discovering ${type}:${name} at depth ${currentDepth}`);
  switch (type) {
    case "CustomObject":
      await discoverCustomObjectDependencies(name, currentDepth, maxDepth, nodes, edges, warnings, options, config2);
      break;
    case "CustomField":
      await discoverCustomFieldDependencies(name, currentDepth, maxDepth, nodes, edges, warnings, options, config2);
      break;
    case "ApexClass":
      await discoverApexClassDependencies(name, currentDepth, maxDepth, nodes, edges, warnings, options, config2);
      break;
    case "ApexTrigger":
      await discoverApexTriggerDependencies(name, currentDepth, maxDepth, nodes, edges, warnings, options, config2);
      break;
    case "Flow":
      await discoverFlowDependencies(name, currentDepth, maxDepth, nodes, edges, warnings, options, config2);
      break;
    default:
      logDebug(`No specific discovery for type ${type}`);
  }
}
async function discoverCustomObjectDependencies(objectName, currentDepth, maxDepth, nodes, edges, warnings, options, config2) {
  const sourceId = createNodeId("CustomObject", objectName);
  const fieldsQuery = `
    SELECT QualifiedApiName, DataType, ReferenceTo, RelationshipName
    FROM FieldDefinition
    WHERE EntityDefinition.QualifiedApiName = '${objectName}'
    AND QualifiedApiName LIKE '%__c'
  `;
  try {
    const fields = await executeToolingQuery(fieldsQuery, config2);
    for (const field of fields.records) {
      const fieldId = createNodeId("CustomField", `${objectName}.${field.QualifiedApiName}`);
      if (!nodes.has(fieldId)) {
        nodes.set(fieldId, {
          id: fieldId,
          name: field.QualifiedApiName,
          type: "CustomField",
          apiName: `${objectName}.${field.QualifiedApiName}`,
          depth: currentDepth + 1,
          isLeaf: true,
          parentId: sourceId
        });
      }
      edges.push({
        sourceId,
        targetId: fieldId,
        relationshipType: "contains"
      });
      if (field.ReferenceTo?.referenceTo && field.ReferenceTo.referenceTo.length > 0) {
        for (const refTo of field.ReferenceTo.referenceTo) {
          if (!options.includeStandardObjects && !refTo.endsWith("__c")) {
            continue;
          }
          const refId = createNodeId("CustomObject", refTo);
          if (!nodes.has(refId)) {
            nodes.set(refId, {
              id: refId,
              name: refTo,
              type: "CustomObject",
              apiName: refTo,
              depth: currentDepth + 2,
              isLeaf: currentDepth + 2 >= maxDepth
            });
            if (currentDepth + 2 < maxDepth) {
              await discoverForType("CustomObject", refTo, currentDepth + 2, maxDepth, nodes, edges, warnings, options, config2);
            }
          }
          const relType = field.DataType === "MasterDetail" ? "masterDetail" : "lookupTo";
          edges.push({
            sourceId: fieldId,
            targetId: refId,
            relationshipType: relType
          });
        }
      }
    }
  } catch (error) {
    warnings.push(`Error querying fields for ${objectName}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const triggersQuery = `
    SELECT Name FROM ApexTrigger WHERE TableEnumOrId = '${objectName}'
  `;
  try {
    const triggers = await executeToolingQuery(triggersQuery, config2);
    for (const trigger of triggers.records) {
      const triggerId = createNodeId("ApexTrigger", trigger.Name);
      if (!nodes.has(triggerId)) {
        nodes.set(triggerId, {
          id: triggerId,
          name: trigger.Name,
          type: "ApexTrigger",
          apiName: trigger.Name,
          depth: currentDepth + 1,
          isLeaf: currentDepth + 1 >= maxDepth,
          parentId: sourceId
        });
      }
      edges.push({
        sourceId,
        targetId: triggerId,
        relationshipType: "triggers"
      });
    }
  } catch (error) {
    warnings.push(`Error querying triggers for ${objectName}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const validationQuery = `
    SELECT ValidationName FROM ValidationRule 
    WHERE EntityDefinition.QualifiedApiName = '${objectName}' AND Active = true
  `;
  try {
    const validations = await executeToolingQuery(validationQuery, config2);
    for (const rule of validations.records) {
      const ruleId = createNodeId("ValidationRule", `${objectName}.${rule.ValidationName}`);
      if (!nodes.has(ruleId)) {
        nodes.set(ruleId, {
          id: ruleId,
          name: rule.ValidationName,
          type: "ValidationRule",
          apiName: `${objectName}.${rule.ValidationName}`,
          depth: currentDepth + 1,
          isLeaf: true,
          parentId: sourceId
        });
      }
      edges.push({
        sourceId,
        targetId: ruleId,
        relationshipType: "contains"
      });
    }
  } catch (error) {
    warnings.push(`Error querying validation rules for ${objectName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function discoverCustomFieldDependencies(fieldName, currentDepth, maxDepth, nodes, edges, warnings, options, config2) {
  logDebug(`Field dependency discovery for ${fieldName} - handled via parent object`);
}
async function discoverApexClassDependencies(className, currentDepth, maxDepth, nodes, edges, warnings, options, config2) {
  const sourceId = createNodeId("ApexClass", className);
  const query = `
    SELECT Id, Name, SymbolTable 
    FROM ApexClass 
    WHERE Name = '${className}'
  `;
  try {
    const result = await executeToolingQuery(query, config2);
    if (result.records.length > 0 && result.records[0]?.SymbolTable?.externalReferences) {
      for (const ref of result.records[0].SymbolTable.externalReferences) {
        if (!options.includeStandardObjects && !ref.name.endsWith("__c")) {
          continue;
        }
        const refId = createNodeId("ApexClass", ref.name);
        if (!nodes.has(refId) && ref.name !== className) {
          nodes.set(refId, {
            id: refId,
            name: ref.name,
            type: "ApexClass",
            apiName: ref.name,
            namespace: ref.namespace || void 0,
            depth: currentDepth + 1,
            isLeaf: currentDepth + 1 >= maxDepth
          });
          edges.push({
            sourceId,
            targetId: refId,
            relationshipType: "references"
          });
        }
      }
    }
  } catch (error) {
    warnings.push(`Error querying Apex class ${className}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function discoverApexTriggerDependencies(triggerName, currentDepth, maxDepth, nodes, edges, warnings, options, config2) {
  const sourceId = createNodeId("ApexTrigger", triggerName);
  const query = `
    SELECT TableEnumOrId FROM ApexTrigger WHERE Name = '${triggerName}'
  `;
  try {
    const result = await executeToolingQuery(query, config2);
    if (result.records.length > 0 && result.records[0]) {
      const objectName = result.records[0].TableEnumOrId;
      const objectId = createNodeId("CustomObject", objectName);
      if (!nodes.has(objectId)) {
        nodes.set(objectId, {
          id: objectId,
          name: objectName,
          type: "CustomObject",
          apiName: objectName,
          depth: currentDepth + 1,
          isLeaf: currentDepth + 1 >= maxDepth
        });
      }
      edges.push({
        sourceId,
        targetId: objectId,
        relationshipType: "triggers"
      });
    }
  } catch (error) {
    warnings.push(`Error querying trigger ${triggerName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function discoverFlowDependencies(flowName, currentDepth, maxDepth, nodes, edges, warnings, options, config2) {
  const sourceId = createNodeId("Flow", flowName);
  const query = `
    SELECT TriggerObjectOrEvent FROM Flow 
    WHERE DeveloperName = '${flowName}' AND IsActive = true
  `;
  try {
    const result = await executeToolingQuery(query, config2);
    if (result.records.length > 0 && result.records[0]?.TriggerObjectOrEvent) {
      const objectName = result.records[0].TriggerObjectOrEvent;
      const objectId = createNodeId("CustomObject", objectName);
      if (!nodes.has(objectId)) {
        nodes.set(objectId, {
          id: objectId,
          name: objectName,
          type: "CustomObject",
          apiName: objectName,
          depth: currentDepth + 1,
          isLeaf: currentDepth + 1 >= maxDepth
        });
      }
      edges.push({
        sourceId,
        targetId: objectId,
        relationshipType: "flowReference"
      });
    }
  } catch (error) {
    warnings.push(`Error querying flow ${flowName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function exportGraphToJson(graph) {
  const nodes = Array.from(graph.nodes.values());
  return JSON.stringify({
    nodes,
    edges: graph.edges,
    metadata: graph.metadata
  }, null, 2);
}
function exportGraphToDot(graph) {
  const lines = ["digraph Dependencies {"];
  lines.push("  rankdir=LR;");
  lines.push("  node [shape=box];");
  lines.push("");
  for (const node of graph.nodes.values()) {
    const label = `${node.type}\\n${node.name}`;
    const color = node.isCircular ? "red" : "black";
    lines.push(`  "${node.id}" [label="${label}" color="${color}"];`);
  }
  lines.push("");
  for (const edge of graph.edges) {
    lines.push(`  "${edge.sourceId}" -> "${edge.targetId}" [label="${edge.relationshipType}"];`);
  }
  lines.push("}");
  return lines.join("\n");
}

// src/sfDependencyAnalyzers.ts
async function analyzeStandardFields(objectName, config2) {
  const timer = createTimer();
  const nodes = [];
  const edges = [];
  const warnings = [];
  logInfo(`Analyzing standard fields for ${objectName}`);
  try {
    const query = `
      SELECT QualifiedApiName, DataType, Label, IsCompound, IsNillable
      FROM FieldDefinition
      WHERE EntityDefinition.QualifiedApiName = '${objectName}'
      AND IsCustom = false
    `;
    const result = await executeToolingQuery(query, config2);
    for (const field of result.records) {
      const nodeId = `StandardField:${objectName}.${field.QualifiedApiName}`;
      nodes.push({
        id: nodeId,
        name: field.QualifiedApiName,
        type: "CustomField",
        // Using CustomField type for consistency
        apiName: `${objectName}.${field.QualifiedApiName}`,
        depth: 1,
        isLeaf: true,
        metadata: {
          dataType: field.DataType,
          label: field.Label,
          isCompound: field.IsCompound,
          isNillable: field.IsNillable,
          isStandard: true
        }
      });
      edges.push({
        sourceId: `CustomObject:${objectName}`,
        targetId: nodeId,
        relationshipType: "contains"
      });
    }
    logInfo(`Found ${nodes.length} standard fields for ${objectName}`);
  } catch (error) {
    const msg = `Error analyzing standard fields for ${objectName}: ${error instanceof Error ? error.message : String(error)}`;
    logWarn(msg);
    warnings.push(msg);
  }
  timer.log(`analyzeStandardFields(${objectName})`);
  return { nodes, edges, warnings };
}
async function analyzeCustomMetadata(cmtName, config2) {
  const timer = createTimer();
  const nodes = [];
  const edges = [];
  const warnings = [];
  logInfo(`Analyzing Custom Metadata Type: ${cmtName}`);
  try {
    const entityQuery = `
      SELECT QualifiedApiName, DeveloperName, MasterLabel, KeyPrefix
      FROM EntityDefinition
      WHERE QualifiedApiName = '${cmtName}'
    `;
    const entityResult = await executeToolingQuery(entityQuery, config2);
    if (entityResult.records.length === 0) {
      warnings.push(`Custom Metadata Type ${cmtName} not found`);
      return { nodes, edges, warnings };
    }
    const entity = entityResult.records[0];
    const rootId = `CustomMetadataType:${cmtName}`;
    nodes.push({
      id: rootId,
      name: entity.DeveloperName,
      type: "CustomMetadataType",
      apiName: cmtName,
      depth: 0,
      isLeaf: false,
      metadata: {
        label: entity.MasterLabel,
        keyPrefix: entity.KeyPrefix
      }
    });
    const fieldsQuery = `
      SELECT QualifiedApiName, DataType, Label
      FROM FieldDefinition
      WHERE EntityDefinition.QualifiedApiName = '${cmtName}'
      AND IsCustom = true
    `;
    const fieldsResult = await executeToolingQuery(fieldsQuery, config2);
    for (const field of fieldsResult.records) {
      const fieldId = `CustomField:${cmtName}.${field.QualifiedApiName}`;
      nodes.push({
        id: fieldId,
        name: field.QualifiedApiName,
        type: "CustomField",
        apiName: `${cmtName}.${field.QualifiedApiName}`,
        depth: 1,
        isLeaf: true,
        parentId: rootId,
        metadata: {
          dataType: field.DataType,
          label: field.Label
        }
      });
      edges.push({
        sourceId: rootId,
        targetId: fieldId,
        relationshipType: "contains"
      });
    }
    try {
      const recordsQuery = `SELECT COUNT() FROM ${cmtName}`;
      const recordsResult = await executeSoqlQuery(recordsQuery, config2);
      if (recordsResult.totalSize > 0) {
        logDebug(`${cmtName} has ${recordsResult.totalSize} records`);
      }
    } catch {
      logDebug(`Could not query records for ${cmtName}`);
    }
    logInfo(`Analyzed CMT ${cmtName}: ${fieldsResult.records.length} fields`);
  } catch (error) {
    const msg = `Error analyzing CMT ${cmtName}: ${error instanceof Error ? error.message : String(error)}`;
    logWarn(msg);
    warnings.push(msg);
  }
  timer.log(`analyzeCustomMetadata(${cmtName})`);
  return { nodes, edges, warnings };
}
async function analyzeWorkflows(objectName, config2) {
  const timer = createTimer();
  const nodes = [];
  const edges = [];
  const warnings = [];
  logInfo(`Analyzing workflows for ${objectName}`);
  const objectNodeId = `CustomObject:${objectName}`;
  try {
    const fieldUpdatesQuery = `
      SELECT Id, Name, SourceObject
      FROM WorkflowFieldUpdate
      WHERE SourceObject = '${objectName}'
    `;
    try {
      const fieldUpdates = await executeToolingQuery(fieldUpdatesQuery, config2);
      for (const update of fieldUpdates.records) {
        const nodeId = `WorkflowFieldUpdate:${objectName}.${update.Name}`;
        nodes.push({
          id: nodeId,
          name: update.Name,
          type: "WorkflowFieldUpdate",
          apiName: `${objectName}.${update.Name}`,
          depth: 1,
          isLeaf: true,
          parentId: objectNodeId
        });
        edges.push({
          sourceId: objectNodeId,
          targetId: nodeId,
          relationshipType: "workflowUpdate"
        });
      }
      logDebug(`Found ${fieldUpdates.records.length} workflow field updates`);
    } catch (error) {
      logDebug(`WorkflowFieldUpdate query failed: ${error}`);
    }
    const emailAlertsQuery = `
      SELECT Id, DeveloperName, SenderType
      FROM WorkflowAlert
    `;
    try {
      const emailAlerts = await executeToolingQuery(emailAlertsQuery, config2);
      logDebug(`Found ${emailAlerts.records.length} workflow email alerts in org`);
    } catch (error) {
      logDebug(`WorkflowAlert query failed: ${error}`);
    }
  } catch (error) {
    const msg = `Error analyzing workflows for ${objectName}: ${error instanceof Error ? error.message : String(error)}`;
    logWarn(msg);
    warnings.push(msg);
  }
  timer.log(`analyzeWorkflows(${objectName})`);
  return { nodes, edges, warnings };
}
async function analyzeProcessBuilders(objectName, config2) {
  const timer = createTimer();
  const nodes = [];
  const edges = [];
  const warnings = [];
  logInfo(`Analyzing Process Builders for ${objectName}`);
  const objectNodeId = `CustomObject:${objectName}`;
  try {
    const query = `
      SELECT Id, MasterLabel, DeveloperName, ProcessType, Status
      FROM Flow
      WHERE TriggerObjectOrEvent = '${objectName}'
      AND ProcessType = 'Workflow'
      AND Status = 'Active'
    `;
    const result = await executeToolingQuery(query, config2);
    for (const process2 of result.records) {
      const nodeId = `ProcessBuilder:${process2.DeveloperName}`;
      nodes.push({
        id: nodeId,
        name: process2.MasterLabel,
        type: "ProcessBuilder",
        apiName: process2.DeveloperName,
        depth: 1,
        isLeaf: true,
        parentId: objectNodeId,
        metadata: {
          status: process2.Status,
          processType: process2.ProcessType
        }
      });
      edges.push({
        sourceId: objectNodeId,
        targetId: nodeId,
        relationshipType: "triggers"
      });
    }
    logInfo(`Found ${result.records.length} Process Builders for ${objectName}`);
  } catch (error) {
    const msg = `Error analyzing Process Builders for ${objectName}: ${error instanceof Error ? error.message : String(error)}`;
    logWarn(msg);
    warnings.push(msg);
  }
  timer.log(`analyzeProcessBuilders(${objectName})`);
  return { nodes, edges, warnings };
}
async function analyzeRecordTriggeredFlows(objectName, config2) {
  const timer = createTimer();
  const nodes = [];
  const edges = [];
  const warnings = [];
  logInfo(`Analyzing Record-Triggered Flows for ${objectName}`);
  const objectNodeId = `CustomObject:${objectName}`;
  try {
    const query = `
      SELECT Id, MasterLabel, DeveloperName, TriggerType, RecordTriggerType, Status
      FROM Flow
      WHERE TriggerObjectOrEvent = '${objectName}'
      AND ProcessType = 'AutoLaunchedFlow'
      AND TriggerType = 'RecordAfterSave'
      AND IsActive = true
    `;
    const result = await executeToolingQuery(query, config2);
    for (const flow of result.records) {
      const nodeId = `Flow:${flow.DeveloperName}`;
      nodes.push({
        id: nodeId,
        name: flow.MasterLabel,
        type: "Flow",
        apiName: flow.DeveloperName,
        depth: 1,
        isLeaf: true,
        parentId: objectNodeId,
        metadata: {
          triggerType: flow.TriggerType,
          recordTriggerType: flow.RecordTriggerType,
          status: flow.Status
        }
      });
      edges.push({
        sourceId: objectNodeId,
        targetId: nodeId,
        relationshipType: "triggers"
      });
    }
    logInfo(`Found ${result.records.length} Record-Triggered Flows for ${objectName}`);
  } catch (error) {
    const msg = `Error analyzing Record-Triggered Flows for ${objectName}: ${error instanceof Error ? error.message : String(error)}`;
    logWarn(msg);
    warnings.push(msg);
  }
  timer.log(`analyzeRecordTriggeredFlows(${objectName})`);
  return { nodes, edges, warnings };
}
async function runAllAnalyzers(objectName, config2) {
  const timer = createTimer();
  const allNodes = [];
  const allEdges = [];
  const allWarnings = [];
  logInfo(`Running all analyzers for ${objectName}`);
  const results = await Promise.all([
    analyzeStandardFields(objectName, config2),
    analyzeWorkflows(objectName, config2),
    analyzeProcessBuilders(objectName, config2),
    analyzeRecordTriggeredFlows(objectName, config2)
  ]);
  for (const result of results) {
    allNodes.push(...result.nodes);
    allEdges.push(...result.edges);
    allWarnings.push(...result.warnings);
  }
  logInfo(`All analyzers complete for ${objectName}: ${allNodes.length} nodes, ${allEdges.length} edges`);
  timer.log(`runAllAnalyzers(${objectName})`);
  return {
    nodes: allNodes,
    edges: allEdges,
    warnings: allWarnings
  };
}

// src/workflowPrepareTicket.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, writeFileSync as writeFileSync2 } from "fs";
import { resolve as resolve3 } from "path";

// src/lib/configLoader.ts
import { readFileSync as readFileSync2, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
function getProjectRoot() {
  const possibleRoots = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "..", ".."),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..")
  ];
  for (const root of possibleRoots) {
    if (existsSync(resolve(root, "config", "shared.json"))) {
      return root;
    }
  }
  return process.cwd();
}
function getConfigDir() {
  return resolve(getProjectRoot(), "config");
}
function loadJsonFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }
  try {
    const content = readFileSync2(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}
function loadTemplateVariables(configPath) {
  const path = configPath ?? resolve(getConfigDir(), "template-variables.json");
  if (!existsSync(path)) {
    return {};
  }
  return loadJsonFile(path);
}
function loadStepManifests(configPath) {
  const path = configPath ?? resolve(getConfigDir(), "step-manifests.json");
  const data = loadJsonFile(path);
  if (Array.isArray(data)) {
    return data;
  }
  return data.steps;
}

// src/workflowState.ts
import { readFileSync as readFileSync3, writeFileSync, existsSync as existsSync2, mkdirSync } from "fs";
import { resolve as resolve2 } from "path";
var DEFAULT_STATE_DIR = ".github/state";
function getStateFilePath(workItemId, stateDir) {
  const dir = stateDir ?? resolve2(process.cwd(), DEFAULT_STATE_DIR);
  return resolve2(dir, `workflow-${workItemId}.json`);
}
function ensureStateDir(stateDir) {
  const dir = stateDir ?? resolve2(process.cwd(), DEFAULT_STATE_DIR);
  if (!existsSync2(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function createState(workItemId) {
  return {
    workItemId,
    currentPhase: "",
    currentStep: "",
    completedSteps: [],
    skippedSteps: [],
    artifacts: {},
    variables: { workItemId },
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    status: "pending"
  };
}
function loadState(workItemId, stateDir) {
  const filePath = getStateFilePath(workItemId, stateDir);
  logDebug(`Loading state from ${filePath}`);
  if (!existsSync2(filePath)) {
    logDebug(`No state file found for work item ${workItemId}`);
    return void 0;
  }
  try {
    const content = readFileSync3(filePath, "utf-8");
    const state = JSON.parse(content);
    logInfo(`Loaded state for work item ${workItemId}`, { status: state.status });
    return state;
  } catch (error) {
    logWarn(`Error loading state for work item ${workItemId}`, { error });
    return void 0;
  }
}
function saveState(state, stateDir) {
  ensureStateDir(stateDir);
  const filePath = getStateFilePath(state.workItemId, stateDir);
  state.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  logDebug(`Saving state to ${filePath}`);
  try {
    const content = JSON.stringify(state, null, 2);
    writeFileSync(filePath, content, "utf-8");
    logDebug(`State saved for work item ${state.workItemId}`);
  } catch (error) {
    logWarn(`Error saving state for work item ${state.workItemId}`, { error });
    throw error;
  }
}
function resetState(workItemId, stateDir) {
  const filePath = getStateFilePath(workItemId, stateDir);
  logInfo(`Resetting state for work item ${workItemId}`);
  if (existsSync2(filePath)) {
    const backupPath = `${filePath}.backup`;
    const content = readFileSync3(filePath, "utf-8");
    writeFileSync(backupPath, content, "utf-8");
    logDebug(`Backed up state to ${backupPath}`);
  }
  const newState = createState(workItemId);
  saveState(newState, stateDir);
}
function updateStatus(state, status, error) {
  return {
    ...state,
    status,
    error: error ?? state.error,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function completeStep(state, stepId) {
  if (state.completedSteps.includes(stepId)) {
    return state;
  }
  return {
    ...state,
    completedSteps: [...state.completedSteps, stepId],
    currentStep: "",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function skipStep(state, stepId) {
  if (state.skippedSteps.includes(stepId)) {
    return state;
  }
  return {
    ...state,
    skippedSteps: [...state.skippedSteps, stepId],
    currentStep: "",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function setCurrentStep(state, phase, step) {
  return {
    ...state,
    currentPhase: phase,
    currentStep: step,
    status: "in_progress",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function addArtifact(state, name, path) {
  return {
    ...state,
    artifacts: {
      ...state.artifacts,
      [name]: path
    },
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function updateVariables(state, variables) {
  return {
    ...state,
    variables: {
      ...state.variables,
      ...variables
    },
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function isStepCompleted(state, stepId) {
  return state.completedSteps.includes(stepId);
}
function isStepSkipped(state, stepId) {
  return state.skippedSteps.includes(stepId);
}
function canResume(state) {
  return state.status === "in_progress" || state.status === "paused";
}
function getProgress(state, totalSteps) {
  if (totalSteps === 0) return 0;
  const completed = state.completedSteps.length + state.skippedSteps.length;
  return Math.round(completed / totalSteps * 100);
}
function getStateSummary(state) {
  return {
    workItemId: state.workItemId,
    status: state.status,
    currentPhase: state.currentPhase,
    currentStep: state.currentStep,
    completedCount: state.completedSteps.length,
    skippedCount: state.skippedSteps.length,
    artifactCount: Object.keys(state.artifacts).length,
    startedAt: state.startedAt,
    lastUpdated: state.lastUpdated,
    error: state.error
  };
}
function listStates(stateDir) {
  const dir = stateDir ?? resolve2(process.cwd(), DEFAULT_STATE_DIR);
  if (!existsSync2(dir)) {
    return [];
  }
  const { readdirSync } = __require("fs");
  const files = readdirSync(dir);
  const states = [];
  for (const file of files) {
    if (file.startsWith("workflow-") && file.endsWith(".json")) {
      try {
        const content = readFileSync3(resolve2(dir, file), "utf-8");
        const state = JSON.parse(content);
        states.push(state);
      } catch {
      }
    }
  }
  return states;
}
function cleanupOldStates(maxAgeDays = 30, stateDir) {
  const states = listStates(stateDir);
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  let cleaned = 0;
  const { unlinkSync } = __require("fs");
  for (const state of states) {
    const lastUpdated = new Date(state.lastUpdated);
    if (lastUpdated < cutoffDate && state.status === "completed") {
      const filePath = getStateFilePath(state.workItemId, stateDir);
      try {
        unlinkSync(filePath);
        cleaned++;
        logDebug(`Cleaned up state for work item ${state.workItemId}`);
      } catch {
      }
    }
  }
  if (cleaned > 0) {
    logInfo(`Cleaned up ${cleaned} old workflow states`);
  }
  return cleaned;
}

// src/workflowPrepareTicket.ts
var DEFAULT_OUTPUT_DIR = ".ai-artifacts";
async function prepareTicketArtifacts(options) {
  const timer = createTimer();
  const { workItemId, outputDir, force = false, configPath } = options;
  logInfo(`Preparing artifacts for work item ${workItemId}`);
  const errors = [];
  let state;
  let workItem;
  let variables = {};
  const artifacts = {};
  try {
    const existingState = loadState(workItemId);
    if (existingState && !force) {
      logInfo("Using existing workflow state", { status: existingState.status });
      state = existingState;
    } else {
      state = createState(workItemId);
    }
    logDebug("Fetching work item details");
    workItem = await getWorkItem(workItemId, { expand: "All", includeComments: true });
    variables = resolveConfig(workItem, configPath);
    state = updateVariables(state, variables);
    const artifactDir = outputDir ?? resolve3(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
    if (!existsSync3(artifactDir)) {
      mkdirSync2(artifactDir, { recursive: true });
    }
    const workItemPath = resolve3(artifactDir, "work-item.json");
    writeFileSync2(workItemPath, JSON.stringify(workItem, null, 2), "utf-8");
    artifacts["work-item"] = workItemPath;
    state = addArtifact(state, "work-item", workItemPath);
    const variablesPath = resolve3(artifactDir, "variables.json");
    writeFileSync2(variablesPath, JSON.stringify(variables, null, 2), "utf-8");
    artifacts["variables"] = variablesPath;
    state = addArtifact(state, "variables", variablesPath);
    const context = buildContext(workItem, variables);
    const contextPath = resolve3(artifactDir, "context.md");
    writeFileSync2(contextPath, context, "utf-8");
    artifacts["context"] = contextPath;
    state = addArtifact(state, "context", contextPath);
    saveState(state);
    timer.log("prepareTicketArtifacts");
    return {
      success: true,
      state,
      workItem,
      variables,
      artifacts,
      errors
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError("Failed to prepare ticket artifacts", { error: errorMsg });
    errors.push(errorMsg);
    return {
      success: false,
      state,
      workItem,
      variables,
      artifacts,
      errors
    };
  }
}
function resolveConfig(workItem, configPath) {
  logDebug("Resolving configuration");
  let variables;
  try {
    variables = loadTemplateVariables(configPath);
  } catch {
    variables = {};
  }
  const fields = workItem.fields;
  variables = {
    ...variables,
    workItemId: workItem.id,
    workItemType: fields["System.WorkItemType"],
    title: fields["System.Title"],
    description: fields["System.Description"],
    state: fields["System.State"],
    areaPath: fields["System.AreaPath"],
    iterationPath: fields["System.IterationPath"],
    assignedTo: typeof fields["System.AssignedTo"] === "object" ? fields["System.AssignedTo"].displayName : fields["System.AssignedTo"],
    tags: fields["System.Tags"],
    storyPoints: fields["Microsoft.VSTS.Scheduling.StoryPoints"],
    priority: fields["Microsoft.VSTS.Common.Priority"],
    acceptanceCriteria: fields["Microsoft.VSTS.Common.AcceptanceCriteria"],
    workClassType: fields["Custom.WorkClassType"],
    requiresQA: fields["Custom.RequiresQA"],
    sfComponents: fields["Custom.SFComponents"],
    technicalNotes: fields["Custom.TechnicalNotes"],
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  return variables;
}
function buildContext(workItem, variables) {
  const fields = workItem.fields;
  const lines = [];
  lines.push(`# Work Item Context`);
  lines.push("");
  lines.push(`## ${fields["System.WorkItemType"]} #${workItem.id}: ${fields["System.Title"]}`);
  lines.push("");
  lines.push("### Basic Information");
  lines.push("");
  lines.push(`- **State:** ${fields["System.State"]}`);
  lines.push(`- **Assigned To:** ${variables["assignedTo"] ?? "Unassigned"}`);
  lines.push(`- **Area Path:** ${fields["System.AreaPath"]}`);
  lines.push(`- **Iteration:** ${fields["System.IterationPath"]}`);
  if (fields["Microsoft.VSTS.Scheduling.StoryPoints"]) {
    lines.push(`- **Story Points:** ${fields["Microsoft.VSTS.Scheduling.StoryPoints"]}`);
  }
  if (fields["Microsoft.VSTS.Common.Priority"]) {
    lines.push(`- **Priority:** ${fields["Microsoft.VSTS.Common.Priority"]}`);
  }
  if (fields["Custom.WorkClassType"]) {
    lines.push(`- **Work Class:** ${fields["Custom.WorkClassType"]}`);
  }
  if (fields["Custom.RequiresQA"]) {
    lines.push(`- **Requires QA:** ${fields["Custom.RequiresQA"]}`);
  }
  lines.push("");
  if (fields["System.Description"]) {
    lines.push("### Description");
    lines.push("");
    lines.push(fields["System.Description"]);
    lines.push("");
  }
  if (fields["Microsoft.VSTS.Common.AcceptanceCriteria"]) {
    lines.push("### Acceptance Criteria");
    lines.push("");
    lines.push(fields["Microsoft.VSTS.Common.AcceptanceCriteria"]);
    lines.push("");
  }
  if (fields["Custom.TechnicalNotes"]) {
    lines.push("### Technical Notes");
    lines.push("");
    lines.push(fields["Custom.TechnicalNotes"]);
    lines.push("");
  }
  if (fields["Custom.SFComponents"]) {
    lines.push("### Salesforce Components");
    lines.push("");
    lines.push(fields["Custom.SFComponents"]);
    lines.push("");
  }
  if (fields["System.Tags"]) {
    lines.push("### Tags");
    lines.push("");
    lines.push(`${fields["System.Tags"]}`);
    lines.push("");
  }
  if (workItem.relations && workItem.relations.length > 0) {
    lines.push("### Related Work Items");
    lines.push("");
    for (const relation of workItem.relations) {
      const relType = relation.rel.replace("System.LinkTypes.", "").replace("-", " ");
      const idMatch = /\/(\d+)$/.exec(relation.url);
      const relatedId = idMatch ? idMatch[1] : "Unknown";
      lines.push(`- ${relType}: #${relatedId}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function hasArtifacts(workItemId, outputDir) {
  const artifactDir = outputDir ?? resolve3(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
  return existsSync3(resolve3(artifactDir, "work-item.json"));
}
function cleanupArtifacts(workItemId, outputDir) {
  const artifactDir = outputDir ?? resolve3(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
  if (!existsSync3(artifactDir)) {
    return;
  }
  const { rmSync } = __require("fs");
  try {
    rmSync(artifactDir, { recursive: true, force: true });
    logInfo(`Cleaned up artifacts for work item ${workItemId}`);
  } catch (error) {
    logError(`Failed to cleanup artifacts for work item ${workItemId}`, { error });
  }
}

// src/workflowRunner.ts
async function runWorkflow(options) {
  const timer = createTimer();
  const { workItemId, phases, steps, dryRun = false, verbose = false, continueOnError = false } = options;
  logInfo(`Starting workflow for work item ${workItemId}`, { dryRun, phases, steps });
  const logs = [];
  const executedSteps = [];
  const failedSteps = [];
  const outputs = {};
  let state = loadState(workItemId) ?? createState(workItemId);
  state = updateStatus(state, "in_progress");
  if (!dryRun) {
    saveState(state);
  }
  let manifests;
  try {
    manifests = loadStepManifests();
  } catch (error) {
    const errorMsg = `Failed to load step manifests: ${error instanceof Error ? error.message : String(error)}`;
    logError(errorMsg);
    return {
      success: false,
      state: updateStatus(state, "failed", errorMsg),
      executedSteps,
      failedSteps,
      outputs,
      executionTime: timer.elapsed(),
      logs
    };
  }
  let filteredManifests = manifests;
  if (phases && phases.length > 0) {
    filteredManifests = manifests.filter((m) => phases.includes(m.phase));
  }
  if (steps && steps.length > 0) {
    filteredManifests = filteredManifests.filter((m) => steps.includes(m.id));
  }
  filteredManifests.sort((a, b) => {
    if (a.phase !== b.phase) {
      return a.phase.localeCompare(b.phase);
    }
    return a.order - b.order;
  });
  logInfo(`Executing ${filteredManifests.length} steps`);
  for (const manifest of filteredManifests) {
    const stepLog = (level, message, data) => {
      const entry = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        level,
        step: manifest.id,
        message,
        data
      };
      logs.push(entry);
      if (verbose) {
        console.log(`[${level.toUpperCase()}] ${manifest.id}: ${message}`);
      }
    };
    if (state.completedSteps.includes(manifest.id)) {
      stepLog("info", "Step already completed, skipping");
      continue;
    }
    if (manifest.conditions && manifest.conditions.length > 0) {
      const conditionsMet = evaluateConditions(manifest.conditions, state);
      if (!conditionsMet) {
        stepLog("info", "Step conditions not met, skipping");
        state = skipStep(state, manifest.id);
        if (!dryRun) {
          saveState(state);
        }
        continue;
      }
    }
    if (manifest.dependencies && manifest.dependencies.length > 0) {
      const missingDeps = manifest.dependencies.filter(
        (dep) => !state.completedSteps.includes(dep)
      );
      if (missingDeps.length > 0) {
        stepLog("warn", `Missing dependencies: ${missingDeps.join(", ")}`);
        if (!continueOnError) {
          failedSteps.push(manifest.id);
          state = updateStatus(state, "failed", `Missing dependencies: ${missingDeps.join(", ")}`);
          break;
        }
        state = skipStep(state, manifest.id);
        if (!dryRun) {
          saveState(state);
        }
        continue;
      }
    }
    state = setCurrentStep(state, manifest.phase, manifest.id);
    if (!dryRun) {
      saveState(state);
    }
    stepLog("info", `Starting step: ${manifest.name}`);
    try {
      if (dryRun) {
        stepLog("info", "[DRY RUN] Would execute step");
        executedSteps.push(manifest.id);
        state = completeStep(state, manifest.id);
      } else {
        const result = await executeStep(manifest, state);
        if (result.success) {
          stepLog("info", "Step completed successfully");
          executedSteps.push(manifest.id);
          state = completeStep(state, manifest.id);
          if (result.outputs) {
            Object.assign(outputs, result.outputs);
          }
        } else {
          stepLog("error", `Step failed: ${result.error}`);
          failedSteps.push(manifest.id);
          if (!continueOnError) {
            state = updateStatus(state, "failed", result.error);
            saveState(state);
            break;
          }
        }
        saveState(state);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      stepLog("error", `Step threw exception: ${errorMsg}`);
      failedSteps.push(manifest.id);
      if (!continueOnError) {
        state = updateStatus(state, "failed", errorMsg);
        if (!dryRun) {
          saveState(state);
        }
        break;
      }
    }
  }
  if (failedSteps.length === 0) {
    state = updateStatus(state, "completed");
  } else if (state.status !== "failed") {
    state = updateStatus(state, "completed");
  }
  if (!dryRun) {
    saveState(state);
  }
  const executionTime = timer.elapsed();
  logInfo(`Workflow completed in ${executionTime}ms`, {
    executed: executedSteps.length,
    failed: failedSteps.length
  });
  return {
    success: failedSteps.length === 0,
    state,
    executedSteps,
    failedSteps,
    outputs,
    executionTime,
    logs
  };
}
async function executeStep(manifest, state) {
  logDebug(`Executing step: ${manifest.id}`);
  if (manifest.script_alternative) {
    try {
      logInfo(`Would execute: ${manifest.script_alternative}`);
      return {
        success: true,
        outputs: {}
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  logDebug(`Step ${manifest.id} requires prompt execution`);
  return {
    success: true,
    outputs: {}
  };
}
function evaluateConditions(conditions, state) {
  for (const condition of conditions) {
    const fieldValue = state.variables[condition.field];
    switch (condition.operator) {
      case "equals":
        if (fieldValue !== condition.value) return false;
        break;
      case "notEquals":
        if (fieldValue === condition.value) return false;
        break;
      case "contains":
        if (typeof fieldValue !== "string" || !fieldValue.includes(String(condition.value))) {
          return false;
        }
        break;
      case "exists":
        if (fieldValue === void 0 || fieldValue === null) return false;
        break;
      case "notExists":
        if (fieldValue !== void 0 && fieldValue !== null) return false;
        break;
    }
  }
  return true;
}
function generateWorkflowPlan(options) {
  const { workItemId, phases, steps } = options;
  logInfo(`Generating workflow plan for work item ${workItemId}`);
  let manifests;
  try {
    manifests = loadStepManifests();
  } catch {
    manifests = [];
  }
  let filteredManifests = manifests;
  if (phases && phases.length > 0) {
    filteredManifests = manifests.filter((m) => phases.includes(m.phase));
  }
  if (steps && steps.length > 0) {
    filteredManifests = filteredManifests.filter((m) => steps.includes(m.id));
  }
  filteredManifests.sort((a, b) => {
    if (a.phase !== b.phase) {
      return a.phase.localeCompare(b.phase);
    }
    return a.order - b.order;
  });
  const phaseGroups = /* @__PURE__ */ new Map();
  for (const manifest of filteredManifests) {
    if (!phaseGroups.has(manifest.phase)) {
      phaseGroups.set(manifest.phase, []);
    }
    phaseGroups.get(manifest.phase).push(manifest);
  }
  const planPhases = [];
  for (const [phaseName, phaseSteps] of phaseGroups) {
    planPhases.push({
      name: phaseName,
      steps: phaseSteps.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        dependencies: s.dependencies ?? [],
        hasScriptAlternative: !!s.script_alternative
      }))
    });
  }
  return {
    workItemId,
    totalSteps: filteredManifests.length,
    phases: planPhases
  };
}
function getAvailablePhases() {
  try {
    const manifests = loadStepManifests();
    const phases = new Set(manifests.map((m) => m.phase));
    return Array.from(phases).sort();
  } catch {
    return [];
  }
}
function getStepsForPhase(phase) {
  try {
    const manifests = loadStepManifests();
    return manifests.filter((m) => m.phase === phase).sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

// src/workflowExecutor.ts
import { execSync as execSync2, spawn } from "child_process";
import { existsSync as existsSync4, readFileSync as readFileSync4 } from "fs";
import { resolve as resolve4 } from "path";
async function executePhase(options) {
  const timer = createTimer();
  const { phaseName, steps, state, dryRun = false, verbose = false } = options;
  logInfo(`Executing phase: ${phaseName}`, { stepCount: steps.length });
  const executedSteps = [];
  const failedSteps = [];
  const logs = [];
  for (const step of steps) {
    const log = (level, message) => {
      logs.push({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        level,
        step: step.id,
        message
      });
      if (verbose) {
        console.log(`[${phaseName}/${step.id}] ${message}`);
      }
    };
    log("info", `Starting step: ${step.name}`);
    try {
      const result = await executeStep2({
        manifest: step,
        state,
        dryRun,
        verbose,
        timeout: options.timeout
      });
      if (result.success) {
        log("info", "Step completed");
        executedSteps.push(step.id);
      } else {
        log("error", `Step failed: ${result.error}`);
        failedSteps.push(step.id);
      }
    } catch (error) {
      log("error", `Step threw exception: ${error instanceof Error ? error.message : String(error)}`);
      failedSteps.push(step.id);
    }
  }
  const duration = timer.elapsed();
  logInfo(`Phase ${phaseName} completed in ${duration}ms`, {
    executed: executedSteps.length,
    failed: failedSteps.length
  });
  return {
    success: failedSteps.length === 0,
    phaseName,
    executedSteps,
    failedSteps,
    logs,
    duration
  };
}
async function executeStep2(options) {
  const timer = createTimer();
  const { manifest, state, dryRun = false, verbose = false, timeout = 3e5 } = options;
  logDebug(`Executing step: ${manifest.id}`);
  if (dryRun) {
    logDebug(`[DRY RUN] Would execute: ${manifest.name}`);
    return {
      success: true,
      stepId: manifest.id,
      output: "[DRY RUN] Step would be executed",
      duration: timer.elapsed()
    };
  }
  if (manifest.script_alternative) {
    return executeScriptAlternative(manifest, state, timeout);
  }
  logDebug(`Step ${manifest.id} requires prompt-based execution`);
  return {
    success: true,
    stepId: manifest.id,
    output: "Step requires prompt-based execution",
    duration: timer.elapsed()
  };
}
async function executeScriptAlternative(manifest, state, timeout) {
  const timer = createTimer();
  const command = manifest.script_alternative;
  logInfo(`Executing script: ${command}`);
  try {
    let resolvedCommand = command;
    for (const [key, value] of Object.entries(state.variables)) {
      if (value !== void 0 && value !== null) {
        resolvedCommand = resolvedCommand.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          String(value)
        );
      }
    }
    logDebug(`Resolved command: ${resolvedCommand}`);
    const output2 = execSync2(resolvedCommand, {
      encoding: "utf-8",
      timeout,
      cwd: process.cwd(),
      env: {
        ...process.env,
        WORK_ITEM_ID: String(state.workItemId)
      }
    });
    return {
      success: true,
      stepId: manifest.id,
      output: output2.trim(),
      duration: timer.elapsed()
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(`Script failed: ${errorMsg}`);
    return {
      success: false,
      stepId: manifest.id,
      error: errorMsg,
      duration: timer.elapsed()
    };
  }
}
function executeCommandAsync(command, args, options = {}) {
  return new Promise((resolve5, reject) => {
    const { cwd, env, onStdout, onStderr, timeout = 3e5 } = options;
    let stdout = "";
    let stderr = "";
    let killed = false;
    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: true
    });
    const timeoutId = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
    }, timeout);
    proc.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      if (onStdout) onStdout(text);
    });
    proc.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      if (onStderr) onStderr(text);
    });
    proc.on("close", (exitCode) => {
      clearTimeout(timeoutId);
      if (killed) {
        reject(new Error("Command timed out"));
      } else {
        resolve5({
          exitCode: exitCode ?? 1,
          stdout,
          stderr
        });
      }
    });
    proc.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}
function checkStepInputs(manifest, state) {
  const missing = [];
  for (const input of manifest.inputs) {
    if (!input.required) continue;
    if (input.source?.startsWith("variable:")) {
      const varName = input.source.replace("variable:", "");
      if (state.variables[varName] === void 0) {
        missing.push(input.name);
      }
      continue;
    }
    if (input.source?.startsWith("artifact:")) {
      const artifactName = input.source.replace("artifact:", "");
      if (!state.artifacts[artifactName]) {
        missing.push(input.name);
      }
      continue;
    }
    if (input.type === "file") {
      const filePath = state.artifacts[input.name];
      if (!filePath || !existsSync4(filePath)) {
        missing.push(input.name);
      }
    }
  }
  return {
    available: missing.length === 0,
    missing
  };
}
function collectStepOutputs(manifest, result, state) {
  const outputs = {};
  for (const output2 of manifest.outputs) {
    if (output2.type === "file" && output2.path) {
      const filePath = resolve4(process.cwd(), output2.path);
      if (existsSync4(filePath)) {
        outputs[output2.name] = filePath;
        if (output2.type === "json") {
          try {
            const content = readFileSync4(filePath, "utf-8");
            outputs[`${output2.name}_content`] = JSON.parse(content);
          } catch {
          }
        }
      }
    } else if (output2.type === "string" && result.output) {
      outputs[output2.name] = result.output;
    }
  }
  return outputs;
}
function formatStepResult(result) {
  const status = result.success ? "SUCCESS" : "FAILED";
  const duration = `${result.duration}ms`;
  let message = `[${status}] ${result.stepId} (${duration})`;
  if (!result.success && result.error) {
    message += `
  Error: ${result.error}`;
  }
  if (result.output) {
    const truncatedOutput = result.output.length > 200 ? `${result.output.substring(0, 200)}...` : result.output;
    message += `
  Output: ${truncatedOutput}`;
  }
  return message;
}
export {
  ADO_FIELDS,
  ADO_RESOURCE_ID,
  DEFAULT_ADO_ORG,
  DEFAULT_ADO_PROJECT,
  LINK_TYPE_MAP,
  LINK_TYPE_REVERSE_MAP,
  SF_DEFAULTS,
  WIKI_DEFAULTS,
  addArtifact,
  analyzeCustomMetadata,
  analyzeProcessBuilders,
  analyzeRecordTriggeredFlows,
  analyzeStandardFields,
  analyzeWorkflows,
  buildSOQL,
  calculateImpactScore,
  canResume,
  checkStepInputs,
  cleanupArtifacts,
  cleanupOldStates,
  collectStepOutputs,
  completeStep,
  createAdoConnection,
  createSfConnection,
  createState,
  createWikiPage,
  createWorkItem,
  describeField,
  describeObject,
  detectCycles,
  discoverDependencies,
  enrichWithUsagePills,
  executeCommandAsync,
  executePhase,
  executeSoqlQuery,
  executeStep2 as executeStep,
  executeToolingQuery,
  exportGraphToDot,
  exportGraphToJson,
  extractSubgraph,
  extractWorkItemIdFromUrl,
  filterPillsBySeverity,
  filterPillsByType,
  formatPillsForDisplay,
  formatStepResult,
  generateWorkflowPlan,
  getAllDependencies,
  getAllDependents,
  getAvailablePhases,
  getAzureBearerToken,
  getLeafNodes,
  getNodesAtDepth,
  getPathToNode,
  getPillsSummary,
  getProgress,
  getRootNodes,
  getSfConnection,
  getStateSummary,
  getStepsForPhase,
  getWikiPage,
  getWorkItem,
  getWorkItemRelations,
  groupPillsBySeverity,
  hasArtifacts,
  isStepCompleted,
  isStepSkipped,
  linkWorkItems,
  listStates,
  loadState,
  logError,
  logEvent,
  logInfo,
  logWarn,
  parseLinkType,
  prepareTicketArtifacts,
  resetState,
  resolveLinkType,
  retryWithBackoff,
  runAllAnalyzers,
  runWorkflow,
  saveState,
  searchWorkItems,
  setCurrentStep,
  skipStep,
  sortByImpact,
  traverseDependencies,
  updateStatus,
  updateVariables,
  updateWikiPage,
  updateWorkItem,
  validateAzureAuth,
  validateSfAuth
};
//# sourceMappingURL=index.js.map