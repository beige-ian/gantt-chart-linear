import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { RefreshCw, Download, Link2, Check, AlertCircle, Upload, Unlink, Clock, ArrowLeftRight, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Sprint, SprintTask } from '../types/sprint';
import {
  fetchLinearTeams,
  fetchLinearCycles,
  fetchLinearCycleIssues,
  fetchLinearIssues,
  fetchLinearBacklogIssues,
  convertLinearIssueToSprintTask,
  convertLinearCycleToSprint,
  updateLinearIssueState,
  findLinearStateForStatus,
  getTeamIdForIssue,
  LinearTeam,
  LinearCycle,
  LinearIssue,
  validateLinearApiKey,
  getLinearErrorMessage,
} from '../services/linear';

interface LinearSprintSyncProps {
  sprints: Sprint[];
  sprintTasks: SprintTask[];
  onImportSprint: (sprint: Omit<Sprint, 'id'>) => void;
  onImportTasks: (tasks: Omit<SprintTask, 'id'>[]) => void;
  onLinkSprint: (sprintId: string, linearCycleId: string) => void;
  onUpdateTasks?: (tasks: SprintTask[]) => void;
  onUpdateSprints?: (sprints: Sprint[]) => void;
}

export function LinearSprintSync({
  sprints,
  sprintTasks,
  onImportSprint,
  onImportTasks,
  onLinkSprint,
  onUpdateTasks,
  onUpdateSprints,
}: LinearSprintSyncProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'sync' | 'settings'>('import');
  const [apiKey, setApiKey] = useState('');
  const [isValidKey, setIsValidKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false); // Ref to track current syncing state for interval callbacks
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [cycleIssues, setCycleIssues] = useState<LinearIssue[]>([]);
  const [importMode, setImportMode] = useState<'cycle' | 'issues'>('cycle');
  const [linkSprintId, setLinkSprintId] = useState<string>('');
  const [autoSync, setAutoSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Keep ref in sync with state for interval callbacks
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  // Load API key and selected team from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('linear-api-key');
    const savedTeamId = localStorage.getItem('linear-default-team');
    if (savedKey) {
      setApiKey(savedKey);
    }
    if (savedTeamId) {
      setSelectedTeamId(savedTeamId);
    }
  }, []);

  // Validate API key
  useEffect(() => {
    if (apiKey.length > 10) {
      validateLinearApiKey(apiKey).then(valid => {
        setIsValidKey(valid);
        if (valid) {
          localStorage.setItem('linear-api-key', apiKey);
          fetchLinearTeams(apiKey).then(setTeams).catch(console.error);
        }
      });
    } else {
      setIsValidKey(false);
    }
  }, [apiKey]);

  // Fetch cycles when team is selected
  useEffect(() => {
    if (selectedTeamId && isValidKey) {
      setIsLoading(true);
      setCycles([]);
      setSelectedCycleId('');
      setCycleIssues([]);
      fetchLinearCycles(apiKey, selectedTeamId)
        .then((data) => {
          setCycles(data);
          if (data.length === 0) {
            toast.info('이 팀에 Cycle이 없습니다', { description: 'Linear에서 Cycle을 먼저 생성해주세요' });
          }
        })
        .catch((error) => {
          console.error('Failed to fetch cycles:', error);
          toast.error('Cycle 가져오기 실패', { description: getLinearErrorMessage(error) });
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedTeamId, apiKey, isValidKey]);

  // Fetch issues when cycle is selected
  useEffect(() => {
    if (selectedCycleId && isValidKey) {
      setIsLoading(true);
      fetchLinearCycleIssues(apiKey, selectedCycleId)
        .then(setCycleIssues)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [selectedCycleId, apiKey, isValidKey]);

  const handleImportCycle = () => {
    const selectedCycle = cycles.find(c => c.id === selectedCycleId);
    if (!selectedCycle) {
      toast.error('Please select a cycle');
      return;
    }

    setIsLoading(true);

    // Get team info
    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    // Convert cycle to sprint with team info
    const sprintData = convertLinearCycleToSprint(
      selectedCycle,
      selectedTeamId,
      selectedTeam?.name
    );

    // Calculate sprint ID (same logic as handleImportSprint in SprintDashboard)
    const expectedSprintId = sprintData.linearCycleId
      ? `linear-cycle-${sprintData.linearCycleId}`
      : Date.now().toString();

    // Import sprint (remove id since it will be generated)
    onImportSprint({
      name: sprintData.name,
      goal: sprintData.goal,
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
      status: sprintData.status,
      capacity: sprintData.capacity,
      linearCycleId: sprintData.linearCycleId,
      teamId: sprintData.teamId,
      teamName: sprintData.teamName,
    });

    // Convert issues to tasks - IMPORTANT: pass the sprintId explicitly
    const tasks = cycleIssues.map(issue =>
      convertLinearIssueToSprintTask(issue, expectedSprintId)
    );

    // Import tasks with explicit sprintId to avoid race condition
    if (tasks.length > 0) {
      onImportTasks(tasks.map(t => ({
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        endDate: t.endDate,
        progress: t.progress,
        color: t.color,
        status: t.status,
        storyPoints: t.storyPoints,
        priority: t.priority,
        assignee: t.assignee,
        sprintId: expectedSprintId, // Explicitly set sprintId
        linearProjectId: t.linearProjectId,
        linearIssueId: t.linearIssueId,
        linearParentIssueId: t.linearParentIssueId,
        labels: t.labels,
        stateId: t.stateId,
        stateName: t.stateName,
        stateType: t.stateType,
        linearBlocks: t.linearBlocks,
        linearBlockedBy: t.linearBlockedBy,
      })));
    }

    toast.success(`Imported ${selectedCycle.name}`, {
      description: `${tasks.length} issues imported`,
    });

    setIsLoading(false);
    setIsOpen(false);
  };

  const handleImportIssues = () => {
    if (cycleIssues.length === 0) {
      toast.error('No issues to import');
      return;
    }

    const tasks = cycleIssues.map(issue =>
      convertLinearIssueToSprintTask(issue, linkSprintId || undefined)
    );

    onImportTasks(tasks.map(t => ({
      name: t.name,
      description: t.description,
      startDate: t.startDate,
      endDate: t.endDate,
      progress: t.progress,
      color: t.color,
      status: t.status,
      storyPoints: t.storyPoints,
      priority: t.priority,
      assignee: t.assignee,
      sprintId: linkSprintId || undefined,
      linearProjectId: t.linearProjectId,
      linearIssueId: t.linearIssueId,
      linearParentIssueId: t.linearParentIssueId,
      labels: t.labels,
      stateId: t.stateId,
      stateName: t.stateName,
      stateType: t.stateType,
      linearBlocks: t.linearBlocks,
      linearBlockedBy: t.linearBlockedBy,
    })));

    toast.success(`Imported ${tasks.length} issues`);
    setIsOpen(false);
  };

  const handleLinkSprint = () => {
    if (!linkSprintId || !selectedCycleId) {
      toast.error('Please select both sprint and cycle');
      return;
    }

    onLinkSprint(linkSprintId, selectedCycleId);
    toast.success('Sprint linked to Linear cycle');
    setIsOpen(false);
  };

  const getActiveCycle = () => {
    return cycles.find(c => !c.completedAt);
  };

  // Get linked sprints (sprints with linearCycleId)
  const linkedSprints = sprints.filter(s => s.linearCycleId);

  // Get tasks with Linear issue IDs
  const linkedTasks = sprintTasks.filter(t => t.linearIssueId);

  // Sync linked sprint from Linear
  const handleSyncFromLinear = useCallback(async (sprint: Sprint, silent = false) => {
    if (!sprint.linearCycleId || !isValidKey) return;

    setIsSyncing(true);
    if (!silent) setSyncError(null);

    try {
      // Fetch latest issues from the linked cycle
      const issues = await fetchLinearCycleIssues(apiKey, sprint.linearCycleId);

      // Get Linear issue IDs that should be in this sprint
      const linearIssueIdsInCycle = new Set(issues.map(i => i.id));

      // Find existing task Linear IDs in this sprint
      const existingTaskLinearIds = new Set(
        sprintTasks
          .filter(t => t.sprintId === sprint.id && t.linearIssueId)
          .map(t => t.linearIssueId)
      );

      // Separate new vs existing issues
      const newIssues = issues.filter(i => !existingTaskLinearIds.has(i.id));
      const existingIssues = issues.filter(i => existingTaskLinearIds.has(i.id));

      // Count removed tasks
      const removedCount = sprintTasks.filter(t =>
        t.sprintId === sprint.id &&
        t.linearIssueId &&
        !linearIssueIdsInCycle.has(t.linearIssueId)
      ).length;

      // Build complete task list in ONE operation to avoid race conditions
      if (onUpdateTasks) {
        // Step 1: Keep tasks from OTHER sprints and non-Linear tasks unchanged
        // Step 2: Update existing Linear tasks for THIS sprint
        // Step 3: Remove tasks no longer in the cycle
        const updatedExistingTasks = sprintTasks
          .map(task => {
            // Keep non-Linear tasks unchanged
            if (!task.linearIssueId) return task;

            // Keep tasks from OTHER sprints unchanged
            if (task.sprintId !== sprint.id) return task;

            // For THIS sprint: remove if not in Linear cycle anymore
            if (!linearIssueIdsInCycle.has(task.linearIssueId)) {
              return null; // Mark for removal
            }

            // Update if still in cycle
            const linearIssue = existingIssues.find(i => i.id === task.linearIssueId);
            if (!linearIssue) return task;

            const converted = convertLinearIssueToSprintTask(linearIssue, sprint.id);
            return {
              ...task,
              name: converted.name,
              description: converted.description,
              startDate: converted.startDate,
              endDate: converted.endDate,
              status: converted.status,
              progress: converted.progress,
              storyPoints: converted.storyPoints,
              priority: converted.priority,
              assignee: converted.assignee,
              labels: converted.labels,
              stateId: converted.stateId,
              stateName: converted.stateName,
              stateType: converted.stateType,
              linearBlocks: converted.linearBlocks,
              linearBlockedBy: converted.linearBlockedBy,
              linearParentIssueId: converted.linearParentIssueId,
            };
          })
          .filter((task): task is SprintTask => task !== null);

        // Step 4: Add new tasks from Linear
        const newIssueIds = new Set(newIssues.map(i => i.id));
        const newTasks: SprintTask[] = newIssues.map(issue => {
          const converted = convertLinearIssueToSprintTask(issue, sprint.id);
          return {
            id: `linear-${issue.id}`,
            name: converted.name,
            description: converted.description,
            startDate: converted.startDate,
            endDate: converted.endDate,
            progress: converted.progress,
            color: converted.color,
            status: converted.status,
            storyPoints: converted.storyPoints,
            priority: converted.priority,
            assignee: converted.assignee,
            sprintId: sprint.id,
            linearProjectId: converted.linearProjectId,
            linearIssueId: converted.linearIssueId,
            linearParentIssueId: converted.linearParentIssueId,
            labels: converted.labels,
            stateId: converted.stateId,
            stateName: converted.stateName,
            stateType: converted.stateType,
            linearBlocks: converted.linearBlocks,
            linearBlockedBy: converted.linearBlockedBy,
          };
        });

        // Combine - but first remove any duplicates (e.g., task was in backlog, now in this cycle)
        const finalTaskList = [
          ...updatedExistingTasks.filter(t => !t.linearIssueId || !newIssueIds.has(t.linearIssueId)),
          ...newTasks,
        ];
        onUpdateTasks(finalTaskList);

        if (removedCount > 0 && !silent) {
          toast.info(`${removedCount}개 태스크가 Linear에서 제거됨`);
        }
      }

      // Update sprint team info if missing
      if (onUpdateSprints && (!sprint.teamId || !sprint.teamName) && selectedTeamId) {
        const selectedTeam = teams.find(t => t.id === selectedTeamId);
        if (selectedTeam) {
          const updatedSprints = sprints.map(s =>
            s.id === sprint.id
              ? { ...s, teamId: selectedTeamId, teamName: selectedTeam.name }
              : s
          );
          onUpdateSprints(updatedSprints);
        }
      }

      setLastSyncTime(new Date());
      if (!silent) {
        toast.success('Linear에서 동기화 완료', {
          description: `${newIssues.length}개 새 이슈, ${existingIssues.length}개 업데이트`,
        });
      }
    } catch (error) {
      const errorMessage = getLinearErrorMessage(error);
      if (!silent) {
        setSyncError(errorMessage);
        toast.error('동기화 실패', { description: errorMessage });
      }
      console.error('Sync failed:', errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [apiKey, isValidKey, sprintTasks, sprints, teams, selectedTeamId, onUpdateTasks, onUpdateSprints]);

  // Sync backlog issues (issues without cycle assignment)
  const handleSyncBacklogFromLinear = useCallback(async (silent = false) => {
    if (!isValidKey || !selectedTeamId) return;

    setIsSyncing(true);
    if (!silent) setSyncError(null);

    try {
      // Fetch backlog issues (not assigned to any cycle)
      const backlogIssues = await fetchLinearBacklogIssues(apiKey, selectedTeamId);

      // Get Linear issue IDs that should be in backlog
      const linearIssueIdsInBacklog = new Set(backlogIssues.map(i => i.id));

      // Get existing backlog task Linear IDs
      const existingBacklogTaskLinearIds = new Set(
        sprintTasks
          .filter(t => !t.sprintId && t.linearIssueId)
          .map(t => t.linearIssueId)
      );

      const newBacklogIssues = backlogIssues.filter(i => !existingBacklogTaskLinearIds.has(i.id));
      const existingBacklogIssues = backlogIssues.filter(i => existingBacklogTaskLinearIds.has(i.id));

      // Build complete task list in ONE operation
      if (onUpdateTasks) {
        // Update existing tasks (keep sprint tasks, update backlog tasks)
        const updatedExistingTasks = sprintTasks
          .map(task => {
            // Keep non-Linear tasks unchanged
            if (!task.linearIssueId) return task;

            // Keep tasks WITH sprint assignment unchanged
            if (task.sprintId) return task;

            // For backlog tasks (no sprintId):
            // Remove if no longer in backlog (might have been assigned to a cycle)
            if (!linearIssueIdsInBacklog.has(task.linearIssueId)) {
              return null; // Mark for removal
            }

            // Update if still in backlog
            const linearIssue = existingBacklogIssues.find(i => i.id === task.linearIssueId);
            if (!linearIssue) return task;

            const converted = convertLinearIssueToSprintTask(linearIssue, undefined);
            return {
              ...task,
              name: converted.name,
              description: converted.description,
              startDate: converted.startDate,
              endDate: converted.endDate,
              status: converted.status,
              progress: converted.progress,
              storyPoints: converted.storyPoints,
              priority: converted.priority,
              assignee: converted.assignee,
              labels: converted.labels,
              stateId: converted.stateId,
              stateName: converted.stateName,
              stateType: converted.stateType,
              linearBlocks: converted.linearBlocks,
              linearBlockedBy: converted.linearBlockedBy,
              linearParentIssueId: converted.linearParentIssueId,
            };
          })
          .filter((task): task is SprintTask => task !== null);

        // Add new backlog tasks - check for duplicates first
        const newBacklogIssueIds = new Set(newBacklogIssues.map(i => i.id));
        const newTasks: SprintTask[] = newBacklogIssues.map(issue => {
          const converted = convertLinearIssueToSprintTask(issue, undefined);
          return {
            id: `linear-${issue.id}`,
            name: converted.name,
            description: converted.description,
            startDate: converted.startDate,
            endDate: converted.endDate,
            progress: converted.progress,
            color: converted.color,
            status: converted.status,
            storyPoints: converted.storyPoints,
            priority: converted.priority,
            assignee: converted.assignee,
            sprintId: undefined, // Backlog - no sprint
            linearProjectId: converted.linearProjectId,
            linearIssueId: converted.linearIssueId,
            linearParentIssueId: converted.linearParentIssueId,
            labels: converted.labels,
            stateId: converted.stateId,
            stateName: converted.stateName,
            stateType: converted.stateType,
            linearBlocks: converted.linearBlocks,
            linearBlockedBy: converted.linearBlockedBy,
          };
        });

        // Combine - remove duplicates first (e.g., task was in a sprint, now in backlog)
        const finalTaskList = [
          ...updatedExistingTasks.filter(t => !t.linearIssueId || !newBacklogIssueIds.has(t.linearIssueId)),
          ...newTasks,
        ];
        onUpdateTasks(finalTaskList);
      }

      if (!silent) {
        toast.success('백로그 동기화 완료', {
          description: `${newBacklogIssues.length}개 새 이슈, ${existingBacklogIssues.length}개 업데이트`,
        });
      }
    } catch (error) {
      const errorMessage = getLinearErrorMessage(error);
      if (!silent) {
        setSyncError(errorMessage);
        toast.error('백로그 동기화 실패', { description: errorMessage });
      }
      console.error('Backlog sync failed:', errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [apiKey, isValidKey, selectedTeamId, sprintTasks, onUpdateTasks]);

  // Sync all linked sprints AND backlog in ONE operation to avoid stale state issues
  const handleSyncAllFromLinear = async (silent = false) => {
    if (!isValidKey || !onUpdateTasks) return;

    setIsSyncing(true);
    if (!silent) setSyncError(null);

    try {
      // Step 1: Fetch ALL data in parallel - use Promise.allSettled for resilience
      const sprintDataPromises = linkedSprints.map(async (sprint) => {
        if (!sprint.linearCycleId) return { sprint, issues: [], error: null };
        try {
          const issues = await fetchLinearCycleIssues(apiKey, sprint.linearCycleId);
          return { sprint, issues, error: null };
        } catch (error) {
          console.error(`Failed to fetch sprint ${sprint.name}:`, error);
          return { sprint, issues: [], error };
        }
      });

      const backlogPromise = selectedTeamId
        ? fetchLinearBacklogIssues(apiKey, selectedTeamId).catch(error => {
            console.error('Failed to fetch backlog:', error);
            return [];
          })
        : Promise.resolve([]);

      const [sprintResults, backlogIssues] = await Promise.all([
        Promise.all(sprintDataPromises),
        backlogPromise,
      ]);

      // Step 2: Build complete task list from current sprintTasks
      let finalTasks = [...sprintTasks];
      let totalNew = 0;
      let totalUpdated = 0;
      let totalRemoved = 0;

      // Process each sprint (skip failed fetches)
      for (const { sprint, issues, error } of sprintResults) {
        if (!sprint.linearCycleId || error) continue;

        const linearIssueIdsInCycle = new Set(issues.map(i => i.id));
        const existingTaskLinearIds = new Set(
          finalTasks
            .filter(t => t.sprintId === sprint.id && t.linearIssueId)
            .map(t => t.linearIssueId)
        );

        const newIssues = issues.filter(i => !existingTaskLinearIds.has(i.id));
        const existingIssues = issues.filter(i => existingTaskLinearIds.has(i.id));

        // Remove tasks no longer in cycle, update existing
        finalTasks = finalTasks
          .map(task => {
            if (!task.linearIssueId) return task;
            if (task.sprintId !== sprint.id) return task;

            if (!linearIssueIdsInCycle.has(task.linearIssueId)) {
              totalRemoved++;
              return null;
            }

            const linearIssue = existingIssues.find(i => i.id === task.linearIssueId);
            if (!linearIssue) return task;

            totalUpdated++;
            const converted = convertLinearIssueToSprintTask(linearIssue, sprint.id);
            return {
              ...task,
              name: converted.name,
              description: converted.description,
              startDate: converted.startDate,
              endDate: converted.endDate,
              status: converted.status,
              progress: converted.progress,
              storyPoints: converted.storyPoints,
              priority: converted.priority,
              assignee: converted.assignee,
              labels: converted.labels,
              stateId: converted.stateId,
              stateName: converted.stateName,
              stateType: converted.stateType,
              linearBlocks: converted.linearBlocks,
              linearBlockedBy: converted.linearBlockedBy,
              linearParentIssueId: converted.linearParentIssueId,
            };
          })
          .filter((task): task is SprintTask => task !== null);

        // Add new tasks - but first check if task with same linearIssueId exists elsewhere
        // (e.g., in backlog) and remove it to prevent duplicates
        for (const issue of newIssues) {
          // Remove any existing task with the same linearIssueId (from backlog or other sprint)
          const existingIndex = finalTasks.findIndex(t => t.linearIssueId === issue.id);
          if (existingIndex !== -1) {
            finalTasks.splice(existingIndex, 1);
            // Don't count as "new" if it was just moved from backlog
          } else {
            totalNew++;
          }

          const converted = convertLinearIssueToSprintTask(issue, sprint.id);
          finalTasks.push({
            id: `linear-${issue.id}`,
            name: converted.name,
            description: converted.description,
            startDate: converted.startDate,
            endDate: converted.endDate,
            progress: converted.progress,
            color: converted.color,
            status: converted.status,
            storyPoints: converted.storyPoints,
            priority: converted.priority,
            assignee: converted.assignee,
            sprintId: sprint.id,
            linearProjectId: converted.linearProjectId,
            linearIssueId: converted.linearIssueId,
            linearParentIssueId: converted.linearParentIssueId,
            labels: converted.labels,
            stateId: converted.stateId,
            stateName: converted.stateName,
            stateType: converted.stateType,
            linearBlocks: converted.linearBlocks,
            linearBlockedBy: converted.linearBlockedBy,
          });
        }
      }

      // Process backlog - ALWAYS process if we have a team selected (even if backlogIssues is empty)
      // This ensures tasks that moved from backlog to a cycle get removed from backlog
      if (selectedTeamId) {
        const linearIssueIdsInBacklog = new Set(backlogIssues.map(i => i.id));
        const existingBacklogLinearIds = new Set(
          finalTasks
            .filter(t => !t.sprintId && t.linearIssueId)
            .map(t => t.linearIssueId)
        );

        const newBacklogIssues = backlogIssues.filter(i => !existingBacklogLinearIds.has(i.id));
        const existingBacklogIssues = backlogIssues.filter(i => existingBacklogLinearIds.has(i.id));

        // Update/remove backlog tasks
        finalTasks = finalTasks
          .map(task => {
            if (!task.linearIssueId) return task;
            if (task.sprintId) return task; // Keep sprint tasks

            // Remove if no longer in backlog (moved to a cycle or deleted)
            if (!linearIssueIdsInBacklog.has(task.linearIssueId)) {
              totalRemoved++;
              return null;
            }

            const linearIssue = existingBacklogIssues.find(i => i.id === task.linearIssueId);
            if (!linearIssue) return task;

            totalUpdated++;
            const converted = convertLinearIssueToSprintTask(linearIssue, undefined);
            return {
              ...task,
              name: converted.name,
              description: converted.description,
              startDate: converted.startDate,
              endDate: converted.endDate,
              status: converted.status,
              progress: converted.progress,
              storyPoints: converted.storyPoints,
              priority: converted.priority,
              assignee: converted.assignee,
              labels: converted.labels,
              stateId: converted.stateId,
              stateName: converted.stateName,
              stateType: converted.stateType,
              linearBlocks: converted.linearBlocks,
              linearBlockedBy: converted.linearBlockedBy,
              linearParentIssueId: converted.linearParentIssueId,
            };
          })
          .filter((task): task is SprintTask => task !== null);

        // Add new backlog tasks - check for duplicates first
        for (const issue of newBacklogIssues) {
          // Remove any existing task with the same linearIssueId to prevent duplicates
          const existingIndex = finalTasks.findIndex(t => t.linearIssueId === issue.id);
          if (existingIndex !== -1) {
            finalTasks.splice(existingIndex, 1);
          } else {
            totalNew++;
          }

          const converted = convertLinearIssueToSprintTask(issue, undefined);
          finalTasks.push({
            id: `linear-${issue.id}`,
            name: converted.name,
            description: converted.description,
            startDate: converted.startDate,
            endDate: converted.endDate,
            progress: converted.progress,
            color: converted.color,
            status: converted.status,
            storyPoints: converted.storyPoints,
            priority: converted.priority,
            assignee: converted.assignee,
            sprintId: undefined,
            linearProjectId: converted.linearProjectId,
            linearIssueId: converted.linearIssueId,
            linearParentIssueId: converted.linearParentIssueId,
            labels: converted.labels,
            stateId: converted.stateId,
            stateName: converted.stateName,
            stateType: converted.stateType,
            linearBlocks: converted.linearBlocks,
            linearBlockedBy: converted.linearBlockedBy,
          });
        }
      }

      // Step 3: Update state ONCE
      onUpdateTasks(finalTasks);
      setLastSyncTime(new Date());

      if (!silent) {
        toast.success('Linear 동기화 완료', {
          description: `새 이슈 ${totalNew}개, 업데이트 ${totalUpdated}개${totalRemoved > 0 ? `, 제거 ${totalRemoved}개` : ''}`,
        });
      }
    } catch (error) {
      const errorMessage = getLinearErrorMessage(error);
      if (!silent) {
        setSyncError(errorMessage);
        toast.error('동기화 실패', { description: errorMessage });
      }
      console.error('Sync all failed:', errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync polling (every 30 seconds when enabled)
  useEffect(() => {
    // Load auto-sync setting from localStorage
    const savedAutoSync = localStorage.getItem('linear-auto-sync') === 'true';
    setAutoSync(savedAutoSync);
  }, []);

  // Track if initial sync has been done to prevent duplicate syncs
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    // Need either linked sprints OR a selected team (for backlog sync)
    if (!autoSync || !isValidKey || (linkedSprints.length === 0 && !selectedTeamId)) return;

    // Delay initial sync to ensure state is fully initialized
    const timeoutId = setTimeout(() => {
      // Use refs to get current values (avoid stale closure)
      if (!initialSyncDoneRef.current && !isSyncingRef.current) {
        initialSyncDoneRef.current = true;
        // Silent sync on initial load - don't show error toasts for auto-sync failures
        handleSyncAllFromLinear(true).catch(() => {
          // Silently ignore auto-sync errors on initial load
          console.log('Initial auto-sync skipped or failed');
        });
      }
    }, 2000); // 2 second delay for initial sync

    // Set up polling interval (60 seconds instead of 30 to reduce errors)
    const intervalId = setInterval(() => {
      // Use ref to get current syncing state (avoid stale closure)
      if (!isSyncingRef.current) {
        // Silent sync for polling - don't show error toasts
        handleSyncAllFromLinear(true).catch(() => {
          console.log('Auto-sync polling skipped or failed');
        });
      }
    }, 60000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [autoSync, isValidKey, linkedSprints.length, selectedTeamId]);

  // Push task status changes to Linear
  const handlePushToLinear = async (task: SprintTask) => {
    if (!task.linearIssueId || !isValidKey) return;

    setIsSyncing(true);

    try {
      const teamId = await getTeamIdForIssue(apiKey, task.linearIssueId);
      if (!teamId) throw new Error('팀 정보를 찾을 수 없습니다');

      const stateId = await findLinearStateForStatus(apiKey, teamId, task.status);
      if (!stateId) throw new Error('상태를 매핑할 수 없습니다');

      const success = await updateLinearIssueState(apiKey, task.linearIssueId, stateId);
      if (success) {
        toast.success('Linear 업데이트 완료', { description: task.name });
      } else {
        throw new Error('업데이트 실패');
      }
    } catch (error) {
      toast.error('Linear 푸시 실패', { description: getLinearErrorMessage(error) });
    } finally {
      setIsSyncing(false);
    }
  };

  // Push all changed tasks to Linear
  const handlePushAllToLinear = async () => {
    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (const task of linkedTasks) {
      try {
        const teamId = await getTeamIdForIssue(apiKey, task.linearIssueId!);
        if (!teamId) continue;

        const stateId = await findLinearStateForStatus(apiKey, teamId, task.status);
        if (!stateId) continue;

        const success = await updateLinearIssueState(apiKey, task.linearIssueId!, stateId);
        if (success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setIsSyncing(false);
    toast.success('Linear 푸시 완료', {
      description: `${successCount}개 성공, ${failCount}개 실패`,
    });
  };

  // Unlink sprint from Linear cycle
  const handleUnlinkSprint = (sprintId: string) => {
    onLinkSprint(sprintId, '');
    toast.success('Linear 연결 해제됨');
  };

  // Get selected team name
  const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`gap-2 ${isValidKey && selectedTeamId ? 'border-blue-300 dark:border-blue-700' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">
          {isValidKey && selectedTeamName ? selectedTeamName : 'Linear'}
        </span>
        {linkedSprints.length > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5">
            {linkedSprints.length}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Linear 동기화
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* API Key Input */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="apiKey">Linear API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="lin_api_..."
                  className="flex-1"
                />
                {isValidKey ? (
                  <Badge variant="default" className="gap-1 shrink-0">
                    <Check className="h-3 w-3" />
                    연결됨
                  </Badge>
                ) : apiKey.length > 0 ? (
                  <Badge variant="destructive" className="gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" />
                    무효
                  </Badge>
                ) : null}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Linear Settings → API → Personal API keys
              </p>
            </div>

            {isValidKey ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="import" className="gap-1">
                    <Download className="h-3 w-3" />
                    <span className="hidden sm:inline">가져오기</span>
                  </TabsTrigger>
                  <TabsTrigger value="sync" className="gap-1">
                    <ArrowLeftRight className="h-3 w-3" />
                    <span className="hidden sm:inline">동기화</span>
                    {linkedSprints.length > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1 px-1">
                        {linkedSprints.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-1">
                    <Settings className="h-3 w-3" />
                    <span className="hidden sm:inline">설정</span>
                  </TabsTrigger>
                </TabsList>

                {/* Import Tab */}
                <TabsContent value="import" className="space-y-4 mt-4">
                  {/* Team Selection */}
                  <div className="space-y-2">
                    <Label>팀 선택</Label>
                    <Select value={selectedTeamId} onValueChange={(v) => {
                      setSelectedTeamId(v);
                      localStorage.setItem('linear-default-team', v);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="팀을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTeamId && (
                    <>
                      {/* Cycle Selection */}
                      <div className="space-y-2">
                        <Label>Linear Cycle (스프린트)</Label>
                        {isLoading ? (
                          <div className="flex items-center gap-2 p-3 border rounded-md text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Cycle 불러오는 중...</span>
                          </div>
                        ) : cycles.length === 0 ? (
                          <div className="p-3 border rounded-md text-center text-muted-foreground">
                            <p className="text-sm">이 팀에 Cycle이 없습니다</p>
                            <p className="text-xs mt-1">Linear에서 Cycle을 먼저 생성해주세요</p>
                          </div>
                        ) : (
                          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Cycle 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {cycles.map(cycle => (
                                <SelectItem key={cycle.id} value={cycle.id}>
                                  <div className="flex items-center gap-2">
                                    {cycle.name || `Cycle ${cycle.number}`}
                                    {!cycle.completedAt && cycle.progress > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        진행중
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {selectedCycleId && (
                        <>
                          {/* Cycle Info */}
                          <Card className="p-3 space-y-2">
                            {(() => {
                              const cycle = cycles.find(c => c.id === selectedCycleId);
                              if (!cycle) return null;
                              return (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">이슈</span>
                                    <span className="font-medium">{cycle.issueCountScope}개</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">완료</span>
                                    <span className="font-medium text-green-600">{cycle.completedIssueCountScope}개</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">진행률</span>
                                    <span className="font-medium">{Math.round(cycle.progress * 100)}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">기간</span>
                                    <span className="font-medium text-xs">
                                      {new Date(cycle.startsAt).toLocaleDateString('ko')} ~ {new Date(cycle.endsAt).toLocaleDateString('ko')}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </Card>

                          {/* Import Mode */}
                          <div className="space-y-2">
                            <Label>가져오기 모드</Label>
                            <div className="flex gap-2">
                              <Button
                                variant={importMode === 'cycle' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setImportMode('cycle')}
                                className="flex-1"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                스프린트로
                              </Button>
                              <Button
                                variant={importMode === 'issues' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setImportMode('issues')}
                                className="flex-1"
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                이슈만
                              </Button>
                            </div>
                          </div>

                          {importMode === 'issues' && sprints.length > 0 && (
                            <div className="space-y-2">
                              <Label>스프린트에 추가 (선택)</Label>
                              <Select value={linkSprintId} onValueChange={setLinkSprintId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="스프린트 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">백로그</SelectItem>
                                  {sprints.filter(s => s.status !== 'completed').map(sprint => (
                                    <SelectItem key={sprint.id} value={sprint.id}>
                                      {sprint.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Preview */}
                          {cycleIssues.length > 0 && (
                            <div className="space-y-2">
                              <Label>가져올 이슈 ({cycleIssues.length}개)</Label>
                              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                                {cycleIssues.slice(0, 8).map(issue => (
                                  <div key={issue.id} className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {issue.state.name}
                                    </Badge>
                                    <span className="truncate">{issue.title}</span>
                                  </div>
                                ))}
                                {cycleIssues.length > 8 && (
                                  <div className="text-xs text-muted-foreground text-center py-1">
                                    +{cycleIssues.length - 8}개 더
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Import Button */}
                          <Button
                            onClick={importMode === 'cycle' ? handleImportCycle : handleImportIssues}
                            disabled={isLoading || cycleIssues.length === 0}
                            className="w-full"
                          >
                            {isLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {importMode === 'cycle' ? '스프린트 가져오기' : '이슈 가져오기'}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Sync Tab */}
                <TabsContent value="sync" className="space-y-4 mt-4">
                  {linkedSprints.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">연결된 스프린트가 없습니다</p>
                      <p className="text-xs mt-1">가져오기 탭에서 Cycle을 스프린트로 가져오세요</p>
                    </div>
                  ) : (
                    <>
                      {/* Sync Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSyncAllFromLinear}
                          disabled={isSyncing}
                          className="flex-1"
                        >
                          <Download className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                          Linear에서 가져오기
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePushAllToLinear}
                          disabled={isSyncing || linkedTasks.length === 0}
                          className="flex-1"
                        >
                          <Upload className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                          Linear로 푸시
                        </Button>
                      </div>

                      {/* Last Sync Time */}
                      {lastSyncTime && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          마지막 동기화: {lastSyncTime.toLocaleTimeString('ko')}
                        </div>
                      )}

                      {/* Sync Error */}
                      {syncError && (
                        <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            {syncError}
                          </div>
                        </div>
                      )}

                      {/* Linked Sprints List */}
                      <div className="space-y-2">
                        <Label>연결된 스프린트 ({linkedSprints.length}개)</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {linkedSprints.map(sprint => {
                            const taskCount = sprintTasks.filter(t => t.sprintId === sprint.id && t.linearIssueId).length;
                            return (
                              <Card key={sprint.id} className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{sprint.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {taskCount}개 연결된 태스크
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleSyncFromLinear(sprint)}
                                      disabled={isSyncing}
                                    >
                                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleUnlinkSprint(sprint.id)}
                                    >
                                      <Unlink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>

                      {/* Linked Tasks Summary */}
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">연결된 태스크</span>
                          <span className="font-medium">{linkedTasks.length}개</span>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    {/* Auto Sync Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">자동 동기화</Label>
                        <p className="text-xs text-muted-foreground">
                          앱 시작 시 자동으로 Linear와 동기화
                        </p>
                      </div>
                      <Switch
                        checked={autoSync}
                        onCheckedChange={(checked) => {
                          setAutoSync(checked);
                          localStorage.setItem('linear-auto-sync', String(checked));
                        }}
                      />
                    </div>

                    {/* Team Selection for settings */}
                    <div className="space-y-2">
                      <Label>기본 팀</Label>
                      <Select value={selectedTeamId} onValueChange={(v) => {
                        setSelectedTeamId(v);
                        localStorage.setItem('linear-default-team', v);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="팀 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Connection Info */}
                    <Card className="p-3 space-y-2">
                      <div className="text-sm font-medium">연결 정보</div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>팀 수</span>
                          <span>{teams.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>연결된 스프린트</span>
                          <span>{linkedSprints.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>연결된 태스크</span>
                          <span>{linkedTasks.length}</span>
                        </div>
                      </div>
                    </Card>

                    {/* Reset Connection */}
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => {
                        localStorage.removeItem('linear-api-key');
                        localStorage.removeItem('linear-default-team');
                        localStorage.removeItem('linear-auto-sync');
                        setApiKey('');
                        setIsValidKey(false);
                        setTeams([]);
                        setCycles([]);
                        toast.success('Linear 연결이 초기화되었습니다');
                      }}
                    >
                      연결 초기화
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  유효한 API 키를 입력하세요
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
