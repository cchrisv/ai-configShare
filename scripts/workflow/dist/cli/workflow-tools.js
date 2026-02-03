#!/usr/bin/env node

// cli/workflow-tools.ts
import { Command } from "commander";
import { existsSync as existsSync2, mkdirSync, writeFileSync, readFileSync as readFileSync2, readdirSync, rmSync } from "fs";
import { resolve as resolve2 } from "path";

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
  return new Promise((resolve3) => setTimeout(resolve3, ms));
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

// src/lib/configLoader.ts
import { readFileSync, existsSync } from "fs";
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
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}
function loadSharedConfig(configPath) {
  const path = configPath ?? resolve(getConfigDir(), "shared.json");
  return loadJsonFile(path);
}

// cli/workflow-tools.ts
var program = new Command();
program.name("workflow-tools").description("Workflow automation operations").version("2.0.0");
program.command("prepare").description("Initialize workflow artifacts for a work item").requiredOption("-w, --work-item <id>", "Work item ID", parseInt).option("--force", "Overwrite existing run state").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const workItemId = options.workItem;
    const config2 = loadSharedConfig();
    const projectRoot = getProjectRoot();
    const artifactsRoot = config2.paths.artifacts_root;
    const root = resolve2(projectRoot, artifactsRoot, String(workItemId));
    const researchDir = resolve2(root, "research");
    const groomingDir = resolve2(root, "grooming");
    const solutioningDir = resolve2(root, "solutioning");
    const wikiDir = resolve2(root, "wiki");
    const runStatePath = resolve2(root, "run-state.json");
    if (existsSync2(runStatePath) && !options.force) {
      const result2 = {
        success: false,
        message: `Workflow already initialized for ${workItemId}. Use --force to reinitialize.`,
        runStatePath
      };
      console.log(options.json ? JSON.stringify(result2, null, 2) : result2.message);
      process.exit(0);
    }
    const workItem = await getWorkItem(workItemId, { expand: "All" });
    const dirsCreated = [];
    for (const dir of [root, researchDir, groomingDir, solutioningDir, wikiDir]) {
      if (!existsSync2(dir)) {
        mkdirSync(dir, { recursive: true });
        dirsCreated.push(dir);
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const runState = {
      workItemId: String(workItemId),
      version: 1,
      currentPhase: "research",
      phaseOrder: ["research", "grooming", "solutioning", "wiki", "finalization"],
      completedSteps: [],
      errors: [],
      metrics: {
        phases: {},
        startedAt: now
      },
      lastUpdated: now
    };
    writeFileSync(runStatePath, JSON.stringify(runState, null, 2), "utf-8");
    const workItemPath = resolve2(researchDir, config2.artifact_files.research.ado_workitem);
    writeFileSync(workItemPath, JSON.stringify(workItem, null, 2), "utf-8");
    const result = {
      success: true,
      workItemId,
      workItemType: workItem.fields["System.WorkItemType"],
      title: workItem.fields["System.Title"],
      directories: {
        root,
        research: researchDir,
        grooming: groomingDir,
        solutioning: solutioningDir,
        wiki: wikiDir
      },
      files: {
        runState: runStatePath,
        workItemSnapshot: workItemPath
      },
      message: `Workflow initialized for ${workItemId}. Next: Run research phase.`
    };
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\u2713 Initialized workflow for ${workItem.fields["System.WorkItemType"]} #${workItemId}`);
      console.log(`  Title: ${workItem.fields["System.Title"]}`);
      console.log(`  Run state: ${runStatePath}`);
      console.log(`  Next step: Run research phase`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("status").description("Get workflow status").requiredOption("-w, --work-item <id>", "Work item ID", parseInt).option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const workItemId = options.workItem;
    const config2 = loadSharedConfig();
    const projectRoot = getProjectRoot();
    const artifactsRoot = config2.paths.artifacts_root;
    const root = resolve2(projectRoot, artifactsRoot, String(workItemId));
    const runStatePath = resolve2(root, "run-state.json");
    if (!existsSync2(runStatePath)) {
      const result2 = {
        success: false,
        workItemId,
        message: `No workflow found for ${workItemId}. Run 'workflow-tools prepare' first.`
      };
      console.log(options.json ? JSON.stringify(result2, null, 2) : result2.message);
      process.exit(1);
    }
    const runState = JSON.parse(readFileSync2(runStatePath, "utf-8"));
    const countFiles = (dir) => {
      if (!existsSync2(dir)) return 0;
      return readdirSync(dir).length;
    };
    const result = {
      success: true,
      workItemId,
      currentPhase: runState.currentPhase,
      completedSteps: runState.completedSteps.length,
      errors: runState.errors.length,
      artifacts: {
        research: countFiles(resolve2(root, "research")),
        grooming: countFiles(resolve2(root, "grooming")),
        solutioning: countFiles(resolve2(root, "solutioning")),
        wiki: countFiles(resolve2(root, "wiki"))
      },
      startedAt: runState.metrics?.startedAt,
      lastUpdated: runState.lastUpdated
    };
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Workflow Status for #${workItemId}`);
      console.log(`  Current Phase: ${runState.currentPhase}`);
      console.log(`  Completed Steps: ${runState.completedSteps.length}`);
      console.log(`  Errors: ${runState.errors.length}`);
      console.log(`  Artifacts: research=${result.artifacts.research}, grooming=${result.artifacts.grooming}, solutioning=${result.artifacts.solutioning}, wiki=${result.artifacts.wiki}`);
      console.log(`  Started: ${runState.metrics?.startedAt || "N/A"}`);
      console.log(`  Last Updated: ${runState.lastUpdated}`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("reset").description("Reset workflow state (all phases or specific phase)").requiredOption("-w, --work-item <id>", "Work item ID", parseInt).option("-p, --phase <phase>", "Specific phase to reset (research, grooming, solutioning, wiki)").option("--force", "Skip confirmation").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    if (!options.force) {
      const scope = options.phase ? `${options.phase} phase` : "all artifacts";
      console.error(`Error: Use --force to confirm reset. This will delete ${scope}.`);
      process.exit(1);
    }
    const workItemId = options.workItem;
    const phase = options.phase;
    const validPhases = ["research", "grooming", "solutioning", "wiki"];
    if (phase && !validPhases.includes(phase)) {
      console.error(`Error: Invalid phase '${phase}'. Valid phases: ${validPhases.join(", ")}`);
      process.exit(1);
    }
    const config2 = loadSharedConfig();
    const projectRoot = getProjectRoot();
    const artifactsRoot = config2.paths.artifacts_root;
    const root = resolve2(projectRoot, artifactsRoot, String(workItemId));
    if (!existsSync2(root)) {
      const result = {
        success: false,
        workItemId,
        message: `No workflow found for ${workItemId}.`
      };
      console.log(options.json ? JSON.stringify(result, null, 2) : result.message);
      process.exit(0);
    }
    if (phase) {
      const phaseDir = resolve2(root, phase);
      const deletedFiles = [];
      if (existsSync2(phaseDir)) {
        const files = readdirSync(phaseDir);
        deletedFiles.push(...files);
        rmSync(phaseDir, { recursive: true, force: true });
        mkdirSync(phaseDir, { recursive: true });
      }
      const runStatePath = resolve2(root, "run-state.json");
      if (existsSync2(runStatePath)) {
        const runState = JSON.parse(readFileSync2(runStatePath, "utf-8"));
        runState.completedSteps = runState.completedSteps.filter(
          (step) => !step.toLowerCase().includes(phase)
        );
        const phaseIndex = runState.phaseOrder.indexOf(phase);
        const currentIndex = runState.phaseOrder.indexOf(runState.currentPhase);
        if (phaseIndex <= currentIndex) {
          runState.currentPhase = phase;
        }
        if (runState.metrics?.phases?.[phase]) {
          delete runState.metrics.phases[phase];
        }
        runState.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        writeFileSync(runStatePath, JSON.stringify(runState, null, 2), "utf-8");
      }
      const result = {
        success: true,
        workItemId,
        phase,
        deletedFiles: deletedFiles.length,
        message: `Phase '${phase}' reset for ${workItemId}. ${deletedFiles.length} files deleted.`,
        deletedPath: phaseDir
      };
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\u2713 Phase '${phase}' reset for #${workItemId}`);
        console.log(`  Deleted: ${deletedFiles.length} files from ${phaseDir}`);
        console.log(`  Run state updated`);
      }
    } else {
      rmSync(root, { recursive: true, force: true });
      const result = {
        success: true,
        workItemId,
        phase: "all",
        message: `Workflow reset for ${workItemId}. All artifacts deleted.`,
        deletedPath: root
      };
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\u2713 Workflow reset for #${workItemId}`);
        console.log(`  Deleted: ${root}`);
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.parse();
//# sourceMappingURL=workflow-tools.js.map