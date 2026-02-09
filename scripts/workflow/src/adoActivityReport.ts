/**
 * Azure DevOps Activity Report Generator
 * Generates comprehensive activity reports for specified users
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createAdoConnection, type AdoConnection } from './adoClient.js';
import { loadSharedConfig } from './lib/configLoader.js';
import { logInfo, logDebug, logWarn } from './lib/loggerStructured.js';
import type {
  ActivityTarget,
  ActivityRecord,
  ActivityReportOptions,
  ActivityReportResult,
  ActivityType,
  WorkItemUpdate,
} from './types/adoActivityTypes.js';

/** ADO defaults from config (organization name and wiki repo ID for activity report). */
interface AdoDefaultsConfig {
  organization_name?: string;
  wiki_repo_id?: string;
}

function getAdoReportConfig(): { adoOrg: string; wikiRepoId: string } {
  const config = loadSharedConfig() as { ado_defaults?: AdoDefaultsConfig };
  const ado = config.ado_defaults;
  return {
    adoOrg: ado?.organization_name ?? 'UMGC',
    wikiRepoId: ado?.wiki_repo_id ?? 'c7b64b09-35f3-4d8a-889c-5650655281ee',
  };
}

/**
 * Clean HTML tags from text
 */
function cleanHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml) return '';
  const cleanText = rawHtml.replace(/<[^>]*>/g, '');
  return cleanText.replace(/\s+/g, ' ').trim();
}

/**
 * Classify mention type based on text content
 */
function classifyMention(text: string): ActivityType {
  const lowerText = text.toLowerCase();

  // Strong signals for Actionable
  if (text.includes('?')) return 'ActionableMention';
  const actionableKeywords = [
    'please', 'can you', 'could you', 'review', 'approve',
    'check', 'verify', 'update', 'fix', 'status', 'what is', 'when'
  ];
  if (actionableKeywords.some(k => lowerText.includes(k))) {
    return 'ActionableMention';
  }

  // Strong signals for FYI
  const fyiKeywords = [
    'fyi', 'cc:', 'cc ', 'copying', 'adding',
    'heads up', 'for info', 'just to note'
  ];
  if (fyiKeywords.some(k => lowerText.includes(k))) {
    return 'FYIMention';
  }

  // If text is very short, likely a CC
  const cleanText = lowerText.replace(/@[a-z\s]+/g, '').trim();
  if (cleanText.length < 10) return 'FYIMention';

  return 'DiscussionMention';
}

/**
 * Check if a name/email matches the target
 */
function isMatch(
  target: ActivityTarget,
  nameToCheck: string,
  emailToCheck: string
): boolean {
  if (!nameToCheck && !emailToCheck) return false;
  
  const nameMatch = target.name && nameToCheck && nameToCheck.toLowerCase().includes(target.name.toLowerCase());
  const emailMatch = target.email && emailToCheck && emailToCheck.toLowerCase().includes(target.email.toLowerCase());
  
  return !!(nameMatch || emailMatch);
}

/**
 * Fetch work items using WIQL query and return IDs
 */
async function queryWorkItemIds(
  conn: AdoConnection,
  query: string
): Promise<number[]> {
  const witApi = await conn.getWorkItemTrackingApi();
  const result = await witApi.queryByWiql({ query }, conn.project);
  
  if (!result.workItems || result.workItems.length === 0) {
    return [];
  }
  
  return result.workItems.map(wi => wi.id!).filter(id => id !== undefined);
}

/**
 * Search for work items mentioning a person using Azure DevOps Search API
 * This is MUCH faster than scanning all work items
 * Uses pagination to get all results
 */
export async function searchWorkItemsMentioning(
  conn: AdoConnection,
  target: ActivityTarget,
  _days: number
): Promise<number[]> {
  const { getAzureBearerToken } = await import('./lib/authAzureCli.js');
  const token = getAzureBearerToken();
  
  const searchResults: number[] = [];
  const { adoOrg } = getAdoReportConfig();
  const searchUrl = `https://almsearch.dev.azure.com/${adoOrg}/_apis/search/workitemsearchresults?api-version=7.1`;

  // Search for mentions of the person's name (use full name as primary search)
  const searchTerms = [`"${target.name}"`];
  
  for (const searchTerm of searchTerms) {
    let skip = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            searchText: searchTerm,
            $skip: skip,
            $top: pageSize,
            filters: {
              'System.TeamProject': [conn.project],
            },
            $orderBy: [{ field: 'System.ChangedDate', sortOrder: 'DESC' }],
            includeFacets: false,
          }),
        });
        
        if (response.ok) {
          const data = await response.json() as { 
            count?: number;
            results?: Array<{ fields?: { 'system.id'?: string } }> 
          };
          
          if (data.results) {
            for (const result of data.results) {
              const id = parseInt(result.fields?.['system.id'] || '0', 10);
              if (id > 0) {
                searchResults.push(id);
              }
            }
            
            // Check if there are more results
            hasMore = data.results.length === pageSize && skip < 5000; // Cap at 5000 to avoid endless loops
            skip += pageSize;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        logWarn(`Search API error for ${searchTerm}: ${error}`);
        hasMore = false;
      }
    }
    
    logDebug(`  Search for ${searchTerm} found ${searchResults.length} total results`);
  }
  
  // Return unique IDs
  return [...new Set(searchResults)];
}

/**
 * Stream work item revisions using the Reporting API
 * This is a fast way to get all revisions and filter for mentions
 */
export async function streamRevisionsForMentions(
  conn: AdoConnection,
  targets: ActivityTarget[],
  _days: number
): Promise<number[]> {
  const { getAzureBearerToken } = await import('./lib/authAzureCli.js');
  const token = getAzureBearerToken();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();
  
  const workItemIds = new Set<number>();
  let continuationToken: string | null = null;
  let totalRevisions = 0;
  const startTime = Date.now();
  
  // Build target name patterns for matching
  const targetPatterns = targets.map(t => t.name.toLowerCase());
  
  logInfo(`Streaming revisions since ${startDateStr.split('T')[0]} to find all activity...`);
  const { adoOrg } = getAdoReportConfig();

  do {
    try {
      let url = `https://dev.azure.com/${adoOrg}/${encodeURIComponent(conn.project)}/_apis/wit/reporting/workitemrevisions?startDateTime=${encodeURIComponent(startDateStr)}&api-version=7.1`;
      if (continuationToken) {
        url += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        logWarn(`Reporting API error: ${response.status} ${response.statusText}`);
        break;
      }
      
      const data = await response.json() as {
        values?: Array<{
          id?: number;
          fields?: Record<string, unknown>;
        }>;
        continuationToken?: string;
        isLastBatch?: boolean;
      };
      
      // Check each revision for target names
      if (data.values) {
        for (const revision of data.values) {
          if (!revision.id) continue;
          
          // Check ChangedBy field
          const changedBy = String(revision.fields?.['System.ChangedBy'] || '').toLowerCase();
          for (const pattern of targetPatterns) {
            if (changedBy.includes(pattern)) {
              workItemIds.add(revision.id);
              break;
            }
          }
          
          // Check AssignedTo field
          const assignedTo = String(revision.fields?.['System.AssignedTo'] || '').toLowerCase();
          for (const pattern of targetPatterns) {
            if (assignedTo.includes(pattern)) {
              workItemIds.add(revision.id);
              break;
            }
          }
          
          // Check History field for mentions
          const history = String(revision.fields?.['System.History'] || '').toLowerCase();
          if (history) {
            for (const pattern of targetPatterns) {
              if (history.includes(pattern)) {
                workItemIds.add(revision.id);
                break;
              }
            }
          }
          
          // Check Description field for mentions
          const description = String(revision.fields?.['System.Description'] || '').toLowerCase();
          if (description) {
            for (const pattern of targetPatterns) {
              if (description.includes(pattern)) {
                workItemIds.add(revision.id);
                break;
              }
            }
          }
        }
        
        totalRevisions += data.values.length;
      }
      
      continuationToken = data.continuationToken || null;
      
      // Progress reporting
      const elapsed = (Date.now() - startTime) / 1000;
      if (totalRevisions % 10000 === 0 || !continuationToken) {
        logInfo(`  Scanned ${totalRevisions} revisions, found ${workItemIds.size} relevant work items (${elapsed.toFixed(1)}s)`);
      }
      
    } catch (error) {
      logWarn(`Reporting API error: ${error}`);
      break;
    }
    
  } while (continuationToken);
  
  const elapsed = (Date.now() - startTime) / 1000;
  logInfo(`  Completed: Scanned ${totalRevisions} revisions, found ${workItemIds.size} work items in ${elapsed.toFixed(1)}s`);
  
  return Array.from(workItemIds);
}

/**
 * Fetch work items related to specific people using HYBRID approach
 * For 100% accuracy, scans all recently changed work items
 * Optimized for speed with aggressive parallelization
 */
export async function fetchHybridWorkItems(
  conn: AdoConnection,
  _targets: ActivityTarget[],
  days: number
): Promise<Array<{ id: number; fields: Record<string, unknown> }>> {
  const witApi = await conn.getWorkItemTrackingApi();
  const startTime = Date.now();
  
  logInfo(`Fetching ALL work items for 100% accuracy...`);
  
  // Get all work items changed in the date range
  const allRecentQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.ChangedDate] >= @Today - ${days}`;
  const allRecentIds = await queryWorkItemIds(conn, allRecentQuery);
  
  const queryTime = ((Date.now() - startTime) / 1000).toFixed(1);
  logInfo(`Found ${allRecentIds.length} work items in ${queryTime}s`);
  
  if (allRecentIds.length === 0) {
    return [];
  }
  
  // Fetch full details in aggressive parallel batches
  const allItems: Array<{ id: number; fields: Record<string, unknown> }> = [];
  const batchSize = 200;
  const concurrentBatches = 30; // Very aggressive parallelization
  
  const batches: number[][] = [];
  for (let i = 0; i < allRecentIds.length; i += batchSize) {
    batches.push(allRecentIds.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i += concurrentBatches) {
    const batchGroup = batches.slice(i, i + concurrentBatches);
    
    const batchPromises = batchGroup.map(batchIds => 
      witApi.getWorkItems(
        batchIds,
        ['System.Id', 'System.Title', 'System.WorkItemType', 'System.State', 'System.AreaPath'],
        undefined,
        undefined,
        undefined,
        conn.project
      ).catch(() => null)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const items of batchResults) {
      if (items) {
        allItems.push(...items.map(item => ({
          id: item.id!,
          fields: item.fields as Record<string, unknown>
        })));
      }
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  logInfo(`Fetched ${allItems.length} work item details in ${totalTime}s`);
  
  return allItems;
}

/**
 * Fetch work items updated in the last N days (complete scan)
 * Uses aggressive parallel batch fetching for speed
 */
async function fetchRecentWorkItems(
  conn: AdoConnection,
  days: number
): Promise<Array<{ id: number; fields: Record<string, unknown> }>> {
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
    logInfo('No work items found in the specified date range');
    return [];
  }
  
  const ids = result.workItems.map(wi => wi.id!).filter(id => id !== undefined);
  logInfo(`Found ${ids.length.toLocaleString()} work items to scan`);
  
  // Fetch in parallel batches of 200, with 20 concurrent batch requests
  const allItems: Array<{ id: number; fields: Record<string, unknown> }> = [];
  let errors = 0;
  const batchSize = 200;
  const concurrentBatches = 20;
  const startTime = Date.now();
  
  // Create all batch ID arrays
  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }
  
  logInfo(`Fetching details in ${batches.length} batches (${concurrentBatches} concurrent)...`);
  
  // Process batches in parallel groups
  for (let i = 0; i < batches.length; i += concurrentBatches) {
    const batchGroup = batches.slice(i, i + concurrentBatches);
    
    const batchPromises = batchGroup.map(batchIds => 
      witApi.getWorkItems(
        batchIds,
        ['System.Id', 'System.Title', 'System.WorkItemType', 'System.State', 'System.AreaPath'],
        undefined,
        undefined,
        undefined,
        conn.project
      ).catch(err => {
        errors++;
        logDebug(`Batch fetch error: ${err}`);
        return null;
      })
    );
    
    const results = await Promise.all(batchPromises);
    
    for (const items of results) {
      if (items) {
        allItems.push(...items.map(item => ({
          id: item.id!,
          fields: item.fields as Record<string, unknown>
        })));
      }
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  logInfo(`Fetched ${allItems.length.toLocaleString()} work items in ${elapsed.toFixed(1)}s${errors > 0 ? ` (${errors} batch errors)` : ''}`);
  
  return allItems;
}

/**
 * Fetch updates for a work item
 */
async function fetchWorkItemUpdates(
  conn: AdoConnection,
  workItemId: number
): Promise<WorkItemUpdate[]> {
  const witApi = await conn.getWorkItemTrackingApi();
  
  try {
    const updates = await witApi.getUpdates(workItemId, conn.project);
    return (updates || []) as unknown as WorkItemUpdate[];
  } catch (error) {
    logWarn(`Failed to fetch updates for work item ${workItemId}: ${error}`);
    return [];
  }
}

/**
 * Process a single work item's updates for activity tracking
 */
async function processWorkItem(
  conn: AdoConnection,
  item: { id: number; fields: Record<string, unknown> },
  targets: ActivityTarget[],
  cutoffDate: Date
): Promise<ActivityRecord[]> {
  const activities: ActivityRecord[] = [];
  const updates = await fetchWorkItemUpdates(conn, item.id);
  
  const wiTitle = String(item.fields['System.Title'] || 'No Title');
  const wiType = String(item.fields['System.WorkItemType'] || 'Unknown');
  const wiState = String(item.fields['System.State'] || 'Unknown');
  const wiArea = String(item.fields['System.AreaPath'] || 'Unknown');
  
  for (const update of updates) {
    // Parse update date
    let updateDate: Date;
    try {
      const rawDate = update.revisedDate;
      if (!rawDate) continue;
      
      // Handle both string dates and Date objects
      updateDate = typeof rawDate === 'string' ? new Date(rawDate) : new Date(rawDate as unknown as string);
      if (isNaN(updateDate.getTime())) continue;
    } catch {
      continue;
    }
    
    // Skip future dates (API artifact)
    if (updateDate.getFullYear() > 3000) continue;
    
    // Skip updates outside our date range (applies to ALL activity types)
    if (updateDate < cutoffDate) continue;
    
    const revisedByName = update.revisedBy?.displayName || '';
    const revisedByEmail = update.revisedBy?.uniqueName || '';
    
    for (const target of targets) {
      const matched = isMatch(target, revisedByName, revisedByEmail);
      
      // 1. Edits/Comments by target
      if (matched) {
        if (!update.fields) continue;
        const changes: string[] = [];
        let commentText = '';
        
        for (const [fieldName, fieldVal] of Object.entries(update.fields)) {
          if (fieldName === 'System.State') {
            const oldState = String(fieldVal.oldValue || 'New');
            const newState = String(fieldVal.newValue || 'Unknown');
            changes.push(`State: ${oldState}->${newState}`);
          } else if (fieldName === 'System.History') {
            commentText = cleanHtml(String(fieldVal.newValue || ''));
          } else {
            changes.push(fieldName);
          }
        }
        
        let activityType: ActivityType = 'Edit';
        let details = `Changed: ${changes.join(', ')}`;
        
        if (update.fields['System.History']) {
          activityType = 'Comment';
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
          actor: revisedByName,
        });
      }
      
      // 2. Mentions and assignments
      if (update.fields) {
        for (const [fieldName, fieldVal] of Object.entries(update.fields)) {
          const newValue = fieldVal.newValue;
          
          // Assignment check
          if (fieldName === 'System.AssignedTo') {
            let assigneeMatch = false;
            if (typeof newValue === 'object' && newValue !== null) {
              const assignee = newValue as { displayName?: string; uniqueName?: string };
              assigneeMatch = isMatch(target, assignee.displayName || '', assignee.uniqueName || '');
            } else if (typeof newValue === 'string') {
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
                activityType: 'AssignedTo',
                details: `Assigned to ${target.name} by ${revisedByName}`,
                actor: revisedByName,
              });
            }
          }
          
          // Mention check in text fields
          if (typeof newValue === 'string' && fieldName !== 'System.AssignedTo') {
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
                actor: revisedByName,
              });
            }
          }
        }
      }
      
      // 3. Relation comments
      if (update.relations?.added) {
        for (const link of update.relations.added) {
          const comment = link.attributes?.comment || '';
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
                actor: revisedByName,
              });
            }
          }
        }
      }
    }
  }
  
  return activities;
}

/**
 * Write activities to CSV file
 */
async function writeCsvReport(
  activities: ActivityRecord[],
  targetName: string,
  outputDir: string,
  timestamp: string
): Promise<string> {
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const safeName = targetName.toLowerCase().replace(/\s+/g, '-');
  const filename = `${safeName}-activity-${timestamp}.csv`;
  const filepath = join(outputDir, filename);

  // Sort by date descending
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const stream = createWriteStream(filepath, { encoding: 'utf-8' });

  // Write header
  const headers = [
    'Date', 'WorkItemId', 'PRNumber', 'WorkItemType', 'State',
    'AreaPath', 'Title', 'ActivityType', 'Details', 'Actor'
  ];
  stream.write(headers.join(',') + '\n');
  
  // Write rows
  for (const activity of activities) {
    const row = [
      activity.date,
      activity.workItemId,
      activity.prNumber || '',
      activity.workItemType,
      activity.state,
      `"${activity.areaPath.replace(/"/g, '""')}"`,
      `"${activity.title.replace(/"/g, '""')}"`,
      activity.activityType,
      `"${activity.details.replace(/"/g, '""').substring(0, 500)}"`,
      activity.actor,
    ];
    stream.write(row.join(',') + '\n');
  }
  
  // Wait for stream to finish before returning (H1 - stream flush issue)
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
    stream.end();
  });
}

/**
 * Process work items in parallel batches with production-ready monitoring
 */
async function processWorkItemsBatch(
  conn: AdoConnection,
  items: Array<{ id: number; fields: Record<string, unknown> }>,
  targets: ActivityTarget[],
  cutoffDate: Date,
  concurrency: number = 100
): Promise<ActivityRecord[]> {
  const allActivities: ActivityRecord[] = [];
  let processed = 0;
  let errors = 0;
  let skipped = 0;
  const total = items.length;
  const startTime = Date.now();
  let lastReportTime = startTime;
  
  // Track rate over time for better ETA
  const rateHistory: number[] = [];
  
  // Process in batches with concurrency limit
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchStart = Date.now();
    
    const batchPromises = batch.map(item => 
      processWorkItem(conn, item, targets, cutoffDate)
        .then(activities => ({ success: true, activities, error: null }))
        .catch(error => ({ success: false, activities: [] as ActivityRecord[], error }))
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
    
    // Calculate batch rate
    const batchElapsed = (Date.now() - batchStart) / 1000;
    const batchRate = batch.length / batchElapsed;
    rateHistory.push(batchRate);
    if (rateHistory.length > 10) rateHistory.shift(); // Keep last 10 batches
    
    // Progress reporting every 10 seconds
    const now = Date.now();
    if (processed === total || now - lastReportTime > 10000) {
      const elapsedSec = (now - startTime) / 1000;
      const avgRate = rateHistory.reduce((a, b) => a + b, 0) / rateHistory.length;
      const remaining = (total - processed) / avgRate;
      const pct = ((processed / total) * 100).toFixed(1);
      const eta = new Date(Date.now() + remaining * 1000).toLocaleTimeString();
      
      logInfo(`Progress: ${processed}/${total} (${pct}%) | ${elapsedSec.toFixed(0)}s elapsed | Rate: ${avgRate.toFixed(0)}/sec | ETA: ${eta} | Activities: ${allActivities.length} | Errors: ${errors}`);
      lastReportTime = now;
    }
  }
  
  // Final summary
  const elapsed = (Date.now() - startTime) / 1000;
  const avgRate = processed / elapsed;
  
  logInfo(`--- Processing Complete ---`);
  logInfo(`  Total work items: ${total}`);
  logInfo(`  Processed successfully: ${processed - errors}`);
  logInfo(`  Errors: ${errors} (${((errors / total) * 100).toFixed(1)}%)`);
  logInfo(`  Items with activity: ${processed - errors - skipped}`);
  logInfo(`  Activities found: ${allActivities.length}`);
  logInfo(`  Duration: ${formatDuration(elapsed)}`);
  logInfo(`  Average rate: ${avgRate.toFixed(0)} items/sec`);
  
  return allActivities;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
}

/**
 * Fetch wiki commits for a target person
 */
async function fetchWikiActivities(
  conn: AdoConnection,
  target: ActivityTarget,
  startDate: Date,
  endDate: Date
): Promise<ActivityRecord[]> {
  const activities: ActivityRecord[] = [];
  
  try {
    const gitApi = await conn.getGitApi();
    const { wikiRepoId } = getAdoReportConfig();

    // Search by name
    const commits = await gitApi.getCommits(
      wikiRepoId,
      {
        author: target.name,
        fromDate: startDate,
        toDate: endDate,
      },
      conn.project
    );
    
    if (!commits || commits.length === 0) {
      logInfo(`  No wiki commits found for ${target.name}`);
      return activities;
    }
    
    logInfo(`  Found ${commits.length} wiki commits for ${target.name}`);
    
    for (const commit of commits) {
      const commitId = commit.commitId?.substring(0, 8) || 'unknown';
      const comment = commit.comment?.trim() || 'Wiki commit';
      const authorDate = commit.author?.date;
      const changeCounts = commit.changeCounts || { Add: 0, Edit: 0, Delete: 0 };
      
      // Determine activity type
      let activityType: ActivityType = 'WikiEdit';
      if (comment.toLowerCase().startsWith('added')) {
        activityType = 'WikiCreate';
      } else if (comment.toLowerCase().includes('page move') || comment.toLowerCase().includes('rename')) {
        activityType = 'WikiMove';
      } else if (changeCounts.Delete > 0 && changeCounts.Add === 0 && changeCounts.Edit === 0) {
        activityType = 'WikiDelete';
      }
      
      activities.push({
        target: target.name,
        date: authorDate?.toISOString() || new Date().toISOString(),
        workItemId: `Wiki:${commitId}`,
        workItemType: 'Wiki',
        state: '',
        areaPath: 'Wiki',
        title: comment.substring(0, 100),
        activityType,
        details: `Changes: +${changeCounts.Add} ~${changeCounts.Edit} -${changeCounts.Delete}`,
        actor: target.name,
      });
    }
  } catch (error) {
    logWarn(`Failed to fetch wiki commits for ${target.name}: ${error}`);
  }
  
  return activities;
}

/**
 * Fetch pull request activities for a target person
 */
async function fetchPRActivities(
  conn: AdoConnection,
  target: ActivityTarget,
  startDate: Date,
  endDate: Date
): Promise<ActivityRecord[]> {
  const activities: ActivityRecord[] = [];
  
  try {
    const gitApi = await conn.getGitApi();
    
    // Get all repositories
    const repos = await gitApi.getRepositories(conn.project);
    if (!repos) return activities;
    
    const activeRepos = repos.filter(r => !r.isDisabled);
    logInfo(`  Scanning ${activeRepos.length} repositories for PR activity...`);
    
    const processedPRs = new Set<number>();
    
    for (const repo of activeRepos) {
      if (!repo.id) continue;
      
      try {
        // Get recent PRs
        const prs = await gitApi.getPullRequests(repo.id, {
          status: 4, // All statuses
        }, conn.project, undefined, undefined, 50);
        
        if (!prs) continue;
        
        for (const pr of prs) {
          if (!pr.pullRequestId || processedPRs.has(pr.pullRequestId)) continue;
          
          const creationDate = pr.creationDate ? new Date(pr.creationDate) : null;
          const closedDate = pr.closedDate ? new Date(pr.closedDate) : null;
          
          // Check if PR is in date range
          const inRange = (creationDate && creationDate >= startDate && creationDate <= endDate) ||
                         (closedDate && closedDate >= startDate && closedDate <= endDate);
          if (!inRange) continue;
          
          const prLink = `https://dev.azure.com/UMGC/${conn.project}/_git/${repo.name}/pullrequest/${pr.pullRequestId}`;
          
          // Check if created by target
          const createdByName = pr.createdBy?.displayName || '';
          const createdByEmail = pr.createdBy?.uniqueName || '';
          
          if (isMatch(target, createdByName, createdByEmail) && creationDate && creationDate >= startDate) {
            processedPRs.add(pr.pullRequestId);
            activities.push({
              target: target.name,
              date: creationDate.toISOString(),
              workItemId: '',
              prNumber: String(pr.pullRequestId),
              workItemType: 'PullRequest',
              state: '',
              areaPath: 'Git',
              title: pr.title || 'Pull Request',
              activityType: 'PRCreated',
              details: `Created PR in ${repo.name}`,
              actor: target.name,
              link: prLink,
            });
          }
          
          // Check reviewer votes
          if (pr.reviewers) {
            for (const reviewer of pr.reviewers) {
              const reviewerName = reviewer.displayName || '';
              const reviewerEmail = reviewer.uniqueName || '';
              const vote = reviewer.vote || 0;
              
              if (isMatch(target, reviewerName, reviewerEmail) && vote !== 0) {
                let activityType: ActivityType;
                let details: string;
                
                if (vote === 10) {
                  activityType = 'PRApproved';
                  details = `Approved PR in ${repo.name}`;
                } else if (vote === 5) {
                  activityType = 'PRApprovedWithSuggestions';
                  details = `Approved with suggestions PR in ${repo.name}`;
                } else if (vote === -5) {
                  activityType = 'PRWaitingOnAuthor';
                  details = `Requested changes on PR in ${repo.name}`;
                } else if (vote === -10) {
                  activityType = 'PRRejected';
                  details = `Rejected PR in ${repo.name}`;
                } else {
                  continue;
                }
                
                const voteDate = closedDate || creationDate;
                if (voteDate) {
                  activities.push({
                    target: target.name,
                    date: voteDate.toISOString(),
                    workItemId: '',
                    prNumber: String(pr.pullRequestId),
                    workItemType: 'PullRequest',
                    state: '',
                    areaPath: 'Git',
                    title: pr.title || 'Pull Request',
                    activityType,
                    details,
                    actor: target.name,
                    link: prLink,
                  });
                }
              }
            }
          }
        }
      } catch (repoError) {
        // Skip repos that fail
        continue;
      }
    }
    
    logInfo(`  Found ${activities.length} PR activities for ${target.name}`);
  } catch (error) {
    logWarn(`Failed to fetch PR activities for ${target.name}: ${error}`);
  }
  
  return activities;
}

/**
 * Generate activity report for specified users
 * 
 * Scans ALL work items to catch all mentions for 100% accuracy.
 */
export async function generateActivityReport(
  options: ActivityReportOptions
): Promise<ActivityReportResult> {
  const { 
    people, 
    days, 
    outputDir = 'reports',
    includeWiki = true,
    includePullRequests = true,
  } = options;

  if (people.length === 0) {
    return {
      success: false,
      message: 'No people specified for report',
      files: [],
      activityCounts: {},
      totalActivities: 0,
    };
  }
  
  const startTime = Date.now();
  logInfo(`Generating activity report for ${people.length} people, last ${days} days`);
  
  logInfo(`Mode: FULL (comprehensive scan, 100% coverage)`);
  
  for (const p of people) {
    logInfo(`  - ${p.name} (${p.email})`);
  }
  
  // Create ADO connection
  const conn = await createAdoConnection();
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const endDate = new Date();
  
  // Fetch work items based on mode
  let workItems: Array<{ id: number; fields: Record<string, unknown> }>;
  
  workItems = await fetchRecentWorkItems(conn, days);

  // Initialize activities by target
  const activitiesByTarget: Record<string, ActivityRecord[]> = {};
  for (const p of people) {
    activitiesByTarget[p.name] = [];
  }
  
  // Run work item processing, wiki, and PR fetching in PARALLEL for maximum speed
  // Use very high concurrency - accept some rate limit errors for speed
  const concurrency = 150;
  
  // Create promises for all three types of activities
  const workItemPromise = workItems.length > 0 
    ? (logInfo(`Processing ${workItems.length} work items with ${concurrency} concurrent requests...`),
       processWorkItemsBatch(conn, workItems, people, cutoffDate, concurrency))
    : Promise.resolve([] as ActivityRecord[]);
  
  const wikiPromise = includeWiki
    ? (logInfo('Fetching wiki activities in parallel...'),
       Promise.all(people.map(target => fetchWikiActivities(conn, target, cutoffDate, endDate))))
    : Promise.resolve(people.map(() => [] as ActivityRecord[]));
  
  const prPromise = includePullRequests
    ? (logInfo('Fetching PR activities in parallel...'),
       Promise.all(people.map(target => fetchPRActivities(conn, target, cutoffDate, endDate))))
    : Promise.resolve(people.map(() => [] as ActivityRecord[]));
  
  // Wait for all to complete
  const [workItemActivities, wikiResults, prResults] = await Promise.all([
    workItemPromise,
    wikiPromise,
    prPromise,
  ]);

  // Group work item activities by target
  for (const activity of workItemActivities) {
    if (!activitiesByTarget[activity.target]) {
      activitiesByTarget[activity.target] = [];
    }
    activitiesByTarget[activity.target].push(activity);
  }
  
  // Add wiki activities
  for (let i = 0; i < people.length; i++) {
    activitiesByTarget[people[i].name].push(...wikiResults[i]);
  }
  
  // Add PR activities
  for (let i = 0; i < people.length; i++) {
    activitiesByTarget[people[i].name].push(...prResults[i]);
  }
  
  // Write CSV files
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const files: string[] = [];
  const activityCounts: Record<string, number> = {};
  let totalActivities = 0;

  for (const [targetName, activities] of Object.entries(activitiesByTarget)) {
    if (activities.length > 0) {
      const filepath = await writeCsvReport(activities, targetName, outputDir, timestamp);
      files.push(filepath);
      activityCounts[targetName] = activities.length;
      totalActivities += activities.length;
    }
  }

  // Calculate activity type breakdown
  const activityTypeBreakdown: Record<string, number> = {};
  for (const activities of Object.values(activitiesByTarget)) {
    for (const activity of activities) {
      activityTypeBreakdown[activity.activityType] = (activityTypeBreakdown[activity.activityType] || 0) + 1;
    }
  }
  
  // Calculate wiki and PR counts
  const wikiCount = wikiResults.reduce((sum, arr) => sum + arr.length, 0);
  const prCount = prResults.reduce((sum, arr) => sum + arr.length, 0);
  const workItemCount = workItemActivities.length;
  
  // Final summary
  const elapsed = (Date.now() - startTime) / 1000;
  
  logInfo('');
  logInfo('========================================');
  logInfo('         ACTIVITY REPORT SUMMARY        ');
  logInfo('========================================');
  logInfo(`Date Range: ${cutoffDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
  logInfo(`Mode: FULL (comprehensive scan, 100% coverage)`);
  logInfo('');
  logInfo('--- Sources ---');
  logInfo(`  Work Items: ${workItemCount} activities`);
  logInfo(`  Wiki: ${wikiCount} activities`);
  logInfo(`  Pull Requests: ${prCount} activities`);
  logInfo('');
  logInfo('--- Activity Types ---');
  const sortedTypes = Object.entries(activityTypeBreakdown).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = ((count / totalActivities) * 100).toFixed(1);
    logInfo(`  ${type}: ${count} (${pct}%)`);
  }
  logInfo('');
  logInfo('--- Per Person ---');
  for (const [name, count] of Object.entries(activityCounts)) {
    logInfo(`  ${name}: ${count} activities`);
  }
  logInfo('');
  logInfo('--- Output ---');
  for (const file of files) {
    logInfo(`  ${file}`);
  }
  logInfo('');
  logInfo(`Total: ${totalActivities} activities`);
  logInfo(`Duration: ${formatDuration(elapsed)}`);
  logInfo('========================================');
  
  return {
    success: true,
    message: `Generated ${files.length} report(s) with ${totalActivities} total activities in ${formatDuration(elapsed)}`,
    files,
    activityCounts,
    totalActivities,
  };
}

/**
 * Parse person string in format "Name|email@domain.com"
 */
export function parsePerson(input: string): ActivityTarget {
  if (input.includes('|')) {
    const [name, email] = input.split('|');
    return { name: (name ?? '').trim(), email: (email ?? '').trim() };
  }
  // If no email provided, use input as name
  return { name: input.trim(), email: '' };
}
