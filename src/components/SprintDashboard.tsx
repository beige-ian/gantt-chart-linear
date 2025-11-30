import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { LayoutGrid, GanttChartSquare, TrendingUp, Plus, Users, Clock, Target, Zap, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Sprint, SprintTask } from '../types/sprint';
import { SprintManager } from './SprintManager';
import { SprintBoard } from './SprintBoard';
import { SprintTaskForm } from './SprintTaskForm';
import { BurndownChart } from './BurndownChart';
import { GanttChart, Task } from './GanttChart';
import { LinearSprintSync } from './LinearSprintSync';
import { LinearCycleManager } from './LinearCycleManager';
import { BacklogPanel } from './BacklogPanel';
import { VelocityChart } from './VelocityChart';
import { DataExport } from './DataExport';
import { DataImport } from './DataImport';
import { TeamManager, useTeamMembers } from './TeamManager';
import { DeadlineAlerts } from './DeadlineAlerts';
import { TaskFilters, TaskFilterOptions, TaskSortOptions, applyTaskFiltersAndSort } from './TaskFilters';
import {
  findLinearStateForStatus,
  getTeamIdForIssue,
  updateLinearIssueState,
  createLinearIssue,
  deleteLinearIssue,
  fetchLinearTeams,
  formatDateForLinear,
  convertToLinearPriority,
  updateLinearIssueExtended,
} from '../services/linear';

type ViewMode = 'board' | 'gantt' | 'analytics';

export function SprintDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [currentSprintId, setCurrentSprintId] = useState<string | undefined>();
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SprintTask | null>(null);
  const { members: teamMembers, updateMembers: setTeamMembers } = useTeamMembers();

  // Filter and sort state
  const [taskFilters, setTaskFilters] = useState<TaskFilterOptions>({
    search: '',
    priority: [],
    assignee: [],
    hasDeadlineSoon: false,
    isOverdue: false,
  });
  const [taskSort, setTaskSort] = useState<TaskSortOptions>({
    field: 'priority',
    direction: 'asc',
  });

  // Load data from localStorage
  useEffect(() => {
    const savedSprints = localStorage.getItem('sprints');
    if (savedSprints) {
      try {
        const parsed = JSON.parse(savedSprints);
        const sprintsWithDates = parsed.map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
        }));
        setSprints(sprintsWithDates);

        // Set current sprint to active or first planning
        const active = sprintsWithDates.find((s: Sprint) => s.status === 'active');
        const planning = sprintsWithDates.find((s: Sprint) => s.status === 'planning');
        if (active) setCurrentSprintId(active.id);
        else if (planning) setCurrentSprintId(planning.id);
      } catch (e) {
        console.error('Failed to load sprints:', e);
      }
    }

    const savedTasks = localStorage.getItem('sprint-tasks');
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        const tasksWithDates = parsed.map((t: any) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        }));
        setSprintTasks(tasksWithDates);
      } catch (e) {
        console.error('Failed to load sprint tasks:', e);
      }
    }
  }, []);

  // Save sprints
  useEffect(() => {
    if (sprints.length > 0) {
      localStorage.setItem('sprints', JSON.stringify(sprints));
    }
  }, [sprints]);

  // Save tasks
  useEffect(() => {
    if (sprintTasks.length > 0) {
      localStorage.setItem('sprint-tasks', JSON.stringify(sprintTasks));
    }
  }, [sprintTasks]);

  // Sprint handlers
  const handleCreateSprint = (sprintData: Omit<Sprint, 'id'>) => {
    const newSprint: Sprint = {
      ...sprintData,
      id: Date.now().toString(),
    };
    setSprints([...sprints, newSprint]);
    setCurrentSprintId(newSprint.id);
    toast.success('Sprint created', { description: newSprint.name });
  };

  const handleUpdateSprint = (sprint: Sprint) => {
    setSprints(sprints.map(s => s.id === sprint.id ? sprint : s));
    toast.success('Sprint updated');
  };

  const handleStartSprint = (sprintId: string) => {
    // Complete any active sprint first
    setSprints(sprints.map(s => {
      if (s.id === sprintId) return { ...s, status: 'active' as const };
      if (s.status === 'active') return { ...s, status: 'completed' as const };
      return s;
    }));
    toast.success('Sprint started');
  };

  const handleCompleteSprint = (sprintId: string) => {
    setSprints(sprints.map(s =>
      s.id === sprintId ? { ...s, status: 'completed' as const } : s
    ));
    toast.success('Sprint completed');
  };

  // Task handlers
  const handleStatusChange = async (taskId: string, status: SprintTask['status']) => {
    const task = sprintTasks.find(t => t.id === taskId);

    // Optimistic update
    setSprintTasks(sprintTasks.map(t =>
      t.id === taskId ? { ...t, status, progress: status === 'done' ? 100 : t.progress } : t
    ));

    // Sync with Linear if task is linked
    if (task?.linearIssueId) {
      const apiKey = localStorage.getItem('linear-api-key');
      if (apiKey) {
        try {
          const teamId = await getTeamIdForIssue(apiKey, task.linearIssueId);
          if (teamId) {
            const stateId = await findLinearStateForStatus(apiKey, teamId, status);
            if (stateId) {
              const success = await updateLinearIssueState(apiKey, task.linearIssueId, stateId);
              if (success) {
                toast.success('Linear 동기화 완료', { description: '상태 업데이트됨' });
              } else {
                toast.error('Linear 상태 변경 실패');
              }
            } else {
              toast.warning('Linear 상태 매핑 없음', { description: `"${status}"에 해당하는 상태를 찾을 수 없음` });
            }
          }
        } catch (error) {
          console.error('Failed to sync with Linear:', error);
          toast.error('Linear 동기화 실패', { description: String(error) });
        }
      }
    }
  };

  const handlePriorityChange = async (taskId: string, priority: SprintTask['priority']) => {
    const task = sprintTasks.find(t => t.id === taskId);

    // Optimistic update
    setSprintTasks(sprintTasks.map(t =>
      t.id === taskId ? { ...t, priority } : t
    ));

    // Sync with Linear if task is linked
    if (task?.linearIssueId) {
      const apiKey = localStorage.getItem('linear-api-key');
      if (apiKey) {
        try {
          const linearPriority = convertToLinearPriority(priority);
          const success = await updateLinearIssueExtended(apiKey, task.linearIssueId, {
            priority: linearPriority,
          });
          if (success) {
            toast.success('Linear 동기화 완료', { description: '우선순위 업데이트됨' });
          } else {
            toast.error('Linear 우선순위 변경 실패');
          }
        } catch (error) {
          console.error('Failed to sync with Linear:', error);
          toast.error('Linear 동기화 실패', { description: String(error) });
        }
      }
    }
  };

  const handleTaskClick = (task: SprintTask) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = sprintTasks.find(t => t.id === taskId);

    // Optimistic update
    setSprintTasks(sprintTasks.filter(t => t.id !== taskId));
    toast.success('태스크 삭제됨', { description: task?.name });

    // Sync with Linear if task is linked
    if (task?.linearIssueId) {
      const apiKey = localStorage.getItem('linear-api-key');
      if (apiKey) {
        try {
          const success = await deleteLinearIssue(apiKey, task.linearIssueId);
          if (success) {
            toast.success('Linear 동기화 완료', { description: 'Linear에서 아카이브됨' });
          } else {
            toast.error('Linear 삭제 실패', { description: '로컬에서만 삭제됨' });
          }
        } catch (error) {
          console.error('Failed to delete from Linear:', error);
          toast.error('Linear 연결 오류', { description: '로컬에서만 삭제됨' });
        }
      }
    }
  };

  const handleCreateTask = async (taskData: Omit<SprintTask, 'id'>) => {
    const apiKey = localStorage.getItem('linear-api-key');
    const savedTeamId = localStorage.getItem('linear-selected-team-id');
    const savedCycleId = localStorage.getItem('linear-selected-cycle-id');
    let linearIssueId: string | undefined;
    let linearIdentifier: string | undefined;

    // Try to create in Linear first
    if (apiKey) {
      try {
        let teamId = savedTeamId;

        // Fallback to first team if no saved team
        if (!teamId) {
          const teams = await fetchLinearTeams(apiKey);
          if (teams.length > 0) {
            teamId = teams[0].id;
          }
        }

        if (teamId) {
          const priorityMap: Record<string, number> = {
            urgent: 1,
            high: 2,
            medium: 3,
            low: 4,
            none: 0,
          };

          const extendedData = taskData as any;

          // Get cycle ID from current sprint or saved selection
          let cycleId = savedCycleId || undefined;
          if (currentSprint?.linearCycleId) {
            cycleId = currentSprint.linearCycleId;
          }

          const result = await createLinearIssue(apiKey, teamId, {
            title: taskData.name,
            description: taskData.description,
            priority: priorityMap[taskData.priority] || 0,
            estimate: taskData.storyPoints,
            dueDate: taskData.endDate ? formatDateForLinear(taskData.endDate) : undefined,
            cycleId, // 현재 스프린트에 연결
            assigneeId: extendedData.assigneeId,
            labelIds: extendedData.labelIds,
          });

          if (result.success) {
            linearIssueId = result.issueId;
            linearIdentifier = result.identifier;
            toast.success('Linear 동기화 완료', { description: `이슈 생성됨: ${result.identifier}` });
          } else {
            toast.error('Linear 이슈 생성 실패', { description: '다시 시도해주세요' });
          }
        }
      } catch (error) {
        console.error('Failed to create in Linear:', error);
        toast.error('Linear 연결 오류', { description: String(error) });
      }
    }

    const newTask: SprintTask = {
      ...taskData,
      id: Date.now().toString(),
      linearIssueId,
    };
    setSprintTasks([...sprintTasks, newTask]);
    setIsTaskDialogOpen(false);
    toast.success('태스크 생성됨', { description: newTask.name });
  };

  const handleUpdateTask = async (taskData: Omit<SprintTask, 'id'>) => {
    if (editingTask) {
      const updatedTask: SprintTask = {
        ...taskData,
        id: editingTask.id,
        linearIssueId: editingTask.linearIssueId,
      };

      // Optimistic update
      setSprintTasks(sprintTasks.map(t =>
        t.id === editingTask.id ? updatedTask : t
      ));

      // Sync with Linear if task is linked
      if (editingTask.linearIssueId) {
        const apiKey = localStorage.getItem('linear-api-key');
        if (apiKey) {
          try {
            const { updateLinearIssueExtended } = await import('../services/linear');
            const priorityMap: Record<string, number> = {
              urgent: 1,
              high: 2,
              medium: 3,
              low: 4,
              none: 0,
            };

            const success = await updateLinearIssueExtended(apiKey, editingTask.linearIssueId, {
              title: taskData.name,
              description: taskData.description,
              priority: priorityMap[taskData.priority] || 0,
              estimate: taskData.storyPoints,
              dueDate: taskData.endDate ? formatDateForLinear(taskData.endDate) : null,
            });

            if (success) {
              toast.success('Linear 동기화 완료', { description: 'Linear 이슈 업데이트됨' });
            } else {
              toast.error('Linear 업데이트 실패', { description: '로컬에서만 수정됨' });
            }
          } catch (error) {
            console.error('Failed to update in Linear:', error);
            toast.error('Linear 연결 오류', { description: '로컬에서만 수정됨' });
          }
        }
      }

      setEditingTask(null);
      setIsTaskDialogOpen(false);
      toast.success('태스크 수정됨', { description: taskData.name });
    }
  };

  const openNewTaskDialog = () => {
    setEditingTask(null);
    setIsTaskDialogOpen(true);
  };

  // Linear import handlers
  const handleImportSprint = (sprintData: Omit<Sprint, 'id'>) => {
    // Use linearCycleId as the sprint ID to avoid duplicates
    const sprintId = sprintData.linearCycleId
      ? `linear-cycle-${sprintData.linearCycleId}`
      : Date.now().toString();

    // Check if sprint already exists
    const existingIndex = sprints.findIndex(s =>
      s.linearCycleId && s.linearCycleId === sprintData.linearCycleId
    );

    const newSprint: Sprint = {
      ...sprintData,
      id: sprintId,
    };

    if (existingIndex >= 0) {
      // Update existing sprint
      setSprints(sprints.map((s, i) => i === existingIndex ? newSprint : s));
    } else {
      // Add new sprint
      setSprints([...sprints, newSprint]);
    }
    setCurrentSprintId(sprintId);
  };

  const handleImportTasks = (tasks: Omit<SprintTask, 'id'>[]) => {
    // Use linearIssueId-based ID to avoid duplicates
    const newTasks = tasks.map((t) => ({
      ...t,
      id: t.linearIssueId ? `linear-${t.linearIssueId}` : Date.now().toString(),
      sprintId: currentSprintId || t.sprintId,
    }));

    // Merge with existing tasks, replacing by linearIssueId
    setSprintTasks(prev => {
      const existingLinearIds = new Set(
        newTasks.filter(t => t.linearIssueId).map(t => t.linearIssueId)
      );

      // Keep tasks that don't have matching linearIssueId
      const unchanged = prev.filter(t =>
        !t.linearIssueId || !existingLinearIds.has(t.linearIssueId)
      );

      return [...unchanged, ...newTasks];
    });
  };

  // Assign task to sprint
  const handleTaskAssignToSprint = async (taskId: string, sprintId: string) => {
    const task = sprintTasks.find(t => t.id === taskId);
    if (!task) return;

    // Update local state
    setSprintTasks(sprintTasks.map(t =>
      t.id === taskId ? { ...t, sprintId } : t
    ));

    // Find the sprint's linkedCycleId to update Linear
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint?.linearCycleId && task.linearIssueId) {
      const apiKey = localStorage.getItem('linear-api-key');
      if (apiKey) {
        try {
          const { updateLinearIssueExtended } = await import('../services/linear');
          await updateLinearIssueExtended(apiKey, task.linearIssueId, {
            cycleId: sprint.linearCycleId,
          });
          toast.success('Linear 동기화 완료', { description: '스프린트에 추가됨' });
        } catch (error) {
          console.error('Failed to sync with Linear:', error);
        }
      }
    } else {
      toast.success('스프린트에 추가됨', { description: task.name });
    }
  };

  const handleLinkSprint = (sprintId: string, linearCycleId: string) => {
    setSprints(sprints.map(s =>
      s.id === sprintId ? { ...s, linearCycleId } : s
    ));
  };

  // Linear sync handler - update existing tasks
  const handleUpdateTasks = (updatedTasks: SprintTask[]) => {
    setSprintTasks(prev => {
      const updatedIds = new Set(updatedTasks.map(t => t.id));
      const unchanged = prev.filter(t => !updatedIds.has(t.id));
      return [...unchanged, ...updatedTasks];
    });
    toast.success('태스크 동기화 완료', { description: `${updatedTasks.length}개 태스크 업데이트됨` });
  };

  // Data import handlers
  const handleImportSprintsData = (importedSprints: Sprint[]) => {
    setSprints(importedSprints);
    localStorage.setItem('sprints', JSON.stringify(importedSprints));
    toast.success('스프린트 데이터 가져오기 완료');
  };

  const handleImportSprintTasksData = (importedTasks: SprintTask[]) => {
    setSprintTasks(importedTasks);
    localStorage.setItem('sprint-tasks', JSON.stringify(importedTasks));
    toast.success('태스크 데이터 가져오기 완료');
  };

  const handleImportGanttTasksData = (importedTasks: Task[]) => {
    // Gantt tasks are managed separately in GanttChart component
    // Store in localStorage for GanttChart to pick up
    localStorage.setItem('gantt-tasks', JSON.stringify(importedTasks));
    toast.success('간트 차트 데이터 가져오기 완료');
    // Trigger reload by refreshing
    window.location.reload();
  };

  // Current sprint data
  const currentSprint = sprints.find(s => s.id === currentSprintId);
  const currentSprintTasks = sprintTasks.filter(t => t.sprintId === currentSprintId);

  // Get unique assignees for filter dropdown
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    const tasksToCheck = currentSprint ? currentSprintTasks : sprintTasks;
    tasksToCheck.forEach(t => {
      if (t.assignee) assignees.add(t.assignee);
    });
    return Array.from(assignees).sort();
  }, [currentSprint, currentSprintTasks, sprintTasks]);

  // Apply filters and sorting to tasks
  const filteredTasks = useMemo(() => {
    const tasksToFilter = currentSprint ? currentSprintTasks : sprintTasks;
    return applyTaskFiltersAndSort(tasksToFilter, taskFilters, taskSort);
  }, [currentSprint, currentSprintTasks, sprintTasks, taskFilters, taskSort]);

  // Convert SprintTask to Task for GanttChart
  const ganttTasks: Task[] = useMemo(() => {
    return currentSprintTasks.map(t => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      progress: t.progress,
      color: t.color,
      parentId: t.parentId,
      dependencies: t.dependencies,
      linearProjectId: t.linearProjectId,
      linearIssueId: t.linearIssueId,
      assignee: t.assignee,
    }));
  }, [currentSprintTasks]);

  // Sprint Stats
  const sprintStats = useMemo(() => {
    if (!currentSprint) return null;

    const totalPoints = currentSprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const completedPoints = currentSprintTasks
      .filter(t => t.status === 'done')
      .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

    const statusCounts = {
      backlog: currentSprintTasks.filter(t => t.status === 'backlog').length,
      todo: currentSprintTasks.filter(t => t.status === 'todo').length,
      in_progress: currentSprintTasks.filter(t => t.status === 'in_progress').length,
      in_review: currentSprintTasks.filter(t => t.status === 'in_review').length,
      done: currentSprintTasks.filter(t => t.status === 'done').length,
    };

    return {
      totalTasks: currentSprintTasks.length,
      totalPoints,
      completedPoints,
      completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      statusCounts,
    };
  }, [currentSprint, currentSprintTasks]);

  return (
    <div className="space-y-6">
      {/* Sprint Manager */}
      <SprintManager
        sprints={sprints}
        currentSprintId={currentSprintId}
        onCreateSprint={handleCreateSprint}
        onUpdateSprint={handleUpdateSprint}
        onSelectSprint={setCurrentSprintId}
        onStartSprint={handleStartSprint}
        onCompleteSprint={handleCompleteSprint}
      />

      {/* View Mode Tabs - Always show */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="board" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Board
              {(currentSprint ? currentSprintTasks.length : sprintTasks.length) > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-medium rounded-full ml-1">
                  {currentSprint ? currentSprintTasks.length : sprintTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <GanttChartSquare className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            {currentSprint && (
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
                {sprintStats && sprintStats.completionRate >= 100 && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-1" />
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
            <div className="hidden md:flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {currentSprint ? currentSprintTasks.length : sprintTasks.length} tasks
              </span>
              {sprintStats && (
                <>
                  <span className="text-muted-foreground">
                    {sprintStats.totalPoints} points
                  </span>
                  <span className="font-medium text-green-600">
                    {sprintStats.completionRate}% complete
                  </span>
                </>
              )}
            </div>
            <DeadlineAlerts
              tasks={sprintTasks}
              sprints={sprints}
            />
            <TeamManager
              members={teamMembers}
              onMembersChange={setTeamMembers}
            />
            <DataImport
              onImportSprints={handleImportSprintsData}
              onImportSprintTasks={handleImportSprintTasksData}
              onImportGanttTasks={handleImportGanttTasksData}
              existingSprints={sprints}
              existingSprintTasks={sprintTasks}
              existingGanttTasks={ganttTasks}
            />
            <DataExport
              sprints={sprints}
              sprintTasks={sprintTasks}
              ganttTasks={ganttTasks}
            />
            <LinearSprintSync
              sprints={sprints}
              sprintTasks={sprintTasks}
              onImportSprint={handleImportSprint}
              onImportTasks={handleImportTasks}
              onLinkSprint={handleLinkSprint}
              onUpdateTasks={handleUpdateTasks}
              onUpdateSprints={setSprints}
            />
            <LinearCycleManager
              selectedCycleId={currentSprint?.linearCycleId}
              onCycleSelect={(cycleId) => {
                const sprint = sprints.find(s => s.linearCycleId === cycleId);
                if (sprint) {
                  setCurrentSprintId(sprint.id);
                }
              }}
            />
            <Button onClick={openNewTaskDialog} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">태스크 추가</span>
              <span className="sm:hidden">추가</span>
            </Button>
          </div>
        </div>

        <TabsContent value="board" className="mt-4 space-y-6">
          {/* Task Filters */}
          <TaskFilters
            filters={taskFilters}
            sort={taskSort}
            onFiltersChange={setTaskFilters}
            onSortChange={setTaskSort}
            assignees={uniqueAssignees}
          />

          {/* Sprint Board - Show first for better visibility */}
          <SprintBoard
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            onDeleteTask={handleDeleteTask}
            onTaskDropFromBacklog={currentSprintId ? (taskId) => handleTaskAssignToSprint(taskId, currentSprintId) : undefined}
            onMoveToBacklog={(taskId) => {
              setSprintTasks(sprintTasks.map(t =>
                t.id === taskId ? { ...t, sprintId: undefined } : t
              ));
            }}
          />

          {/* Backlog Panel - Show unassigned tasks */}
          {currentSprintId && (
            <BacklogPanel
              tasks={sprintTasks}
              onTaskClick={handleTaskClick}
              onTaskAssignToSprint={handleTaskAssignToSprint}
              onTaskDropFromSprint={(taskId) => {
                setSprintTasks(sprintTasks.map(t =>
                  t.id === taskId ? { ...t, sprintId: undefined } : t
                ));
              }}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              currentSprintId={currentSprintId}
            />
          )}
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <GanttChart />
        </TabsContent>

        {currentSprint && (
          <TabsContent value="analytics" className="mt-4 space-y-6">
              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{sprintStats?.totalTasks || 0}</div>
                      <div className="text-xs text-muted-foreground">전체 태스크</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{sprintStats?.completedPoints || 0}</div>
                      <div className="text-xs text-muted-foreground">완료 포인트</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{sprintStats?.totalPoints || 0}</div>
                      <div className="text-xs text-muted-foreground">전체 포인트</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{sprintStats?.completionRate || 0}%</div>
                      <div className="text-xs text-muted-foreground">완료율</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Burndown Chart */}
                <BurndownChart sprint={currentSprint} tasks={sprintTasks} />

                {/* Velocity Chart */}
                <VelocityChart sprints={sprints} tasks={sprintTasks} />
              </div>

              {/* Bottom Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sprint Progress */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">스프린트 진행 현황</h3>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">완료율</span>
                      <span className="font-medium">{sprintStats?.completionRate}%</span>
                    </div>
                    <Progress
                      value={sprintStats?.completionRate || 0}
                      className="h-3"
                      variant={(sprintStats?.completionRate || 0) >= 80 ? 'success' : (sprintStats?.completionRate || 0) >= 50 ? 'default' : 'warning'}
                      showGlow={(sprintStats?.completionRate || 0) > 0 && (sprintStats?.completionRate || 0) < 100}
                    />
                  </div>

                  {/* Status Breakdown */}
                  <div className="space-y-2">
                    {sprintStats && Object.entries(sprintStats.statusCounts).map(([status, count]) => {
                      const statusLabels: Record<string, string> = {
                        backlog: '백로그',
                        todo: '할 일',
                        in_progress: '진행 중',
                        in_review: '리뷰 중',
                        done: '완료',
                      };
                      return (
                        <div key={status} className="flex items-center justify-between text-sm">
                          <span>{statusLabels[status] || status}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Sprint Capacity */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">스프린트 용량</h3>
                  <div className="text-center py-2">
                    <div className="text-4xl font-bold text-primary">
                      {sprintStats?.completedPoints || 0}
                      <span className="text-lg text-muted-foreground">
                        /{currentSprint.capacity || sprintStats?.totalPoints || 0}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      포인트 완료
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress
                      value={currentSprint.capacity
                        ? Math.min(100, Math.round(((sprintStats?.completedPoints || 0) / currentSprint.capacity) * 100))
                        : sprintStats?.completionRate || 0}
                      variant={(sprintStats?.completedPoints || 0) >= (currentSprint.capacity || 0) ? 'success' : 'default'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">{currentSprint.capacity || '-'}</div>
                      <div className="text-xs text-muted-foreground">계획 용량</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {currentSprint.capacity
                          ? Math.round(((sprintStats?.completedPoints || 0) / currentSprint.capacity) * 100)
                          : '-'}%
                      </div>
                      <div className="text-xs text-muted-foreground">사용률</div>
                    </div>
                  </div>
                </Card>

                {/* Priority Distribution */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">우선순위 분포</h3>
                  <div className="space-y-3">
                    {(['urgent', 'high', 'medium', 'low'] as const).map(priority => {
                      const priorityLabels: Record<string, string> = {
                        urgent: '긴급',
                        high: '높음',
                        medium: '보통',
                        low: '낮음',
                      };
                      const count = currentSprintTasks.filter(t => t.priority === priority).length;
                      const percentage = currentSprintTasks.length > 0
                        ? Math.round((count / currentSprintTasks.length) * 100)
                        : 0;

                      const priorityVariant = priority === 'urgent' ? 'danger'
                        : priority === 'high' ? 'warning'
                        : priority === 'medium' ? 'default'
                        : 'success';

                      return (
                        <div key={priority}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{priorityLabels[priority]}</span>
                            <span>{count}개 ({percentage}%)</span>
                          </div>
                          <Progress
                            value={percentage}
                            variant={priorityVariant}
                            animated={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Assignee Stats */}
              {(() => {
                const assigneeStats = currentSprintTasks.reduce((acc, task) => {
                  const assignee = task.assignee || '미할당';
                  if (!acc[assignee]) {
                    acc[assignee] = { total: 0, completed: 0, points: 0, completedPoints: 0 };
                  }
                  acc[assignee].total += 1;
                  acc[assignee].points += task.storyPoints || 0;
                  if (task.status === 'done') {
                    acc[assignee].completed += 1;
                    acc[assignee].completedPoints += task.storyPoints || 0;
                  }
                  return acc;
                }, {} as Record<string, { total: number; completed: number; points: number; completedPoints: number }>);

                const assigneeList = Object.entries(assigneeStats).sort((a, b) => b[1].completedPoints - a[1].completedPoints);

                if (assigneeList.length === 0) return null;

                return (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">담당자별 현황</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">담당자</th>
                            <th className="text-center py-2 font-medium">태스크</th>
                            <th className="text-center py-2 font-medium">완료</th>
                            <th className="text-center py-2 font-medium">포인트</th>
                            <th className="text-center py-2 font-medium">완료율</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assigneeList.map(([assignee, stats]) => (
                            <tr key={assignee} className="border-b last:border-0">
                              <td className="py-2 font-medium">{assignee}</td>
                              <td className="text-center py-2">{stats.total}</td>
                              <td className="text-center py-2 text-green-600">{stats.completed}</td>
                              <td className="text-center py-2">
                                <span className="text-green-600">{stats.completedPoints}</span>
                                <span className="text-muted-foreground">/{stats.points}</span>
                              </td>
                              <td className="text-center py-2">
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
                                    className="flex-1"
                                    variant={
                                      stats.total > 0 && stats.completed === stats.total
                                        ? 'success'
                                        : stats.completed / stats.total >= 0.5
                                        ? 'default'
                                        : 'warning'
                                    }
                                  />
                                  <span className="text-xs w-8">
                                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })()}
            </TabsContent>
        )}
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>
          <SprintTaskForm
            task={editingTask}
            sprints={sprints}
            currentSprintId={currentSprintId}
            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
            onDelete={editingTask ? () => {
              handleDeleteTask(editingTask.id);
              setIsTaskDialogOpen(false);
            } : undefined}
            onCancel={() => {
              setEditingTask(null);
              setIsTaskDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
