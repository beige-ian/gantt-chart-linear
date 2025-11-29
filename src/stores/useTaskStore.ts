import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchLinearTeams,
  fetchLinearProjects,
  fetchLinearIssues,
  fetchLinearCycles,
  createLinearProject,
  createLinearIssue,
  updateLinearProject,
  updateLinearIssueExtended,
  deleteLinearProject,
  deleteLinearIssue,
  LinearTeam,
  LinearProject,
  LinearIssue,
  LinearCycle,
} from '../services/linear';

// Unified Task type that works for both Timeline and Sprint views
export interface UnifiedTask {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;

  // Hierarchy
  parentId?: string;

  // Linear Integration
  linearProjectId?: string;
  linearIssueId?: string;
  linearCycleId?: string;
  linearIdentifier?: string;

  // Sprint/Kanban fields
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  storyPoints?: number;

  // Assignment
  assignee?: string;
  assigneeId?: string;
  assigneeAvatarUrl?: string;

  // Labels
  labels?: { id?: string; name: string; color: string }[];

  // Gantt specific
  dependencies?: string[];
  isMilestone?: boolean;
}

// Sprint type
export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed';
  linearCycleId?: string;
}

interface LinearConnection {
  apiKey: string | null;
  isConnected: boolean;
  selectedTeamId: string | null;
  selectedCycleId: string | null;
  teams: LinearTeam[];
  cycles: LinearCycle[];
}

interface TaskStore {
  // Tasks
  tasks: UnifiedTask[];
  sprints: Sprint[];

  // Linear Connection
  linear: LinearConnection;

  // Sync State
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;

  // Task Actions
  addTask: (task: Omit<UnifiedTask, 'id'>) => Promise<UnifiedTask>;
  updateTask: (id: string, updates: Partial<UnifiedTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Sprint Actions
  addSprint: (sprint: Omit<Sprint, 'id'>) => void;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;

  // Linear Actions
  connectLinear: (apiKey: string) => Promise<boolean>;
  disconnectLinear: () => void;
  selectTeam: (teamId: string) => Promise<void>;
  selectCycle: (cycleId: string | null) => void;

  // Sync Actions
  syncFromLinear: () => Promise<void>;
  syncToLinear: (taskId: string) => Promise<void>;

  // Utility
  getTasksByParent: (parentId: string | null) => UnifiedTask[];
  getTasksBySprint: (sprintId: string) => UnifiedTask[];
  getActiveSprint: () => Sprint | undefined;
}

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  none: '#6b7280',
};

// Convert Linear priority number to our priority type
const convertLinearPriority = (priority: number): UnifiedTask['priority'] => {
  switch (priority) {
    case 1: return 'urgent';
    case 2: return 'high';
    case 3: return 'medium';
    case 4: return 'low';
    default: return 'none';
  }
};

// Convert Linear state to our status type
const convertLinearState = (stateName: string): UnifiedTask['status'] => {
  const lower = stateName.toLowerCase();
  if (lower.includes('done') || lower.includes('completed') || lower.includes('canceled')) return 'done';
  if (lower.includes('review')) return 'in_review';
  if (lower.includes('progress') || lower.includes('started')) return 'in_progress';
  if (lower.includes('todo') || lower.includes('ready')) return 'todo';
  return 'backlog';
};

// Convert our priority to Linear priority number
const priorityToLinear = (priority: UnifiedTask['priority']): number => {
  switch (priority) {
    case 'urgent': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 4;
    default: return 0;
  }
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // Initial State
      tasks: [],
      sprints: [],
      linear: {
        apiKey: null,
        isConnected: false,
        selectedTeamId: null,
        selectedCycleId: null,
        teams: [],
        cycles: [],
      },
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,

      // Task Actions
      addTask: async (taskData) => {
        const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newTask: UnifiedTask = {
          ...taskData,
          id,
          status: taskData.status || 'backlog',
          priority: taskData.priority || 'none',
          progress: taskData.progress || 0,
          color: taskData.color || PRIORITY_COLORS[taskData.priority || 'none'],
        };

        const { linear } = get();

        // Create in Linear if connected
        if (linear.isConnected && linear.apiKey && linear.selectedTeamId) {
          try {
            if (!taskData.parentId) {
              // Create as Project
              const result = await createLinearProject(linear.apiKey, [linear.selectedTeamId], {
                name: newTask.name,
                description: newTask.description,
                startDate: newTask.startDate.toISOString().split('T')[0],
                targetDate: newTask.endDate.toISOString().split('T')[0],
              });
              if (result.success && result.projectId) {
                newTask.linearProjectId = result.projectId;
              }
            } else {
              // Create as Issue
              const parentTask = get().tasks.find(t => t.id === taskData.parentId);
              const result = await createLinearIssue(linear.apiKey, linear.selectedTeamId, {
                title: newTask.name,
                description: newTask.description,
                dueDate: newTask.endDate.toISOString().split('T')[0],
                projectId: parentTask?.linearProjectId,
                priority: priorityToLinear(newTask.priority),
                estimate: newTask.storyPoints,
                cycleId: linear.selectedCycleId || undefined,
              });
              if (result.success) {
                newTask.linearIssueId = result.issueId;
                newTask.linearIdentifier = result.identifier;
              }
            }
          } catch (error) {
            console.error('Failed to create in Linear:', error);
          }
        }

        set(state => ({ tasks: [...state.tasks, newTask] }));
        return newTask;
      },

      updateTask: async (id, updates) => {
        const { linear, tasks } = get();
        const task = tasks.find(t => t.id === id);

        if (!task) return;

        // Update locally
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
        }));

        // Update in Linear if connected
        if (linear.isConnected && linear.apiKey) {
          try {
            if (task.linearProjectId) {
              await updateLinearProject(linear.apiKey, task.linearProjectId, {
                name: updates.name,
                startDate: updates.startDate?.toISOString().split('T')[0],
                targetDate: updates.endDate?.toISOString().split('T')[0],
              });
            } else if (task.linearIssueId) {
              await updateLinearIssueExtended(linear.apiKey, task.linearIssueId, {
                title: updates.name,
                description: updates.description,
                dueDate: updates.endDate?.toISOString().split('T')[0],
                priority: updates.priority ? priorityToLinear(updates.priority) : undefined,
                estimate: updates.storyPoints,
                assigneeId: updates.assigneeId,
              });
            }
          } catch (error) {
            console.error('Failed to update in Linear:', error);
          }
        }
      },

      deleteTask: async (id) => {
        const { linear, tasks } = get();
        const task = tasks.find(t => t.id === id);

        if (!task) return;

        // Delete from Linear if connected
        if (linear.isConnected && linear.apiKey) {
          try {
            if (task.linearProjectId) {
              await deleteLinearProject(linear.apiKey, task.linearProjectId);
            } else if (task.linearIssueId) {
              await deleteLinearIssue(linear.apiKey, task.linearIssueId);
            }
          } catch (error) {
            console.error('Failed to delete from Linear:', error);
          }
        }

        // Delete locally (including children)
        const idsToDelete = new Set([id]);
        const findChildren = (parentId: string) => {
          tasks.filter(t => t.parentId === parentId).forEach(child => {
            idsToDelete.add(child.id);
            findChildren(child.id);
          });
        };
        findChildren(id);

        set(state => ({
          tasks: state.tasks.filter(t => !idsToDelete.has(t.id)),
        }));
      },

      // Sprint Actions
      addSprint: (sprintData) => {
        const id = `sprint-${Date.now()}`;
        set(state => ({
          sprints: [...state.sprints, { ...sprintData, id }],
        }));
      },

      updateSprint: (id, updates) => {
        set(state => ({
          sprints: state.sprints.map(s => s.id === id ? { ...s, ...updates } : s),
        }));
      },

      deleteSprint: (id) => {
        set(state => ({
          sprints: state.sprints.filter(s => s.id !== id),
        }));
      },

      // Linear Actions
      connectLinear: async (apiKey) => {
        set({ isSyncing: true, syncError: null });

        try {
          const teams = await fetchLinearTeams(apiKey);

          if (teams.length === 0) {
            set({ isSyncing: false, syncError: 'No teams found' });
            return false;
          }

          // Also save to localStorage for other components
          localStorage.setItem('linear-api-key', apiKey);

          set({
            linear: {
              apiKey,
              isConnected: true,
              selectedTeamId: teams[0].id,
              selectedCycleId: null,
              teams,
              cycles: [],
            },
            isSyncing: false,
          });

          // Fetch cycles for first team
          await get().selectTeam(teams[0].id);

          return true;
        } catch (error) {
          console.error('Failed to connect to Linear:', error);
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : 'Connection failed',
          });
          return false;
        }
      },

      disconnectLinear: () => {
        localStorage.removeItem('linear-api-key');
        localStorage.removeItem('linear-selected-team-id');

        set({
          linear: {
            apiKey: null,
            isConnected: false,
            selectedTeamId: null,
            selectedCycleId: null,
            teams: [],
            cycles: [],
          },
        });
      },

      selectTeam: async (teamId) => {
        const { linear } = get();
        if (!linear.apiKey) return;

        localStorage.setItem('linear-selected-team-id', teamId);

        try {
          const cycles = await fetchLinearCycles(linear.apiKey, teamId);

          set(state => ({
            linear: {
              ...state.linear,
              selectedTeamId: teamId,
              cycles,
              selectedCycleId: null,
            },
          }));
        } catch (error) {
          console.error('Failed to fetch cycles:', error);
        }
      },

      selectCycle: (cycleId) => {
        set(state => ({
          linear: {
            ...state.linear,
            selectedCycleId: cycleId,
          },
        }));
      },

      // Sync Actions
      syncFromLinear: async () => {
        const { linear } = get();
        if (!linear.isConnected || !linear.apiKey || !linear.selectedTeamId) return;

        set({ isSyncing: true, syncError: null });

        try {
          // Fetch projects and issues
          const [projects, issues] = await Promise.all([
            fetchLinearProjects(linear.apiKey, linear.selectedTeamId),
            fetchLinearIssues(linear.apiKey, undefined, linear.selectedTeamId, linear.selectedCycleId || undefined),
          ]);

          const newTasks: UnifiedTask[] = [];

          // Convert projects to tasks
          projects.forEach((project: LinearProject) => {
            newTasks.push({
              id: `linear-project-${project.id}`,
              name: project.name,
              description: project.description,
              startDate: project.startDate ? new Date(project.startDate) : new Date(),
              endDate: project.targetDate ? new Date(project.targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              progress: project.state === 'completed' ? 100 : 0,
              color: '#5e6ad2',
              status: project.state === 'completed' ? 'done' : 'in_progress',
              priority: 'none',
              linearProjectId: project.id,
            });
          });

          // Convert issues to tasks
          issues.forEach((issue: LinearIssue) => {
            const parentProjectTask = newTasks.find(t => t.linearProjectId === issue.project?.id);

            newTasks.push({
              id: `linear-issue-${issue.id}`,
              name: issue.title,
              startDate: issue.startedAt ? new Date(issue.startedAt) : new Date(issue.createdAt),
              endDate: issue.dueDate ? new Date(issue.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              progress: convertLinearState(issue.state.name) === 'done' ? 100 :
                       convertLinearState(issue.state.name) === 'in_review' ? 80 :
                       convertLinearState(issue.state.name) === 'in_progress' ? 50 : 0,
              color: PRIORITY_COLORS[convertLinearPriority(issue.priority)],
              status: convertLinearState(issue.state.name),
              priority: convertLinearPriority(issue.priority),
              storyPoints: issue.estimate || undefined,
              assignee: issue.assignee?.name,
              assigneeId: issue.assignee?.id,
              assigneeAvatarUrl: issue.assignee?.avatarUrl,
              linearIssueId: issue.id,
              linearProjectId: issue.project?.id,
              linearCycleId: issue.cycle?.id,
              parentId: parentProjectTask?.id,
              labels: issue.labels?.nodes?.map(l => ({ name: l.name, color: '#6b7280' })),
            });
          });

          set({
            tasks: newTasks,
            isSyncing: false,
            lastSyncAt: new Date(),
          });
        } catch (error) {
          console.error('Failed to sync from Linear:', error);
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : 'Sync failed',
          });
        }
      },

      syncToLinear: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        await get().updateTask(taskId, task);
      },

      // Utility
      getTasksByParent: (parentId) => {
        return get().tasks.filter(t => t.parentId === parentId);
      },

      getTasksBySprint: (sprintId) => {
        const sprint = get().sprints.find(s => s.id === sprintId);
        if (!sprint?.linearCycleId) return [];
        return get().tasks.filter(t => t.linearCycleId === sprint.linearCycleId);
      },

      getActiveSprint: () => {
        return get().sprints.find(s => s.status === 'active');
      },
    }),
    {
      name: 'sprint-manager-store',
      partialize: (state) => ({
        tasks: state.tasks.map(t => ({
          ...t,
          startDate: t.startDate.toISOString(),
          endDate: t.endDate.toISOString(),
        })),
        sprints: state.sprints.map(s => ({
          ...s,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
        })),
        linear: {
          apiKey: state.linear.apiKey,
          selectedTeamId: state.linear.selectedTeamId,
          selectedCycleId: state.linear.selectedCycleId,
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert date strings back to Date objects
          state.tasks = state.tasks.map(t => ({
            ...t,
            startDate: new Date(t.startDate),
            endDate: new Date(t.endDate),
          }));
          state.sprints = state.sprints.map(s => ({
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
          }));

          // Restore connection if API key exists
          if (state.linear.apiKey) {
            const apiKey = state.linear.apiKey;
            setTimeout(() => {
              state.connectLinear(apiKey);
            }, 100);
          }
        }
      },
    }
  )
);
