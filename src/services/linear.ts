// Linear API Service
// Use proxy in development to avoid CORS issues
const LINEAR_API_URL = '/api/linear/graphql';

export interface LinearTeam {
  id: string;
  name: string;
  icon?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description: string;
  state: string;
  startDate: string | null;
  targetDate: string | null;
}

export interface LinearIssue {
  id: string;
  title: string;
  state: {
    id: string;
    name: string;
  };
  priority: number;
  dueDate: string | null;
  createdAt: string;
  startedAt: string | null;
  estimate: number | null;
  project: {
    id: string;
    name: string;
  } | null;
  cycle: {
    id: string;
    name: string;
  } | null;
  team: {
    id: string;
    name: string;
    icon?: string;
  } | null;
  assignee: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  } | null;
  labels: {
    nodes: Array<{ name: string }>;
  };
}

export interface LinearCycle {
  id: string;
  name: string;
  number: number;
  description: string | null;
  startsAt: string;
  endsAt: string;
  completedAt: string | null;
  progress: number;
  issueCountScope: number;
  completedIssueCountScope: number;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  color: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  position: number;
}

export interface LinearIssueRelation {
  id: string;
  type: 'blocks' | 'blocked' | 'related' | 'duplicate';
  relatedIssue: {
    id: string;
    title: string;
    identifier: string;
  };
}

export interface LinearData {
  teams: LinearTeam[];
  projects: LinearProject[];
  issues: LinearIssue[];
}

// Custom error class for Linear API errors
export class LinearApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isRetryable: boolean;

  constructor(message: string, statusCode: number = 0, errorCode: string = 'UNKNOWN', isRetryable: boolean = false) {
    super(message);
    this.name = 'LinearApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isRetryable = isRetryable;
  }
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function linearQuery(apiKey: string, query: string, retries: number = 0): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY_MS * (retries + 1);

      if (retries < MAX_RETRIES) {
        console.warn(`Linear API rate limited. Retrying after ${delayMs}ms...`);
        await sleep(delayMs);
        return linearQuery(apiKey, query, retries + 1);
      }

      throw new LinearApiError(
        'Linear API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        429,
        'RATE_LIMITED',
        true
      );
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new LinearApiError(
        'Linear API 키가 유효하지 않습니다. API 키를 확인해주세요.',
        response.status,
        'UNAUTHORIZED',
        false
      );
    }

    // Handle server errors with retry
    if (response.status >= 500) {
      if (retries < MAX_RETRIES) {
        console.warn(`Linear API server error (${response.status}). Retrying...`);
        await sleep(RETRY_DELAY_MS * (retries + 1));
        return linearQuery(apiKey, query, retries + 1);
      }

      throw new LinearApiError(
        'Linear 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        response.status,
        'SERVER_ERROR',
        true
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      throw new LinearApiError(
        `Linear API 오류: ${response.status} ${response.statusText}`,
        response.status,
        'HTTP_ERROR',
        false
      );
    }

    const data = await response.json();

    // Handle GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const error = data.errors[0];
      const errorMessage = error.message || 'Linear API GraphQL 오류';
      const errorCode = error.extensions?.code || 'GRAPHQL_ERROR';

      // Check if error is retryable
      const isRetryable = ['INTERNAL_SERVER_ERROR', 'TIMEOUT'].includes(errorCode);

      if (isRetryable && retries < MAX_RETRIES) {
        console.warn(`Linear API GraphQL error: ${errorMessage}. Retrying...`);
        await sleep(RETRY_DELAY_MS * (retries + 1));
        return linearQuery(apiKey, query, retries + 1);
      }

      throw new LinearApiError(errorMessage, 0, errorCode, isRetryable);
    }

    return data.data;
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      if (retries < MAX_RETRIES) {
        console.warn('Linear API request timeout. Retrying...');
        await sleep(RETRY_DELAY_MS * (retries + 1));
        return linearQuery(apiKey, query, retries + 1);
      }
      throw new LinearApiError(
        'Linear API 요청 시간이 초과되었습니다.',
        0,
        'TIMEOUT',
        true
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (retries < MAX_RETRIES) {
        console.warn('Linear API network error. Retrying...');
        await sleep(RETRY_DELAY_MS * (retries + 1));
        return linearQuery(apiKey, query, retries + 1);
      }
      throw new LinearApiError(
        '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        0,
        'NETWORK_ERROR',
        true
      );
    }

    // Re-throw LinearApiError
    if (error instanceof LinearApiError) {
      throw error;
    }

    // Handle unknown errors
    throw new LinearApiError(
      error instanceof Error ? error.message : 'Linear API에서 알 수 없는 오류가 발생했습니다.',
      0,
      'UNKNOWN',
      false
    );
  }
}

// Helper to get user-friendly error message
export function getLinearErrorMessage(error: unknown): string {
  if (error instanceof LinearApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Linear API에서 알 수 없는 오류가 발생했습니다.';
}

// Check if error is retryable
export function isLinearErrorRetryable(error: unknown): boolean {
  if (error instanceof LinearApiError) {
    return error.isRetryable;
  }
  return false;
}

export async function fetchLinearTeams(apiKey: string): Promise<LinearTeam[]> {
  const query = `{
    teams {
      nodes {
        id
        name
        icon
      }
    }
  }`;

  const data = await linearQuery(apiKey, query);
  return data.teams.nodes;
}

export async function fetchLinearProjects(apiKey: string, teamId?: string): Promise<LinearProject[]> {
  // Linear API doesn't support team filter on projects directly
  // We'll fetch all projects and filter client-side if needed
  const query = `{
    projects(first: 100) {
      nodes {
        id
        name
        description
        state
        startDate
        targetDate
        teams {
          nodes {
            id
          }
        }
      }
    }
  }`;

  const data = await linearQuery(apiKey, query);
  let projects = data.projects.nodes;

  // Filter by team if teamId provided
  if (teamId) {
    projects = projects.filter((p: any) =>
      p.teams?.nodes?.some((t: any) => t.id === teamId)
    );
  }

  return projects;
}

export async function fetchLinearIssues(
  apiKey: string,
  projectId?: string,
  teamId?: string,
  cycleId?: string
): Promise<(LinearIssue & {
  parent?: { id: string; title: string } | null;
  stateType?: string;
  relations?: Array<{ type: string; relatedIssue: { id: string } }>;
})[]> {
  // Fetch issues with parent, state type, and relations
  const query = `{
    issues(first: 250) {
      nodes {
        id
        title
        state {
          id
          name
          type
        }
        priority
        dueDate
        createdAt
        startedAt
        estimate
        project {
          id
          name
        }
        cycle {
          id
          name
        }
        team {
          id
          name
          icon
        }
        assignee {
          id
          name
          displayName
          avatarUrl
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        parent {
          id
          title
        }
        relations {
          nodes {
            type
            relatedIssue {
              id
            }
          }
        }
      }
    }
  }`;

  const data = await linearQuery(apiKey, query);
  let issues = data.issues.nodes.map((issue: any) => ({
    ...issue,
    stateType: issue.state?.type,
    relations: issue.relations?.nodes || [],
  }));

  // Filter client-side
  if (cycleId) {
    issues = issues.filter((i: any) => i.cycle?.id === cycleId);
  } else if (projectId) {
    issues = issues.filter((i: any) => i.project?.id === projectId);
  } else if (teamId) {
    issues = issues.filter((i: any) => i.team?.id === teamId);
  }

  return issues;
}

// Fetch Linear Cycles (Sprints) for a team
export async function fetchLinearCycles(
  apiKey: string,
  teamId: string
): Promise<LinearCycle[]> {
  // Use cycles query with team filter instead of nested query
  const query = `{
    cycles(filter: { team: { id: { eq: "${teamId}" } } }, first: 50) {
      nodes {
        id
        name
        number
        description
        startsAt
        endsAt
        completedAt
        progress
        scopeHistory
        completedScopeHistory
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    // Map scopeHistory to issueCountScope for compatibility
    return (data.cycles?.nodes || []).map((cycle: any) => ({
      ...cycle,
      issueCountScope: cycle.scopeHistory?.[cycle.scopeHistory.length - 1] || 0,
      completedIssueCountScope: cycle.completedScopeHistory?.[cycle.completedScopeHistory.length - 1] || 0,
    }));
  } catch (error) {
    console.error('fetchLinearCycles error:', error);
    // Try alternative query format
    const altQuery = `{
      team(id: "${teamId}") {
        cycles {
          nodes {
            id
            name
            number
            description
            startsAt
            endsAt
            completedAt
            progress
          }
        }
      }
    }`;

    try {
      const altData = await linearQuery(apiKey, altQuery);
      return (altData.team?.cycles?.nodes || []).map((cycle: any) => ({
        ...cycle,
        issueCountScope: 0,
        completedIssueCountScope: 0,
      }));
    } catch (altError) {
      console.error('fetchLinearCycles alt query error:', altError);
      throw altError;
    }
  }
}

// Fetch issues for a specific cycle
export async function fetchLinearCycleIssues(
  apiKey: string,
  cycleId: string
): Promise<LinearIssue[]> {
  const allIssues: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `{
      cycle(id: "${cycleId}") {
        issues(first: 100${afterClause}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            state {
              id
              name
              type
            }
            priority
            dueDate
            createdAt
            startedAt
            updatedAt
            estimate
            project {
              id
              name
            }
            cycle {
              id
              name
            }
            team {
              id
              name
              icon
            }
            assignee {
              id
              name
              displayName
              avatarUrl
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            parent {
              id
              title
            }
            relations {
              nodes {
                type
                relatedIssue {
                  id
                }
              }
            }
          }
        }
      }
    }`;

    const data = await linearQuery(apiKey, query);
    const issues = data.cycle?.issues?.nodes || [];
    allIssues.push(...issues);

    hasNextPage = data.cycle?.issues?.pageInfo?.hasNextPage || false;
    cursor = data.cycle?.issues?.pageInfo?.endCursor || null;
  }

  return allIssues.map((issue: any) => ({
    ...issue,
    stateType: issue.state?.type,
    relations: issue.relations?.nodes || [],
  }));
}

export async function fetchLinearData(apiKey: string, teamId?: string): Promise<LinearData> {
  const [teams, projects, issues] = await Promise.all([
    fetchLinearTeams(apiKey),
    fetchLinearProjects(apiKey, teamId),
    fetchLinearIssues(apiKey, undefined, teamId),
  ]);

  return { teams, projects, issues };
}

// Convert Linear data to Gantt chart tasks
export function convertLinearToTasks(
  projects: LinearProject[],
  issues: LinearIssue[],
  selectedProjectIds: string[]
) {
  const tasks: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    color: string;
    parentId?: string;
    linearProjectId?: string;
    linearIssueId?: string;
    assignee?: string;
    assigneeAvatarUrl?: string;
    teamId?: string;
    teamName?: string;
    teamIcon?: string;
  }> = [];

  const projectColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ];

  // Filter and add selected projects
  const filteredProjects = projects.filter(p => selectedProjectIds.includes(p.id));

  filteredProjects.forEach((project, index) => {
    const projectIssues = issues.filter(i => i.project?.id === project.id);

    // Calculate project dates from issues if not set
    let startDate: Date;
    let endDate: Date;

    if (project.startDate) {
      startDate = new Date(project.startDate);
    } else if (projectIssues.length > 0) {
      const issueDates = projectIssues.map(i => new Date(i.createdAt));
      startDate = new Date(Math.min(...issueDates.map(d => d.getTime())));
    } else {
      startDate = new Date();
    }

    if (project.targetDate) {
      endDate = new Date(project.targetDate);
    } else if (projectIssues.length > 0) {
      const dueDates = projectIssues
        .filter(i => i.dueDate)
        .map(i => new Date(i.dueDate!));
      if (dueDates.length > 0) {
        endDate = new Date(Math.max(...dueDates.map(d => d.getTime())));
      } else {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
      }
    } else {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Ensure endDate is after startDate
    if (endDate <= startDate) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);
    }

    // Calculate progress based on issue states
    const completedIssues = projectIssues.filter(i =>
      i.state.name === 'Done' || i.state.name === 'Completed' || i.state.name === 'Canceled'
    ).length;
    const progress = projectIssues.length > 0
      ? Math.round((completedIssues / projectIssues.length) * 100)
      : (project.state === 'completed' ? 100 : 0);

    const projectTaskId = `linear-project-${project.id}`;
    const color = projectColors[index % projectColors.length];

    tasks.push({
      id: projectTaskId,
      name: project.name,
      startDate,
      endDate,
      progress,
      color,
      linearProjectId: project.id,
    });

    // Add issues as subtasks
    projectIssues.forEach(issue => {
      const issueStart = issue.startedAt
        ? new Date(issue.startedAt)
        : new Date(issue.createdAt);

      let issueEnd: Date;
      if (issue.dueDate) {
        issueEnd = new Date(issue.dueDate);
      } else {
        issueEnd = new Date(issueStart);
        issueEnd.setDate(issueEnd.getDate() + 7);
      }

      // Ensure issue dates are within project range
      if (issueStart < startDate) {
        issueStart.setTime(startDate.getTime());
      }
      if (issueEnd > endDate) {
        issueEnd.setTime(endDate.getTime());
      }
      if (issueEnd <= issueStart) {
        issueEnd = new Date(issueStart);
        issueEnd.setDate(issueEnd.getDate() + 3);
      }

      const issueProgress =
        issue.state.name === 'Done' || issue.state.name === 'Completed' ? 100 :
        issue.state.name === 'In Progress' || issue.state.name === 'In Review' ? 50 :
        issue.state.name === 'Canceled' ? 100 : 0;

      tasks.push({
        id: `linear-issue-${issue.id}`,
        name: issue.title,
        startDate: issueStart,
        endDate: issueEnd,
        progress: issueProgress,
        color,
        parentId: projectTaskId,
        linearIssueId: issue.id,
        assignee: issue.assignee?.name,
        assigneeAvatarUrl: issue.assignee?.avatarUrl,
        teamId: issue.team?.id,
        teamName: issue.team?.name,
        teamIcon: issue.team?.icon,
      });
    });
  });

  return tasks;
}

// Validate API key
export async function validateLinearApiKey(apiKey: string): Promise<boolean> {
  try {
    const query = `{ viewer { id } }`;
    await linearQuery(apiKey, query);
    return true;
  } catch {
    return false;
  }
}

// Update Linear project
export async function updateLinearProject(
  apiKey: string,
  projectId: string,
  updates: {
    name?: string;
    startDate?: string | null;
    targetDate?: string | null;
  }
): Promise<boolean> {
  const updateFields: string[] = [];

  if (updates.name !== undefined) {
    updateFields.push(`name: "${updates.name}"`);
  }
  if (updates.startDate !== undefined) {
    updateFields.push(`startDate: ${updates.startDate ? `"${updates.startDate}"` : 'null'}`);
  }
  if (updates.targetDate !== undefined) {
    updateFields.push(`targetDate: ${updates.targetDate ? `"${updates.targetDate}"` : 'null'}`);
  }

  if (updateFields.length === 0) return true;

  const mutation = `
    mutation {
      projectUpdate(id: "${projectId}", input: { ${updateFields.join(', ')} }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.projectUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to update Linear project:', error);
    return false;
  }
}

// Update Linear issue
export async function updateLinearIssue(
  apiKey: string,
  issueId: string,
  updates: {
    title?: string;
    dueDate?: string | null;
  }
): Promise<boolean> {
  const updateFields: string[] = [];

  if (updates.title !== undefined) {
    updateFields.push(`title: "${updates.title}"`);
  }
  if (updates.dueDate !== undefined) {
    updateFields.push(`dueDate: ${updates.dueDate ? `"${updates.dueDate}"` : 'null'}`);
  }

  if (updateFields.length === 0) return true;

  const mutation = `
    mutation {
      issueUpdate(id: "${issueId}", input: { ${updateFields.join(', ')} }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to update Linear issue:', error);
    return false;
  }
}

// Helper to format date for Linear API (YYYY-MM-DD)
export function formatDateForLinear(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Convert Linear priority (0-4) to SprintTask priority
function convertLinearPriority(priority: number): 'urgent' | 'high' | 'medium' | 'low' | 'none' {
  switch (priority) {
    case 1: return 'urgent';
    case 2: return 'high';
    case 3: return 'medium';
    case 4: return 'low';
    default: return 'none';
  }
}

// Convert Linear state name to SprintTask status
function convertLinearState(stateName: string): 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' {
  const lowerState = stateName.toLowerCase();
  if (lowerState.includes('done') || lowerState.includes('completed') || lowerState.includes('canceled')) {
    return 'done';
  }
  if (lowerState.includes('review')) {
    return 'in_review';
  }
  if (lowerState.includes('progress') || lowerState.includes('started')) {
    return 'in_progress';
  }
  if (lowerState.includes('todo') || lowerState.includes('ready')) {
    return 'todo';
  }
  return 'backlog';
}

// Convert SprintTask status to Linear workflow state
export function convertStatusToLinearState(status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'): string {
  switch (status) {
    case 'done': return 'Done';
    case 'in_review': return 'In Review';
    case 'in_progress': return 'In Progress';
    case 'todo': return 'Todo';
    case 'backlog': return 'Backlog';
    default: return 'Todo';
  }
}

// Task colors based on priority
const priorityColors: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  none: '#3b82f6',
};

// Convert Linear Issue to SprintTask
export interface SprintTaskFromLinear {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  storyPoints?: number;
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  assignee?: string;
  assigneeAvatarUrl?: string;
  sprintId?: string;
  linearProjectId?: string;
  linearIssueId: string;
  linearParentIssueId?: string;
  labels?: string[];
  // State info
  stateId?: string;
  stateName?: string;
  stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  // Relations (dependencies)
  linearBlocks?: string[];
  linearBlockedBy?: string[];
}

export function convertLinearIssueToSprintTask(
  issue: LinearIssue & {
    parent?: { id: string; title: string } | null;
    stateType?: string;
    relations?: Array<{ type: string; relatedIssue: { id: string } }>;
  },
  sprintId?: string
): SprintTaskFromLinear {
  const priority = convertLinearPriority(issue.priority);
  const status = convertLinearState(issue.state.name);

  // Calculate dates
  const startDate = issue.startedAt
    ? new Date(issue.startedAt)
    : new Date(issue.createdAt);

  let endDate: Date;
  if (issue.dueDate) {
    endDate = new Date(issue.dueDate);
  } else {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // Default 7 days
  }

  // Ensure end date is after start date
  if (endDate <= startDate) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);
  }

  // Calculate progress based on status
  const progress = status === 'done' ? 100 :
                   status === 'in_review' ? 80 :
                   status === 'in_progress' ? 50 :
                   status === 'todo' ? 10 : 0;

  // Extract relations (blocks/blocked by)
  const linearBlocks: string[] = [];
  const linearBlockedBy: string[] = [];

  if (issue.relations) {
    for (const rel of issue.relations) {
      const relType = rel.type.toLowerCase();
      if (relType === 'blocks') {
        linearBlocks.push(rel.relatedIssue.id);
      } else if (relType === 'blocked') {
        linearBlockedBy.push(rel.relatedIssue.id);
      }
    }
  }

  return {
    id: `linear-${issue.id}`,
    name: issue.title,
    startDate,
    endDate,
    progress,
    color: priorityColors[priority],
    status,
    storyPoints: issue.estimate || undefined,
    priority,
    assignee: issue.assignee?.name,
    assigneeAvatarUrl: issue.assignee?.avatarUrl,
    sprintId,
    linearProjectId: issue.project?.id,
    linearIssueId: issue.id,
    linearParentIssueId: issue.parent?.id,
    labels: issue.labels?.nodes?.map(l => l.name),
    // State info
    stateId: issue.state.id,
    stateName: issue.state.name,
    stateType: (issue.stateType || issue.state?.type) as SprintTaskFromLinear['stateType'],
    // Relations
    linearBlocks: linearBlocks.length > 0 ? linearBlocks : undefined,
    linearBlockedBy: linearBlockedBy.length > 0 ? linearBlockedBy : undefined,
  };
}

// Convert Linear Cycle to Sprint
export interface SprintFromLinear {
  id: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed';
  capacity?: number;
  linearCycleId: string;
}

export function convertLinearCycleToSprint(cycle: LinearCycle): SprintFromLinear {
  const now = new Date();
  const startDate = new Date(cycle.startsAt);
  const endDate = new Date(cycle.endsAt);

  let status: 'planning' | 'active' | 'completed';
  if (cycle.completedAt) {
    status = 'completed';
  } else if (now >= startDate && now <= endDate) {
    status = 'active';
  } else if (now < startDate) {
    status = 'planning';
  } else {
    status = 'completed';
  }

  return {
    id: `linear-cycle-${cycle.id}`,
    name: cycle.name || `Cycle ${cycle.number}`,
    goal: cycle.description || undefined,
    startDate,
    endDate,
    status,
    capacity: cycle.issueCountScope,
    linearCycleId: cycle.id,
  };
}

// Fetch Linear workflow states for a team
export async function fetchLinearWorkflowStates(
  apiKey: string,
  teamId: string
): Promise<Array<{ id: string; name: string; type: string }>> {
  const query = `{
    team(id: "${teamId}") {
      states {
        nodes {
          id
          name
          type
        }
      }
    }
  }`;

  const data = await linearQuery(apiKey, query);
  return data.team?.states?.nodes || [];
}

// Update Linear issue state
export async function updateLinearIssueState(
  apiKey: string,
  issueId: string,
  stateId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      issueUpdate(id: "${issueId}", input: { stateId: "${stateId}" }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to update Linear issue state:', error);
    return false;
  }
}

// Find matching workflow state for a given status
export async function findLinearStateForStatus(
  apiKey: string,
  teamId: string,
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
): Promise<string | null> {
  const states = await fetchLinearWorkflowStates(apiKey, teamId);

  const statusKeywords: Record<string, string[]> = {
    backlog: ['backlog', 'triage'],
    todo: ['todo', 'ready', 'unstarted'],
    in_progress: ['progress', 'started', 'doing'],
    in_review: ['review'],
    done: ['done', 'completed', 'closed'],
  };

  const keywords = statusKeywords[status];
  const matchedState = states.find(state =>
    keywords.some(kw => state.name.toLowerCase().includes(kw))
  );

  return matchedState?.id || null;
}

// Get team ID for an issue
export async function getTeamIdForIssue(
  apiKey: string,
  issueId: string
): Promise<string | null> {
  const query = `{
    issue(id: "${issueId}") {
      team {
        id
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.issue?.team?.id || null;
  } catch {
    return null;
  }
}

// Linear Comment interface
export interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    displayName: string;
  } | null;
}

// Linear Issue History interface
export interface LinearIssueHistory {
  id: string;
  createdAt: string;
  fromState?: { name: string } | null;
  toState?: { name: string } | null;
  fromAssignee?: { name: string } | null;
  toAssignee?: { name: string } | null;
  fromPriority?: number | null;
  toPriority?: number | null;
  actor?: { name: string } | null;
}

// Fetch comments for an issue
export async function fetchLinearIssueComments(
  apiKey: string,
  issueId: string
): Promise<LinearComment[]> {
  const query = `{
    issue(id: "${issueId}") {
      comments {
        nodes {
          id
          body
          createdAt
          user {
            id
            name
            displayName
          }
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.issue?.comments?.nodes || [];
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return [];
  }
}

// Fetch issue history/activity
export async function fetchLinearIssueHistory(
  apiKey: string,
  issueId: string
): Promise<LinearIssueHistory[]> {
  const query = `{
    issue(id: "${issueId}") {
      history(first: 20) {
        nodes {
          id
          createdAt
          fromState {
            name
          }
          toState {
            name
          }
          fromAssignee {
            name
          }
          toAssignee {
            name
          }
          fromPriority
          toPriority
          actor {
            name
          }
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.issue?.history?.nodes || [];
  } catch (error) {
    console.error('Failed to fetch issue history:', error);
    return [];
  }
}

// Create a comment on an issue
export async function createLinearComment(
  apiKey: string,
  issueId: string,
  body: string
): Promise<boolean> {
  const mutation = `
    mutation {
      commentCreate(input: { issueId: "${issueId}", body: "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }) {
        success
        comment {
          id
        }
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.commentCreate?.success ?? false;
  } catch (error) {
    console.error('Failed to create comment:', error);
    return false;
  }
}

// Fetch full issue details including description
export async function fetchLinearIssueDetails(
  apiKey: string,
  issueId: string
): Promise<LinearIssue & { description?: string; url?: string } | null> {
  const query = `{
    issue(id: "${issueId}") {
      id
      title
      description
      url
      state {
        id
        name
      }
      priority
      dueDate
      createdAt
      startedAt
      estimate
      project {
        id
        name
      }
      cycle {
        id
        name
      }
      team {
        id
      }
      assignee {
        name
      }
      labels {
        nodes {
          name
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.issue || null;
  } catch (error) {
    console.error('Failed to fetch issue details:', error);
    return null;
  }
}

// Update Linear issue (extended)
export async function updateLinearIssueExtended(
  apiKey: string,
  issueId: string,
  updates: {
    title?: string;
    description?: string;
    dueDate?: string | null;
    priority?: number;
    estimate?: number | null;
    assigneeId?: string | null;
    labelIds?: string[];
    parentId?: string | null;
    stateId?: string;
  }
): Promise<boolean> {
  const updateFields: string[] = [];

  if (updates.title !== undefined) {
    updateFields.push(`title: "${updates.title.replace(/"/g, '\\"')}"`);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description: "${updates.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  }
  if (updates.dueDate !== undefined) {
    updateFields.push(`dueDate: ${updates.dueDate ? `"${updates.dueDate}"` : 'null'}`);
  }
  if (updates.priority !== undefined) {
    updateFields.push(`priority: ${updates.priority}`);
  }
  if (updates.estimate !== undefined) {
    updateFields.push(`estimate: ${updates.estimate ?? 'null'}`);
  }
  if (updates.assigneeId !== undefined) {
    updateFields.push(`assigneeId: ${updates.assigneeId ? `"${updates.assigneeId}"` : 'null'}`);
  }
  if (updates.labelIds !== undefined) {
    updateFields.push(`labelIds: [${updates.labelIds.map(id => `"${id}"`).join(', ')}]`);
  }
  if (updates.parentId !== undefined) {
    updateFields.push(`parentId: ${updates.parentId ? `"${updates.parentId}"` : 'null'}`);
  }
  if (updates.stateId !== undefined) {
    updateFields.push(`stateId: "${updates.stateId}"`);
  }

  if (updateFields.length === 0) return true;

  const mutation = `
    mutation {
      issueUpdate(id: "${issueId}", input: { ${updateFields.join(', ')} }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to update Linear issue:', error);
    return false;
  }
}

// Create Linear Issue
export async function createLinearIssue(
  apiKey: string,
  teamId: string,
  input: {
    title: string;
    description?: string;
    priority?: number;
    estimate?: number;
    dueDate?: string;
    cycleId?: string;
    projectId?: string;
    assigneeId?: string;
    labelIds?: string[];
  }
): Promise<{ success: boolean; issueId?: string; identifier?: string }> {
  const inputFields: string[] = [
    `teamId: "${teamId}"`,
    `title: "${input.title.replace(/"/g, '\\"')}"`,
  ];

  if (input.description) {
    inputFields.push(`description: "${input.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  }
  if (input.priority !== undefined) {
    inputFields.push(`priority: ${input.priority}`);
  }
  if (input.estimate !== undefined) {
    inputFields.push(`estimate: ${input.estimate}`);
  }
  if (input.dueDate) {
    inputFields.push(`dueDate: "${input.dueDate}"`);
  }
  if (input.cycleId) {
    inputFields.push(`cycleId: "${input.cycleId}"`);
  }
  if (input.projectId) {
    inputFields.push(`projectId: "${input.projectId}"`);
  }
  if (input.assigneeId) {
    inputFields.push(`assigneeId: "${input.assigneeId}"`);
  }
  if (input.labelIds && input.labelIds.length > 0) {
    inputFields.push(`labelIds: [${input.labelIds.map(id => `"${id}"`).join(', ')}]`);
  }

  const mutation = `
    mutation {
      issueCreate(input: { ${inputFields.join(', ')} }) {
        success
        issue {
          id
          identifier
        }
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return {
      success: data.issueCreate?.success ?? false,
      issueId: data.issueCreate?.issue?.id,
      identifier: data.issueCreate?.issue?.identifier,
    };
  } catch (error) {
    console.error('Failed to create Linear issue:', error);
    return { success: false };
  }
}

// Delete (archive) Linear Issue
export async function deleteLinearIssue(
  apiKey: string,
  issueId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      issueArchive(id: "${issueId}") {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueArchive?.success ?? false;
  } catch (error) {
    console.error('Failed to delete Linear issue:', error);
    return false;
  }
}

// Create Linear Project
export async function createLinearProject(
  apiKey: string,
  teamIds: string[],
  input: {
    name: string;
    description?: string;
    startDate?: string;
    targetDate?: string;
  }
): Promise<{ success: boolean; projectId?: string }> {
  const inputFields: string[] = [
    `name: "${input.name.replace(/"/g, '\\"')}"`,
    `teamIds: [${teamIds.map(id => `"${id}"`).join(', ')}]`,
  ];

  if (input.description) {
    inputFields.push(`description: "${input.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  }
  if (input.startDate) {
    inputFields.push(`startDate: "${input.startDate}"`);
  }
  if (input.targetDate) {
    inputFields.push(`targetDate: "${input.targetDate}"`);
  }

  const mutation = `
    mutation {
      projectCreate(input: { ${inputFields.join(', ')} }) {
        success
        project {
          id
        }
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return {
      success: data.projectCreate?.success ?? false,
      projectId: data.projectCreate?.project?.id,
    };
  } catch (error) {
    console.error('Failed to create Linear project:', error);
    return { success: false };
  }
}

// Delete (archive) Linear Project
export async function deleteLinearProject(
  apiKey: string,
  projectId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      projectArchive(id: "${projectId}") {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.projectArchive?.success ?? false;
  } catch (error) {
    console.error('Failed to delete Linear project:', error);
    return false;
  }
}

// Fetch team members for assignee selection
export async function fetchLinearTeamMembers(
  apiKey: string,
  teamId: string
): Promise<Array<{ id: string; name: string; displayName: string; email: string; avatarUrl?: string }>> {
  const query = `{
    team(id: "${teamId}") {
      members {
        nodes {
          id
          name
          displayName
          email
          avatarUrl
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.team?.members?.nodes || [];
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return [];
  }
}

// Fetch all organization users (for avatar lookup across all teams)
export async function fetchLinearOrganizationUsers(
  apiKey: string
): Promise<Array<{ id: string; name: string; displayName: string; avatarUrl?: string }>> {
  const query = `{
    users(first: 100) {
      nodes {
        id
        name
        displayName
        avatarUrl
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.users?.nodes || [];
  } catch (error) {
    console.error('Failed to fetch organization users:', error);
    return [];
  }
}

// Fetch labels for a team
export async function fetchLinearLabels(
  apiKey: string,
  teamId: string
): Promise<Array<{ id: string; name: string; color: string }>> {
  const query = `{
    team(id: "${teamId}") {
      labels {
        nodes {
          id
          name
          color
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    return data.team?.labels?.nodes || [];
  } catch (error) {
    console.error('Failed to fetch labels:', error);
    return [];
  }
}

// Create Linear Cycle (Sprint)
export async function createLinearCycle(
  apiKey: string,
  teamId: string,
  input: {
    name?: string;
    description?: string;
    startsAt: string;
    endsAt: string;
  }
): Promise<{ success: boolean; cycleId?: string; number?: number }> {
  const inputFields: string[] = [
    `teamId: "${teamId}"`,
    `startsAt: "${input.startsAt}"`,
    `endsAt: "${input.endsAt}"`,
  ];

  if (input.name) {
    inputFields.push(`name: "${input.name.replace(/"/g, '\\"')}"`);
  }
  if (input.description) {
    inputFields.push(`description: "${input.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  }

  const mutation = `
    mutation {
      cycleCreate(input: { ${inputFields.join(', ')} }) {
        success
        cycle {
          id
          number
          name
        }
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return {
      success: data.cycleCreate?.success ?? false,
      cycleId: data.cycleCreate?.cycle?.id,
      number: data.cycleCreate?.cycle?.number,
    };
  } catch (error) {
    console.error('Failed to create Linear cycle:', error);
    return { success: false };
  }
}

// Update Linear Cycle
export async function updateLinearCycle(
  apiKey: string,
  cycleId: string,
  updates: {
    name?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
  }
): Promise<boolean> {
  const updateFields: string[] = [];

  if (updates.name !== undefined) {
    updateFields.push(`name: "${updates.name.replace(/"/g, '\\"')}"`);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description: "${updates.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  }
  if (updates.startsAt !== undefined) {
    updateFields.push(`startsAt: "${updates.startsAt}"`);
  }
  if (updates.endsAt !== undefined) {
    updateFields.push(`endsAt: "${updates.endsAt}"`);
  }

  if (updateFields.length === 0) return true;

  const mutation = `
    mutation {
      cycleUpdate(id: "${cycleId}", input: { ${updateFields.join(', ')} }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.cycleUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to update Linear cycle:', error);
    return false;
  }
}

// Archive Linear Cycle
export async function archiveLinearCycle(
  apiKey: string,
  cycleId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      cycleArchive(id: "${cycleId}") {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.cycleArchive?.success ?? false;
  } catch (error) {
    console.error('Failed to archive Linear cycle:', error);
    return false;
  }
}

// Add issue to cycle
export async function addIssueToCycle(
  apiKey: string,
  issueId: string,
  cycleId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      issueUpdate(id: "${issueId}", input: { cycleId: "${cycleId}" }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to add issue to cycle:', error);
    return false;
  }
}

// Remove issue from cycle
export async function removeIssueFromCycle(
  apiKey: string,
  issueId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      issueUpdate(id: "${issueId}", input: { cycleId: null }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to remove issue from cycle:', error);
    return false;
  }
}

// Get active cycle for team
export async function getActiveCycle(
  apiKey: string,
  teamId: string
): Promise<LinearCycle | null> {
  const query = `{
    team(id: "${teamId}") {
      activeCycle {
        id
        name
        number
        description
        startsAt
        endsAt
        completedAt
        progress
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    const cycle = data.team?.activeCycle;
    if (!cycle) return null;

    return {
      ...cycle,
      issueCountScope: 0,
      completedIssueCountScope: 0,
    };
  } catch (error) {
    console.error('Failed to get active cycle:', error);
    return null;
  }
}

// Fetch workflow states for a team
export async function fetchWorkflowStates(
  apiKey: string,
  teamId: string
): Promise<LinearWorkflowState[]> {
  const query = `{
    team(id: "${teamId}") {
      states {
        nodes {
          id
          name
          color
          type
          position
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    const states = data.team?.states?.nodes || [];
    return states.sort((a: LinearWorkflowState, b: LinearWorkflowState) => a.position - b.position);
  } catch (error) {
    console.error('Failed to fetch workflow states:', error);
    return [];
  }
}

// Update issue state
export async function updateIssueState(
  apiKey: string,
  issueId: string,
  stateId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      issueUpdate(id: "${issueId}", input: { stateId: "${stateId}" }) {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueUpdate?.success ?? false;
  } catch (error) {
    console.error('Failed to update issue state:', error);
    return false;
  }
}

// Fetch issue relations (dependencies)
export async function fetchIssueRelations(
  apiKey: string,
  issueId: string
): Promise<LinearIssueRelation[]> {
  const query = `{
    issue(id: "${issueId}") {
      relations {
        nodes {
          id
          type
          relatedIssue {
            id
            title
            identifier
          }
        }
      }
      inverseRelations {
        nodes {
          id
          type
          issue {
            id
            title
            identifier
          }
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    const relations: LinearIssueRelation[] = [];

    // Forward relations (this issue blocks/relates to other)
    const forwardRelations = data.issue?.relations?.nodes || [];
    for (const rel of forwardRelations) {
      relations.push({
        id: rel.id,
        type: rel.type.toLowerCase() as LinearIssueRelation['type'],
        relatedIssue: rel.relatedIssue,
      });
    }

    // Inverse relations (other issue blocks/relates to this)
    const inverseRelations = data.issue?.inverseRelations?.nodes || [];
    for (const rel of inverseRelations) {
      // Flip the type for inverse
      let type = rel.type.toLowerCase();
      if (type === 'blocks') type = 'blocked';
      else if (type === 'blocked') type = 'blocks';

      relations.push({
        id: rel.id,
        type: type as LinearIssueRelation['type'],
        relatedIssue: rel.issue,
      });
    }

    return relations;
  } catch (error) {
    console.error('Failed to fetch issue relations:', error);
    return [];
  }
}

// Create issue relation (dependency)
export async function createIssueRelation(
  apiKey: string,
  issueId: string,
  relatedIssueId: string,
  type: 'blocks' | 'blocked' | 'related' | 'duplicate'
): Promise<{ success: boolean; relationId?: string }> {
  // Linear uses issueId as the source and relatedIssueId as the target
  // For "blocks", issueId blocks relatedIssueId
  // For "blocked", we need to swap them
  let sourceId = issueId;
  let targetId = relatedIssueId;
  let relationType = type;

  if (type === 'blocked') {
    sourceId = relatedIssueId;
    targetId = issueId;
    relationType = 'blocks';
  }

  const mutation = `
    mutation {
      issueRelationCreate(input: {
        issueId: "${sourceId}",
        relatedIssueId: "${targetId}",
        type: ${relationType}
      }) {
        success
        issueRelation {
          id
        }
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return {
      success: data.issueRelationCreate?.success ?? false,
      relationId: data.issueRelationCreate?.issueRelation?.id,
    };
  } catch (error) {
    console.error('Failed to create issue relation:', error);
    return { success: false };
  }
}

// Delete issue relation
export async function deleteIssueRelation(
  apiKey: string,
  relationId: string
): Promise<boolean> {
  const mutation = `
    mutation {
      issueRelationDelete(id: "${relationId}") {
        success
      }
    }
  `;

  try {
    const data = await linearQuery(apiKey, mutation);
    return data.issueRelationDelete?.success ?? false;
  } catch (error) {
    console.error('Failed to delete issue relation:', error);
    return false;
  }
}

// Fetch issue with children (sub-issues)
export async function fetchIssueWithChildren(
  apiKey: string,
  issueId: string
): Promise<{
  issue: LinearIssue | null;
  children: LinearIssue[];
}> {
  const query = `{
    issue(id: "${issueId}") {
      id
      title
      state {
        id
        name
      }
      priority
      dueDate
      createdAt
      startedAt
      estimate
      project {
        id
        name
      }
      cycle {
        id
        name
      }
      team {
        id
        name
        icon
      }
      assignee {
        id
        name
        displayName
        avatarUrl
      }
      labels {
        nodes {
          name
        }
      }
      children {
        nodes {
          id
          title
          state {
            id
            name
          }
          priority
          dueDate
          createdAt
          startedAt
          estimate
          project {
            id
            name
          }
          cycle {
            id
            name
          }
          team {
            id
            name
            icon
          }
          assignee {
            id
            name
            displayName
            avatarUrl
          }
          labels {
            nodes {
              name
            }
          }
        }
      }
    }
  }`;

  try {
    const data = await linearQuery(apiKey, query);
    const issue = data.issue;
    if (!issue) return { issue: null, children: [] };

    const children = issue.children?.nodes || [];
    delete issue.children;

    return { issue, children };
  } catch (error) {
    console.error('Failed to fetch issue with children:', error);
    return { issue: null, children: [] };
  }
}
