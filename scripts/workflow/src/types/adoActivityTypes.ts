/**
 * Azure DevOps Activity Report Types
 * Type definitions for activity tracking and reporting
 */

/**
 * Target person to track activity for
 */
export interface ActivityTarget {
  name: string;
  email: string;
}

/**
 * Activity types that can be tracked
 */
export type ActivityType =
  | 'Edit'
  | 'Comment'
  | 'AssignedTo'
  | 'ActionableMention'
  | 'FYIMention'
  | 'DiscussionMention'
  | 'WikiCreate'
  | 'WikiEdit'
  | 'WikiMove'
  | 'WikiDelete'
  | 'PRCreated'
  | 'PRApproved'
  | 'PRApprovedWithSuggestions'
  | 'PRWaitingOnAuthor'
  | 'PRRejected'
  | 'PRComment';

/**
 * A single activity record
 */
export interface ActivityRecord {
  /** Target person this activity is for */
  target: string;
  /** ISO timestamp of the activity */
  date: string;
  /** Work item ID (or Wiki:hash, PR number, etc.) */
  workItemId: string;
  /** PR number if applicable */
  prNumber?: string;
  /** Type of work item (User Story, Bug, Wiki, PullRequest, etc.) */
  workItemType: string;
  /** State of the work item */
  state: string;
  /** Area path */
  areaPath: string;
  /** Title of the work item/PR/wiki page */
  title: string;
  /** Type of activity */
  activityType: ActivityType;
  /** Details/description of the activity */
  details: string;
  /** Person who performed the action */
  actor: string;
  /** Link to the item */
  link?: string;
}

/**
 * Options for generating activity report
 */
export interface ActivityReportOptions {
  /** People to track */
  people: ActivityTarget[];
  /** Number of days to look back */
  days: number;
  /** Include wiki activities */
  includeWiki?: boolean;
  /** Include pull request activities */
  includePullRequests?: boolean;
  /** Output directory for reports */
  outputDir?: string;
}

/**
 * Result of activity report generation
 */
export interface ActivityReportResult {
  success: boolean;
  message: string;
  /** Generated report files */
  files: string[];
  /** Activity counts by target */
  activityCounts: Record<string, number>;
  /** Total activities found */
  totalActivities: number;
}

/**
 * Work item update from ADO API
 */
export interface WorkItemUpdate {
  id: number;
  rev: number;
  revisedBy: {
    displayName: string;
    uniqueName: string;
    id: string;
  };
  revisedDate: string;
  fields?: Record<string, {
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  relations?: {
    added?: Array<{
      rel: string;
      url: string;
      attributes?: {
        comment?: string;
        name?: string;
      };
    }>;
    removed?: Array<{
      rel: string;
      url: string;
    }>;
  };
}

/**
 * Git commit from wiki repository
 */
export interface WikiCommit {
  commitId: string;
  comment: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  changeCounts: {
    Add: number;
    Edit: number;
    Delete: number;
  };
  remoteUrl: string;
}

/**
 * Pull request from ADO Git API
 */
export interface PullRequest {
  pullRequestId: number;
  title: string;
  creationDate: string;
  closedDate?: string;
  status: 'active' | 'abandoned' | 'completed';
  createdBy: {
    displayName: string;
    uniqueName: string;
  };
  reviewers: Array<{
    displayName: string;
    uniqueName: string;
    vote: number; // 10=approved, 5=approved with suggestions, -5=waiting, -10=rejected
  }>;
  repository: {
    id: string;
    name: string;
  };
}

/**
 * PR thread/comment
 */
export interface PRThread {
  id: number;
  comments: Array<{
    id: number;
    author: {
      displayName: string;
      uniqueName: string;
    };
    content: string;
    publishedDate: string;
  }>;
}
