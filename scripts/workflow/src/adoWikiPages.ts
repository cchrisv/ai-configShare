/**
 * Azure DevOps Wiki Pages
 * Operations for managing wiki pages
 * 
 * NOTE: The azure-devops-node-api package has limited wiki page support.
 * It only provides stream-based methods (getPageText, getPageZip) not JSON responses.
 * We use direct REST API calls for all page operations.
 * See: https://github.com/microsoft/azure-devops-node-api/issues/416
 */

import { readFileSync } from 'fs';
import type { 
  WikiPage as AdoWikiPage,
} from 'azure-devops-node-api/interfaces/WikiInterfaces.js';
import { getAzureBearerToken, validateAzureAuth } from './lib/authAzureCli.js';
import { retryWithBackoff, RETRY_PRESETS } from './lib/retryWithBackoff.js';
import { logInfo, logDebug, logError, createTimer } from './lib/loggerStructured.js';
import { DEFAULT_ADO_ORG, DEFAULT_ADO_PROJECT } from './types/adoFieldTypes.js';
import type { AdoConnectionConfig } from './adoClient.js';
import type {
  WikiPage,
  WikiPageWithContent,
  GetWikiPageOptions,
  UpdateWikiPageOptions,
  CreateWikiPageOptions,
  WikiPageUpdateResult,
} from './types/adoWikiTypes.js';
import { WIKI_DEFAULTS } from './types/adoWikiTypes.js';

/**
 * Response from wiki page create/update REST API
 */
interface WikiPageCreateUpdateResponse {
  page: AdoWikiPage;
  eTag: string;
}

/**
 * Get authorization headers for REST API calls
 */
function getAuthHeaders(): Record<string, string> {
  validateAzureAuth();
  const token = getAzureBearerToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Build REST API URL for wiki pages
 */
function buildWikiPageUrl(
  orgUrl: string,
  project: string,
  wikiIdentifier: string,
  path: string,
  queryParams?: Record<string, string | number | boolean | undefined>
): string {
  const encodedPath = encodeURIComponent(path);
  const baseUrl = `${orgUrl}/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages`;
  
  const params = new URLSearchParams();
  params.set('path', path);
  params.set('api-version', '7.1');
  
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Convert ADO Wiki page to our WikiPage type
 */
function convertWikiPage(page: AdoWikiPage): WikiPage {
  return {
    id: page.id ?? 0,
    path: page.path ?? '',
    url: page.url ?? '',
    remoteUrl: page.remoteUrl ?? '',
    gitItemPath: page.gitItemPath,
    content: page.content,
    order: page.order,
    isParentPage: page.isParentPage,
    subPages: page.subPages?.map(convertWikiPage),
  };
}

/**
 * Get wiki identifier (name or ID)
 */
function getWikiIdentifier(wikiId: string | undefined): string {
  return wikiId ?? WIKI_DEFAULTS.WIKI_NAME;
}

/**
 * Make a REST API call to get a wiki page
 */
async function getPageRest(
  orgUrl: string,
  project: string,
  wikiIdentifier: string,
  path: string,
  options?: {
    includeContent?: boolean;
    recursionLevel?: number;
  }
): Promise<AdoWikiPage> {
  const headers = getAuthHeaders();
  
  const queryParams: Record<string, string | number | boolean | undefined> = {
    includeContent: options?.includeContent ?? true,
    recursionLevel: options?.recursionLevel,
  };
  
  const url = buildWikiPageUrl(orgUrl, project, wikiIdentifier, path, queryParams);
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wiki API error (${response.status}): ${errorText}`);
  }
  
  const page = await response.json() as AdoWikiPage;
  return page;
}

/**
 * Make a REST API call to create or update a wiki page
 */
async function createOrUpdatePageRest(
  orgUrl: string,
  project: string,
  wikiIdentifier: string,
  path: string,
  content: string,
  comment?: string,
  eTag?: string
): Promise<WikiPageCreateUpdateResponse> {
  const headers = getAuthHeaders();
  
  if (eTag) {
    headers['If-Match'] = eTag;
  }
  
  const params = new URLSearchParams();
  params.set('path', path);
  params.set('api-version', '7.1');
  if (comment) {
    params.set('comment', comment);
  }
  
  const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wiki API error (${response.status}): ${errorText}`);
  }
  
  const page = await response.json() as AdoWikiPage;
  const responseETag = response.headers.get('ETag') ?? '';
  
  return {
    page,
    eTag: responseETag,
  };
}

/**
 * Make a REST API call to delete a wiki page
 */
async function deletePageRest(
  orgUrl: string,
  project: string,
  wikiIdentifier: string,
  path: string
): Promise<void> {
  const headers = getAuthHeaders();
  
  const params = new URLSearchParams();
  params.set('path', path);
  params.set('api-version', '7.1');
  
  const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wiki API error (${response.status}): ${errorText}`);
  }
}

/**
 * Get a wiki page by path
 * 
 * @param options - Get options
 * @param config - Connection config
 * @returns Wiki page
 */
export async function getWikiPage(
  options: GetWikiPageOptions,
  config?: AdoConnectionConfig
): Promise<WikiPageWithContent> {
  const timer = createTimer();
  const { path, includeContent = true, recursionLevel } = options;

  if (!path) {
    throw new Error('Page path must be specified');
  }

  logInfo(`Getting wiki page: ${path}`);

  const orgUrl = config?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(options.wikiId);

  const page = await retryWithBackoff(
    () => getPageRest(orgUrl, project, wikiIdentifier, path, {
      includeContent,
      recursionLevel: recursionLevel as number | undefined,
    }),
    { ...RETRY_PRESETS.standard, operationName: `getWikiPage(${path})` }
  );

  if (!page) {
    throw new Error(`Wiki page ${path} not found`);
  }

  const result: WikiPageWithContent = {
    ...convertWikiPage(page),
    content: page.content ?? '',
    eTag: (page as { eTag?: string }).eTag,
  };

  timer.log(`getWikiPage(${path})`);
  return result;
}

/**
 * Update a wiki page
 * 
 * @param options - Update options
 * @param config - Connection config
 * @returns Update result with new page and eTag
 */
export async function updateWikiPage(
  options: UpdateWikiPageOptions,
  config?: AdoConnectionConfig
): Promise<WikiPageUpdateResult> {
  const timer = createTimer();
  const { path, content, comment, eTag } = options;

  if (!path) {
    throw new Error('Page path is required for updates');
  }

  logInfo(`Updating wiki page: ${path}`);

  // Load content from file if it's a file path
  let pageContent = content;
  if (content.endsWith('.md') || content.includes('/') || content.includes('\\')) {
    try {
      logDebug(`Loading content from file: ${content}`);
      pageContent = readFileSync(content, 'utf-8');
    } catch {
      // Not a file, use as raw content
      logDebug('Content is not a file path, using as raw content');
    }
  }

  const orgUrl = config?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(options.wikiId);

  // Get current page to get eTag if not provided
  let currentETag = eTag;
  if (!currentETag) {
    try {
      const currentPage = await getWikiPage({ path, wikiId: options.wikiId }, config);
      currentETag = currentPage.eTag;
    } catch {
      // Page might not exist yet
      logDebug('Could not get current page eTag, will attempt update without it');
    }
  }

  const result = await retryWithBackoff(
    () => createOrUpdatePageRest(
      orgUrl,
      project,
      wikiIdentifier,
      path,
      pageContent,
      comment ?? 'Updated via API',
      currentETag
    ),
    { ...RETRY_PRESETS.standard, operationName: `updateWikiPage(${path})` }
  );

  logInfo(`Successfully updated wiki page: ${path}`);
  timer.log(`updateWikiPage(${path})`);

  return {
    page: convertWikiPage(result.page),
    eTag: result.eTag,
  };
}

/**
 * Create a new wiki page
 * 
 * @param options - Create options
 * @param config - Connection config
 * @returns Created page with eTag
 */
export async function createWikiPage(
  options: CreateWikiPageOptions,
  config?: AdoConnectionConfig
): Promise<WikiPageUpdateResult> {
  const timer = createTimer();
  const { path, content, comment } = options;

  logInfo(`Creating wiki page: ${path}`);

  // Load content from file if it's a file path
  let pageContent = content;
  if (content.endsWith('.md') || content.includes('/') || content.includes('\\')) {
    try {
      logDebug(`Loading content from file: ${content}`);
      pageContent = readFileSync(content, 'utf-8');
    } catch {
      // Not a file, use as raw content
      logDebug('Content is not a file path, using as raw content');
    }
  }

  const orgUrl = config?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(options.wikiId);

  const result = await retryWithBackoff(
    () => createOrUpdatePageRest(
      orgUrl,
      project,
      wikiIdentifier,
      path,
      pageContent,
      comment ?? 'Created via API'
      // No eTag for new pages
    ),
    { ...RETRY_PRESETS.standard, operationName: `createWikiPage(${path})` }
  );

  logInfo(`Successfully created wiki page: ${path}`);
  timer.log(`createWikiPage(${path})`);

  return {
    page: convertWikiPage(result.page),
    eTag: result.eTag,
  };
}

/**
 * Delete a wiki page
 * 
 * @param path - Page path
 * @param wikiId - Wiki identifier (optional)
 * @param config - Connection config
 */
export async function deleteWikiPage(
  path: string,
  wikiId?: string,
  config?: AdoConnectionConfig
): Promise<void> {
  const timer = createTimer();
  
  logInfo(`Deleting wiki page: ${path}`);

  const orgUrl = config?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(wikiId);

  await retryWithBackoff(
    () => deletePageRest(orgUrl, project, wikiIdentifier, path),
    { ...RETRY_PRESETS.standard, operationName: `deleteWikiPage(${path})` }
  );

  logInfo(`Successfully deleted wiki page: ${path}`);
  timer.log(`deleteWikiPage(${path})`);
}

/**
 * Search wiki pages by keyword
 * 
 * @param searchText - Text to search for in page paths and titles
 * @param wikiId - Wiki identifier (optional)
 * @param config - Connection config
 * @returns Array of matching wiki pages
 */
export async function searchWikiPages(
  searchText: string,
  wikiId?: string,
  config?: AdoConnectionConfig
): Promise<WikiPage[]> {
  const timer = createTimer();
  
  logInfo(`Searching wiki for: ${searchText}`);

  try {
    // Get all pages recursively
    const allPages = await getAllWikiPagesRecursive('/', wikiId, config);
    
    // Filter pages by search text (case-insensitive)
    const searchLower = searchText.toLowerCase();
    const matchingPages = allPages.filter(page => {
      const pathLower = page.path.toLowerCase();
      return pathLower.includes(searchLower);
    });

    logDebug(`Found ${matchingPages.length} wiki pages matching "${searchText}"`);
    timer.log(`searchWikiPages(${searchText})`);
    
    return matchingPages;
  } catch (error) {
    logError(`Wiki search failed: ${error instanceof Error ? error.message : error}`);
    // Return empty array on error to allow workflow to continue
    return [];
  }
}

/**
 * Get all wiki pages recursively
 */
async function getAllWikiPagesRecursive(
  path: string,
  wikiId?: string,
  config?: AdoConnectionConfig
): Promise<WikiPage[]> {
  const orgUrl = config?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(wikiId);

  const page = await retryWithBackoff(
    () => getPageRest(orgUrl, project, wikiIdentifier, path, {
      includeContent: false,
      recursionLevel: 120, // Full recursion (OneLevel=1, Full=120)
    }),
    { ...RETRY_PRESETS.standard, operationName: `getAllWikiPages(${path})` }
  );

  if (!page) {
    return [];
  }

  const result: WikiPage[] = [];
  
  // Add current page if it has valid content
  if (page.path && page.path !== '/') {
    result.push(convertWikiPage(page));
  }

  // Recursively add subpages
  function collectSubPages(p: typeof page) {
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

/**
 * List wiki pages under a path
 * 
 * @param path - Parent path (optional, defaults to root)
 * @param wikiId - Wiki identifier (optional)
 * @param config - Connection config
 * @returns Array of wiki pages
 */
export async function listWikiPages(
  path?: string,
  wikiId?: string,
  config?: AdoConnectionConfig
): Promise<WikiPage[]> {
  const timer = createTimer();
  const pagePath = path ?? '/';
  
  logInfo(`Listing wiki pages under: ${pagePath}`);

  const orgUrl = config?.orgUrl ?? DEFAULT_ADO_ORG;
  const project = config?.project ?? DEFAULT_ADO_PROJECT;
  const wikiIdentifier = getWikiIdentifier(wikiId);

  const page = await retryWithBackoff(
    () => getPageRest(orgUrl, project, wikiIdentifier, pagePath, {
      includeContent: false,
      recursionLevel: 1, // OneLevel
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
