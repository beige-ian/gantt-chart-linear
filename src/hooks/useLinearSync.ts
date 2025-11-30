import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchLinearTeams,
  fetchLinearCycles,
  fetchLinearCycleIssues,
  fetchLinearIssues,
  convertLinearIssueToSprintTask,
  convertLinearCycleToSprint,
  updateLinearIssueState,
  updateLinearIssueExtended,
  createLinearIssue,
  deleteLinearIssue,
  findLinearStateForStatus,
  getTeamIdForIssue,
  formatDateForLinear,
  createIssueRelation,
  deleteIssueRelation,
  fetchIssueRelations,
  LinearTeam,
  LinearCycle,
  LinearIssue,
} from '../services/linear';
import { Sprint, SprintTask } from '../types/sprint';
import { toast } from 'sonner';

export interface UseLinearSyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
  onSyncStart?: () => void;
  onSyncComplete?: (data: SyncResult) => void;
  onSyncError?: (error: Error) => void;
}

export interface SyncResult {
  sprints: Sprint[];
  tasks: SprintTask[];
  lastSyncAt: Date;
}

export interface LinearSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
  teams: LinearTeam[];
  selectedTeamId: string | null;
  cycles: LinearCycle[];
  selectedCycleId: string | null;
}

const DEFAULT_SYNC_INTERVAL = 30000; // 30 seconds

export function useLinearSync(options: UseLinearSyncOptions = {}) {
  const {
    autoSync = true,
    syncInterval = DEFAULT_SYNC_INTERVAL,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [state, setState] = useState<LinearSyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncAt: null,
    error: null,
    teams: [],
    selectedTeamId: null,
    cycles: [],
    selectedCycleId: null,
  });

  const [apiKey, setApiKey] = useState<string>('');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load API key and settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('linear-api-key');
    const savedTeamId = localStorage.getItem('linear-selected-team-id');
    const savedCycleId = localStorage.getItem('linear-selected-cycle-id');

    if (savedKey) {
      setApiKey(savedKey);
      setState(prev => ({
        ...prev,
        selectedTeamId: savedTeamId,
        selectedCycleId: savedCycleId,
      }));
    }
  }, []);

  // Initialize connection when API key changes
  useEffect(() => {
    if (apiKey && !isInitializedRef.current) {
      initializeConnection();
      isInitializedRef.current = true;
    }
  }, [apiKey]);

  // Setup auto-sync interval
  useEffect(() => {
    if (autoSync && state.isConnected && state.selectedTeamId) {
      syncIntervalRef.current = setInterval(() => {
        syncFromLinear();
      }, syncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [autoSync, state.isConnected, state.selectedTeamId, syncInterval]);

  const initializeConnection = async () => {
    if (!apiKey) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const teams = await fetchLinearTeams(apiKey);
      setState(prev => ({
        ...prev,
        isConnected: true,
        teams,
        isSyncing: false,
      }));

      // If team was previously selected, load cycles
      const savedTeamId = localStorage.getItem('linear-selected-team-id');
      if (savedTeamId && teams.some(t => t.id === savedTeamId)) {
        await selectTeam(savedTeamId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({
        ...prev,
        isConnected: false,
        isSyncing: false,
        error: errorMessage,
      }));
      onSyncError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const selectTeam = async (teamId: string) => {
    if (!apiKey) return;

    // Clear previous cycle selection when changing teams
    setState(prev => ({
      ...prev,
      isSyncing: true,
      selectedTeamId: teamId,
      selectedCycleId: null,
      cycles: [],
    }));
    localStorage.setItem('linear-selected-team-id', teamId);
    localStorage.removeItem('linear-selected-cycle-id');

    try {
      const cycles = await fetchLinearCycles(apiKey, teamId);
      setState(prev => ({
        ...prev,
        cycles,
        isSyncing: false,
      }));

      // Auto-select the first active cycle (not completed)
      const activeCycle = cycles.find(c => !c.completedAt);
      if (activeCycle) {
        await selectCycle(activeCycle.id);
      }
    } catch (error) {
      setState(prev => ({ ...prev, isSyncing: false }));
      console.error('Failed to fetch cycles:', error);
    }
  };

  const selectCycle = async (cycleId: string) => {
    setState(prev => ({ ...prev, selectedCycleId: cycleId }));
    localStorage.setItem('linear-selected-cycle-id', cycleId);
    await syncFromLinear(cycleId);
  };

  const syncFromLinear = useCallback(async (cycleIdOverride?: string) => {
    const cycleId = cycleIdOverride || state.selectedCycleId;
    if (!apiKey || !state.selectedTeamId) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    onSyncStart?.();

    try {
      let linearIssues: LinearIssue[];
      let linearCycle: LinearCycle | undefined;

      if (cycleId) {
        // Fetch issues for specific cycle
        linearIssues = await fetchLinearCycleIssues(apiKey, cycleId);
        linearCycle = state.cycles.find(c => c.id === cycleId);
      } else {
        // Fetch all team issues
        linearIssues = await fetchLinearIssues(apiKey, undefined, state.selectedTeamId);
      }

      // Convert to SprintTask format
      const sprintId = linearCycle ? `linear-cycle-${linearCycle.id}` : undefined;
      let convertedTasks: SprintTask[] = linearIssues.map(issue =>
        convertLinearIssueToSprintTask(issue, sprintId) as SprintTask
      );

      // Convert linearBlockedBy to dependencies (task IDs)
      const linearIssueToTaskId = new Map<string, string>();
      convertedTasks.forEach(task => {
        if (task.linearIssueId) {
          linearIssueToTaskId.set(task.linearIssueId, task.id);
        }
      });

      convertedTasks = convertedTasks.map(task => {
        if (task.linearBlockedBy && task.linearBlockedBy.length > 0) {
          const dependencies = task.linearBlockedBy
            .map(linearId => linearIssueToTaskId.get(linearId))
            .filter((id): id is string => id !== undefined);
          return {
            ...task,
            dependencies: dependencies.length > 0 ? dependencies : task.dependencies,
          };
        }
        return task;
      });

      // Convert cycle to Sprint if exists
      const convertedSprints: Sprint[] = [];
      if (linearCycle) {
        convertedSprints.push(convertLinearCycleToSprint(linearCycle) as Sprint);
      }

      setTasks(convertedTasks);
      setSprints(convertedSprints);

      const syncResult: SyncResult = {
        sprints: convertedSprints,
        tasks: convertedTasks,
        lastSyncAt: new Date(),
      };

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));

      onSyncComplete?.(syncResult);

      // Save to localStorage
      localStorage.setItem('sprint-tasks', JSON.stringify(convertedTasks));
      if (convertedSprints.length > 0) {
        localStorage.setItem('sprints', JSON.stringify(convertedSprints));
      }

      return syncResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      onSyncError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [apiKey, state.selectedTeamId, state.selectedCycleId, state.cycles, onSyncStart, onSyncComplete, onSyncError]);

  // Sync task status change to Linear
  const syncTaskStatusToLinear = useCallback(async (
    task: SprintTask,
    newStatus: SprintTask['status']
  ): Promise<boolean> => {
    if (!apiKey || !task.linearIssueId) return false;

    try {
      const teamId = await getTeamIdForIssue(apiKey, task.linearIssueId);
      if (!teamId) return false;

      const stateId = await findLinearStateForStatus(apiKey, teamId, newStatus);
      if (!stateId) return false;

      const success = await updateLinearIssueState(apiKey, task.linearIssueId, stateId);
      if (success) {
        toast.success('Linear 동기화 완료', { description: '상태가 업데이트되었습니다' });
      }
      return success;
    } catch (error) {
      console.error('Failed to sync status to Linear:', error);
      toast.error('Linear 동기화 실패');
      return false;
    }
  }, [apiKey]);

  // Sync task update to Linear
  const syncTaskUpdateToLinear = useCallback(async (
    task: SprintTask
  ): Promise<boolean> => {
    if (!apiKey || !task.linearIssueId) return false;

    const priorityMap: Record<SprintTask['priority'], number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4,
      none: 0,
    };

    try {
      const success = await updateLinearIssueExtended(apiKey, task.linearIssueId, {
        title: task.name,
        description: task.description,
        priority: priorityMap[task.priority],
        estimate: task.storyPoints,
        dueDate: task.endDate ? formatDateForLinear(task.endDate) : null,
      });

      if (success) {
        toast.success('Linear 동기화 완료', { description: '태스크가 업데이트되었습니다' });
      }
      return success;
    } catch (error) {
      console.error('Failed to sync task update to Linear:', error);
      toast.error('Linear 동기화 실패');
      return false;
    }
  }, [apiKey]);

  // Create task in Linear
  const createTaskInLinear = useCallback(async (
    task: Omit<SprintTask, 'id'>
  ): Promise<{ success: boolean; issueId?: string; identifier?: string }> => {
    if (!apiKey || !state.selectedTeamId) {
      return { success: false };
    }

    const priorityMap: Record<SprintTask['priority'], number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4,
      none: 0,
    };

    try {
      const result = await createLinearIssue(apiKey, state.selectedTeamId, {
        title: task.name,
        description: task.description,
        priority: priorityMap[task.priority],
        estimate: task.storyPoints,
        dueDate: task.endDate ? formatDateForLinear(task.endDate) : undefined,
        cycleId: state.selectedCycleId || undefined,
      });

      if (result.success) {
        toast.success('Linear에 이슈 생성됨', { description: result.identifier });
      }
      return result;
    } catch (error) {
      console.error('Failed to create task in Linear:', error);
      toast.error('Linear 이슈 생성 실패');
      return { success: false };
    }
  }, [apiKey, state.selectedTeamId, state.selectedCycleId]);

  // Delete task from Linear
  const deleteTaskFromLinear = useCallback(async (
    linearIssueId: string
  ): Promise<boolean> => {
    if (!apiKey) return false;

    try {
      const success = await deleteLinearIssue(apiKey, linearIssueId);
      if (success) {
        toast.success('Linear에서 삭제됨');
      }
      return success;
    } catch (error) {
      console.error('Failed to delete from Linear:', error);
      toast.error('Linear 삭제 실패');
      return false;
    }
  }, [apiKey]);

  // Add dependency (relation) to Linear
  const addDependencyToLinear = useCallback(async (
    blockedIssueId: string,
    blockingIssueId: string
  ): Promise<boolean> => {
    if (!apiKey) return false;

    try {
      // blockedIssueId is blocked BY blockingIssueId
      // In Linear terms: blockingIssueId blocks blockedIssueId
      const result = await createIssueRelation(apiKey, blockingIssueId, blockedIssueId, 'blocks');
      if (result.success) {
        toast.success('Linear 의존성 추가됨');
      }
      return result.success;
    } catch (error) {
      console.error('Failed to add dependency to Linear:', error);
      toast.error('Linear 의존성 추가 실패');
      return false;
    }
  }, [apiKey]);

  // Remove dependency (relation) from Linear
  const removeDependencyFromLinear = useCallback(async (
    issueId: string,
    relatedIssueId: string
  ): Promise<boolean> => {
    if (!apiKey) return false;

    try {
      // First, fetch the issue's relations to find the relation ID
      const relations = await fetchIssueRelations(apiKey, issueId);
      const relation = relations.find(r => r.relatedIssue.id === relatedIssueId);

      if (relation) {
        const success = await deleteIssueRelation(apiKey, relation.id);
        if (success) {
          toast.success('Linear 의존성 삭제됨');
        }
        return success;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove dependency from Linear:', error);
      toast.error('Linear 의존성 삭제 실패');
      return false;
    }
  }, [apiKey]);

  // Helper: Convert linearBlockedBy to dependencies (task IDs)
  const convertLinearDependenciesToTaskIds = useCallback((
    allTasks: SprintTask[]
  ): SprintTask[] => {
    // Create a map of linearIssueId -> taskId
    const linearIssueToTaskId = new Map<string, string>();
    allTasks.forEach(task => {
      if (task.linearIssueId) {
        linearIssueToTaskId.set(task.linearIssueId, task.id);
      }
    });

    // Update tasks with converted dependencies
    return allTasks.map(task => {
      if (task.linearBlockedBy && task.linearBlockedBy.length > 0) {
        const dependencies = task.linearBlockedBy
          .map(linearId => linearIssueToTaskId.get(linearId))
          .filter((id): id is string => id !== undefined);

        return {
          ...task,
          dependencies: dependencies.length > 0 ? dependencies : task.dependencies,
        };
      }
      return task;
    });
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    return syncFromLinear();
  }, [syncFromLinear]);

  // Connect with API key
  const connect = useCallback((newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem('linear-api-key', newApiKey);
    isInitializedRef.current = false;
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setApiKey('');
    localStorage.removeItem('linear-api-key');
    localStorage.removeItem('linear-selected-team-id');
    localStorage.removeItem('linear-selected-cycle-id');
    setState({
      isConnected: false,
      isSyncing: false,
      lastSyncAt: null,
      error: null,
      teams: [],
      selectedTeamId: null,
      cycles: [],
      selectedCycleId: null,
    });
    setSprints([]);
    setTasks([]);
    isInitializedRef.current = false;
  }, []);

  return {
    // State
    ...state,
    apiKey,
    sprints,
    tasks,

    // Actions
    connect,
    disconnect,
    selectTeam,
    selectCycle,
    triggerSync,
    syncTaskStatusToLinear,
    syncTaskUpdateToLinear,
    createTaskInLinear,
    deleteTaskFromLinear,
    // Dependencies
    addDependencyToLinear,
    removeDependencyFromLinear,
    convertLinearDependenciesToTaskIds,
  };
}
