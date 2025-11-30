export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed';
  capacity?: number; // Total story points planned
  linearCycleId?: string; // Linear Cycle ID for sync
  teamId?: string; // Linear Team ID
  teamName?: string; // Linear Team name for display
}

export interface SprintTask {
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
  assigneeId?: string;
  assigneeAvatarUrl?: string;
  sprintId?: string;
  parentId?: string;
  dependencies?: string[];
  linearProjectId?: string;
  linearIssueId?: string;
  linearParentIssueId?: string;
  labels?: string[];
  // Linear workflow state
  stateId?: string;
  stateName?: string;
  stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  // Linear relations (dependencies)
  linearBlocks?: string[];    // Linear issue IDs this task blocks
  linearBlockedBy?: string[]; // Linear issue IDs blocking this task
}

export interface SprintStats {
  totalPoints: number;
  completedPoints: number;
  remainingPoints: number;
  totalTasks: number;
  completedTasks: number;
  velocity: number; // Points per day
  burndownData: BurndownDataPoint[];
}

export interface BurndownDataPoint {
  date: Date;
  idealRemaining: number;
  actualRemaining: number;
}

export interface SprintCapacity {
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  teamMembers: TeamMemberCapacity[];
}

export interface TeamMemberCapacity {
  name: string;
  avatar?: string;
  totalPoints: number;
  assignedPoints: number;
}

// Priority colors from design tokens
export const PRIORITY_COLORS: Record<SprintTask['priority'], string> = {
  urgent: 'var(--priority-urgent, #ef4444)',
  high: 'var(--priority-high, #f97316)',
  medium: 'var(--priority-medium, #eab308)',
  low: 'var(--priority-low, #22c55e)',
  none: 'var(--priority-none, #6b7280)',
};

// Status colors from design tokens
export const STATUS_COLORS: Record<SprintTask['status'], string> = {
  backlog: 'var(--status-backlog, #6b6f80)',
  todo: 'var(--status-todo, #0ea5e9)',
  in_progress: 'var(--status-in-progress, #f59e0b)',
  in_review: 'var(--status-in-review, #8b5cf6)',
  done: 'var(--status-done, #22c55e)',
};

export const STATUS_LABELS: Record<SprintTask['status'], string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<SprintTask['priority'], string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No Priority',
};
