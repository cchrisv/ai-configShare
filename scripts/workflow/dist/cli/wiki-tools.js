#!/usr/bin/env node

// cli/wiki-tools.ts
import { Command } from "commander";

// src/adoWikiPages.ts
import { readFileSync } from "fs";

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

// src/types/adoWikiTypes.ts
var WIKI_DEFAULTS = {
  WIKI_NAME: "Digital Platforms Wiki",
  PROJECT: "Digital Platforms"
};

// src/adoWikiPages.ts
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
async function deletePageRest(orgUrl, project, wikiIdentifier, path) {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();
  params.set("path", path);
  params.set("api-version", "7.1");
  const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages?${params.toString()}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wiki API error (${response.status}): ${errorText}`);
  }
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
async function deleteWikiPage(path, wikiId, config2) {
  const timer = createTimer();
  logInfo(`Deleting wiki page: ${path}`);
  const orgUrl = config2?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(wikiId);
  await retryWithBackoff(
    () => deletePageRest(orgUrl, project, wikiIdentifier, path),
    { ...RETRY_PRESETS.standard, operationName: `deleteWikiPage(${path})` }
  );
  logInfo(`Successfully deleted wiki page: ${path}`);
  timer.log(`deleteWikiPage(${path})`);
}
async function searchWikiPages(searchText, wikiId, config2) {
  const timer = createTimer();
  logInfo(`Searching wiki for: ${searchText}`);
  try {
    const allPages = await getAllWikiPagesRecursive("/", wikiId, config2);
    const searchLower = searchText.toLowerCase();
    const matchingPages = allPages.filter((page) => {
      const pathLower = page.path.toLowerCase();
      return pathLower.includes(searchLower);
    });
    logDebug(`Found ${matchingPages.length} wiki pages matching "${searchText}"`);
    timer.log(`searchWikiPages(${searchText})`);
    return matchingPages;
  } catch (error) {
    logError(`Wiki search failed: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}
async function getAllWikiPagesRecursive(path, wikiId, config2) {
  const orgUrl = config2?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(wikiId);
  const page = await retryWithBackoff(
    () => getPageRest(orgUrl, project, wikiIdentifier, path, {
      includeContent: false,
      recursionLevel: 120
      // Full recursion (OneLevel=1, Full=120)
    }),
    { ...RETRY_PRESETS.standard, operationName: `getAllWikiPages(${path})` }
  );
  if (!page) {
    return [];
  }
  const result = [];
  if (page.path && page.path !== "/") {
    result.push(convertWikiPage(page));
  }
  function collectSubPages(p) {
    if (p.subPages) {
      for (const subPage of p.subPages) {
        result.push(convertWikiPage(subPage));
        collectSubPages(subPage);
      }
    }
  }
  collectSubPages(page);
  return result;
}
async function listWikiPages(path, wikiId, config2) {
  const timer = createTimer();
  const pagePath = path ?? "/";
  logInfo(`Listing wiki pages under: ${pagePath}`);
  const orgUrl = config2?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config2?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(wikiId);
  const page = await retryWithBackoff(
    () => getPageRest(orgUrl, project, wikiIdentifier, pagePath, {
      includeContent: false,
      recursionLevel: 1
      // OneLevel
    }),
    { ...RETRY_PRESETS.standard, operationName: `listWikiPages(${pagePath})` }
  );
  if (!page) {
    return [];
  }
  const result = page.subPages?.map(convertWikiPage) ?? [];
  logDebug(`Found ${result.length} wiki pages under ${pagePath}`);
  timer.log(`listWikiPages(${pagePath})`);
  return result;
}

// cli/wiki-tools.ts
var program = new Command();
program.name("wiki-tools").description("Azure DevOps wiki operations").version("2.0.0");
program.command("get").description("Get a wiki page").option("--page-id <id>", "Page ID").option("-p, --path <path>", "Page path").option("--wiki <id>", "Wiki ID or name").option("--no-content", "Exclude content").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    if (!options.pageId && !options.path) {
      console.error("Error: Either --page-id or --path must be specified");
      process.exit(1);
    }
    const page = await getWikiPage({
      pageId: options.pageId ? parseInt(options.pageId, 10) : void 0,
      path: options.path,
      wikiId: options.wiki,
      includeContent: options.content !== false
    });
    console.log(JSON.stringify(page, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("update").description("Update a wiki page").option("--page-id <id>", "Page ID").option("-p, --path <path>", "Page path").option("-c, --content <content>", "Content (string or file path)").option("--comment <comment>", "Update comment").option("--wiki <id>", "Wiki ID or name").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    if (!options.path) {
      console.error("Error: --path must be specified");
      process.exit(1);
    }
    if (!options.content) {
      console.error("Error: --content must be specified");
      process.exit(1);
    }
    const result = await updateWikiPage({
      pageId: options.pageId ? parseInt(options.pageId, 10) : void 0,
      path: options.path,
      content: options.content,
      comment: options.comment,
      wikiId: options.wiki
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("create").description("Create a new wiki page").requiredOption("-p, --path <path>", "Page path").requiredOption("-c, --content <content>", "Content (string or file path)").option("--comment <comment>", "Creation comment").option("--wiki <id>", "Wiki ID or name").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const result = await createWikiPage({
      path: options.path,
      content: options.content,
      comment: options.comment,
      wikiId: options.wiki
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("delete").description("Delete a wiki page").requiredOption("-p, --path <path>", "Page path").option("--wiki <id>", "Wiki ID or name").option("--force", "Skip confirmation").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    if (!options.force) {
      console.error("Error: Use --force to confirm deletion");
      process.exit(1);
    }
    await deleteWikiPage(options.path, options.wiki);
    console.log(`Deleted wiki page: ${options.path}`);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("list").description("List wiki pages").option("-p, --path <path>", "Parent path", "/").option("--wiki <id>", "Wiki ID or name").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const pages = await listWikiPages(options.path, options.wiki);
    console.log(JSON.stringify(pages, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.command("search <text>").description("Search wiki pages by keyword").option("--wiki <id>", "Wiki ID or name").option("--json", "Output as JSON (default)").option("-v, --verbose", "Verbose output").action(async (text, options) => {
  try {
    if (options.json) {
      configureLogger({ silent: true });
    } else if (options.verbose) {
      configureLogger({ minLevel: "debug" });
    }
    const pages = await searchWikiPages(text, options.wiki);
    if (options.json || true) {
      console.log(JSON.stringify({
        searchText: text,
        count: pages.length,
        pages
      }, null, 2));
    } else {
      console.log(`Found ${pages.length} wiki pages matching "${text}":`);
      for (const page of pages) {
        console.log(`  ${page.path}`);
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.parse();
//# sourceMappingURL=wiki-tools.js.map