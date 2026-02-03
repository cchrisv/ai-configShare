#!/usr/bin/env node

// cli/sf-tools.ts
import { Command } from "commander";

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

// src/types/sfMetadataTypes.ts
var SF_DEFAULTS = {
  ORG_ALIAS: "production",
  API_VERSION: "59.0"
};

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
async function queryAll(query, config2) {
  const timer = createTimer();
  logInfo("Executing queryAll");
  logDebug("Query", { query });
  const { connection } = await createSfConnection(config2);
  const allRecords = [];
  const result = await retryWithBackoff(
    () => connection.query(query),
    { ...RETRY_PRESETS.standard, operationName: "queryAll-initial" }
  );
  allRecords.push(...result.records);
  let nextRecordsUrl = result.nextRecordsUrl;
  while (nextRecordsUrl) {
    logDebug(`Fetching more records from ${nextRecordsUrl}`);
    const moreResult = await retryWithBackoff(
      () => connection.queryMore(nextRecordsUrl),
      { ...RETRY_PRESETS.standard, operationName: "queryAll-more" }
    );
    allRecords.push(...moreResult.records);
    nextRecordsUrl = moreResult.nextRecordsUrl;
  }
  logInfo(`queryAll returned ${allRecords.length} total records`);
  timer.log("queryAll");
  return allRecords;
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
async function getEntityDefinition(objectName, config2) {
  const timer = createTimer();
  logInfo(`Getting entity definition: ${objectName}`);
  const query = `
    SELECT Id, DurableId, QualifiedApiName, NamespacePrefix, DeveloperName,
           MasterLabel, Label, PluralLabel, KeyPrefix, IsCustomSetting,
           IsCustomizable, IsApexTriggerable, IsWorkflowEnabled, IsProcessEnabled,
           IsLayoutable, IsCompactLayoutable, DeploymentStatus, IsSearchable,
           IsQueryable, IsIdEnabled, IsReplicateable, IsRetrieveable,
           IsCreateable, IsUpdateable, IsDeletable, IsUndeletable, IsMergeable,
           InternalSharingModel, ExternalSharingModel, PublisherId
    FROM EntityDefinition
    WHERE QualifiedApiName = '${objectName}'
  `;
  const result = await executeToolingQuery(query, config2);
  timer.log(`getEntityDefinition(${objectName})`);
  return result.records[0];
}
async function getApexClasses(namePattern, config2) {
  const timer = createTimer();
  logInfo("Getting Apex classes", { namePattern });
  let query = `
    SELECT Id, Name, NamespacePrefix, ApiVersion, Status, IsValid, LengthWithoutComments
    FROM ApexClass
  `;
  if (namePattern) {
    query += ` WHERE Name LIKE '${namePattern}'`;
  }
  query += " ORDER BY Name";
  const result = await executeToolingQuery(query, config2);
  logInfo(`Got ${result.records.length} Apex classes`);
  timer.log("getApexClasses");
  return result.records;
}
async function getApexTriggers(objectName, config2) {
  const timer = createTimer();
  logInfo("Getting Apex triggers", { objectName });
  let query = `
    SELECT Id, Name, NamespacePrefix, TableEnumOrId, ApiVersion, Status, IsValid,
           LengthWithoutComments, UsageBeforeInsert, UsageAfterInsert,
           UsageBeforeUpdate, UsageAfterUpdate, UsageBeforeDelete,
           UsageAfterDelete, UsageAfterUndelete, UsageIsBulk
    FROM ApexTrigger
  `;
  if (objectName) {
    query += ` WHERE TableEnumOrId = '${objectName}'`;
  }
  query += " ORDER BY Name";
  const result = await executeToolingQuery(query, config2);
  logInfo(`Got ${result.records.length} Apex triggers`);
  timer.log("getApexTriggers");
  return result.records;
}
async function getValidationRules(objectName, activeOnly = true, config2) {
  const timer = createTimer();
  logInfo(`Getting validation rules for: ${objectName}`);
  const entity = await getEntityDefinition(objectName, config2);
  if (!entity) {
    throw new Error(`Entity ${objectName} not found`);
  }
  let query = `
    SELECT Id, ValidationName, EntityDefinitionId, Active, Description,
           ErrorDisplayField, ErrorMessage, FullName, Metadata
    FROM ValidationRule
    WHERE EntityDefinitionId = '${entity.DurableId}'
  `;
  if (activeOnly) {
    query += " AND Active = true";
  }
  const result = await executeToolingQuery(query, config2);
  logInfo(`Got ${result.records.length} validation rules for ${objectName}`);
  timer.log(`getValidationRules(${objectName})`);
  return result.records;
}
async function getFlows(objectName, activeOnly = true, config2) {
  const timer = createTimer();
  logInfo("Getting flows", { objectName, activeOnly });
  let query = `
    SELECT Id, DeveloperName, MasterLabel, NamespacePrefix, ApiVersion,
           ProcessType, Status, Description, TriggerType, TriggerObjectOrEvent,
           RecordTriggerType, IsActive, IsTemplate, RunInMode,
           LastModifiedDate, LastModifiedById
    FROM Flow
  `;
  const conditions = [];
  if (objectName) {
    conditions.push(`TriggerObjectOrEvent = '${objectName}'`);
  }
  if (activeOnly) {
    conditions.push("IsActive = true");
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }
  query += " ORDER BY MasterLabel";
  const result = await executeToolingQuery(query, config2);
  logInfo(`Got ${result.records.length} flows`);
  timer.log("getFlows");
  return result.records;
}
async function getCustomObjects(config2) {
  const timer = createTimer();
  logInfo("Getting custom objects");
  const query = `
    SELECT QualifiedApiName
    FROM EntityDefinition
    WHERE IsCustomizable = true AND IsCustomSetting = false
    ORDER BY QualifiedApiName
  `;
  const result = await executeToolingQuery(query, config2);
  const customObjects = result.records.map((r) => r.QualifiedApiName).filter((name) => name.endsWith("__c"));
  logInfo(`Got ${customObjects.length} custom objects`);
  timer.log("getCustomObjects");
  return customObjects;
}

// src/sfDependencyTraverser.ts
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

// cli/sf-tools.ts
var program = new Command();
program.name("sf-tools").description("Salesforce query and metadata operations").version("2.0.0");
program.command("query <soql>").description("Execute a SOQL query").option("--tooling", "Use Tooling API").option("--all", "Fetch all records (handle pagination)").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (soql, options) => {
  try {
    if (options.json || !options.verbose) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    let result;
    if (options.all && !options.tooling) {
      result = await queryAll(soql, { alias: options.org });
      console.log(JSON.stringify({ totalSize: result.length, records: result }, null, 2));
    } else if (options.tooling) {
      result = await executeToolingQuery(soql, { alias: options.org });
      console.log(JSON.stringify(result, null, 2));
    } else {
      result = await executeSoqlQuery(soql, { alias: options.org });
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("describe <objectName>").description("Describe an SObject").option("-f, --field <fieldName>", "Describe a specific field").option("--fields-only", "Only output field information").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (objectName, options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    if (options.field) {
      const field = await describeField(objectName, options.field, { alias: options.org });
      console.log(JSON.stringify(field, null, 2));
    } else {
      const describe = await describeObject(objectName, { alias: options.org });
      if (options.fieldsOnly) {
        console.log(JSON.stringify(describe.fields, null, 2));
      } else {
        console.log(JSON.stringify(describe, null, 2));
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("discover").description("Discover metadata dependencies").requiredOption("--type <type>", "Metadata type (CustomObject, CustomField, ApexClass, etc.)").requiredOption("--name <name>", "Component name").option("--depth <n>", "Maximum traversal depth", parseInt, 3).option("--include-standard", "Include standard objects").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    const result = await discoverDependencies(
      {
        rootType: options.type,
        rootName: options.name,
        maxDepth: options.depth,
        includeStandardObjects: options.includeStandard
      },
      { alias: options.org }
    );
    const output2 = {
      graph: JSON.parse(exportGraphToJson(result.graph)),
      pills: result.pills,
      warnings: result.warnings,
      executionTime: result.executionTime
    };
    console.log(JSON.stringify(output2, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("apex-classes").description("List Apex classes").option("--pattern <pattern>", "Name pattern (use % for wildcard)").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    const classes = await getApexClasses(options.pattern, { alias: options.org });
    console.log(JSON.stringify(classes, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("apex-triggers").description("List Apex triggers").option("--object <name>", "Filter by object name").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    const triggers = await getApexTriggers(options.object, { alias: options.org });
    console.log(JSON.stringify(triggers, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("validation-rules <objectName>").description("List validation rules for an object").option("--all", "Include inactive rules").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (objectName, options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    const rules = await getValidationRules(objectName, !options.all, { alias: options.org });
    console.log(JSON.stringify(rules, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("flows").description("List flows").option("--object <name>", "Filter by trigger object").option("--all", "Include inactive flows").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    const flows = await getFlows(options.object, !options.all, { alias: options.org });
    console.log(JSON.stringify(flows, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("custom-objects").description("List custom objects").option("-o, --org <alias>", "Org alias (uses default org if not specified)").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    } else {
      configureLogger({ silent: true });
    }
    const objects = await getCustomObjects({ alias: options.org });
    console.log(JSON.stringify(objects, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.parse();
//# sourceMappingURL=sf-tools.js.map