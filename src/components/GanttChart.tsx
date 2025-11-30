import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, MoreHorizontal, ChevronDown, ChevronRight, Edit3, Check, X, Loader2, ZoomIn, ZoomOut, Home, Search, Filter, BarChart3, Undo2, Redo2, Plus, Copy, Layers, GripVertical, Users } from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { TaskBar } from './TaskBar';
import { TaskForm } from './TaskForm';
import { GanttSettings, GanttSettingsData, defaultSettings } from './GanttSettings';
import { DependencyLines } from './DependencyLines';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { updateLinearProject, updateLinearIssue, updateLinearIssueExtended, formatDateForLinear, createLinearIssue, createLinearProject, fetchLinearTeams, fetchLinearTeamMembers, fetchLinearLabels, deleteLinearProject, deleteLinearIssue, fetchLinearCycles, addIssueToCycle, removeIssueFromCycle, fetchLinearIssues, fetchLinearOrganizationUsers } from '../services/linear';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { GanttSkeleton } from './GanttSkeleton';
import { ConfirmDialog } from './ConfirmDialog';
import { ExportMenu } from './ExportMenu';
import { GanttFilters, GanttStatusFilter, GanttGroupBy } from './GanttFilters';
import { LinearSync } from './LinearSync';

// Simple Task Form Component
interface SimpleTaskFormProps {
  task?: Task | null;
  parentTask?: Task | null;
  allTasks: Task[];
  onSubmit: (taskData: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Team colors for generating unique team badges based on teamId
const TEAM_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
];

// Get consistent team color based on teamId hash
function getTeamColor(teamId: string) {
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = ((hash << 5) - hash) + teamId.charCodeAt(i);
    hash = hash & hash;
  }
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

// Get team initial from team name
function getTeamInitial(teamName: string): string {
  if (!teamName) return '?';
  // Get first letter of first word (uppercase)
  return teamName.charAt(0).toUpperCase();
}

// Check if string is a valid emoji (not just \p{Emoji} which includes digits)
function isValidEmoji(str: string): boolean {
  if (!str) return false;
  // Check for actual emoji characters (excluding digits and basic ASCII)
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
  return emojiRegex.test(str);
}

const PRIORITY_OPTIONS = [
  { value: 'none', label: '없음', color: 'bg-gray-100 text-gray-600' },
  { value: 'low', label: '낮음', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: '높음', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: '긴급', color: 'bg-red-100 text-red-700' },
];

// Convert priority to Linear priority number (0=none, 1=urgent, 2=high, 3=medium, 4=low)
const priorityToLinear = (priority: string): number => {
  switch (priority) {
    case 'urgent': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 4;
    default: return 0;
  }
};

interface TeamMember {
  id: string;
  name: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

interface LinearCycle {
  id: string;
  name: string;
  number: number;
  startsAt: string;
  endsAt: string;
}

function SimpleTaskForm({ task, parentTask, allTasks, onSubmit, onCancel }: SimpleTaskFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [startDate, setStartDate] = useState(task?.startDate?.toISOString().split('T')[0] || today);
  const [endDate, setEndDate] = useState(task?.endDate?.toISOString().split('T')[0] || nextWeek);
  const [color, setColor] = useState(task?.color || COLORS[0]);
  const [selectedParentId, setSelectedParentId] = useState(task?.parentId || parentTask?.id || '__none__');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New fields
  const [priority, setPriority] = useState<string>(task?.priority || 'none');
  const [estimate, setEstimate] = useState<string>(task?.estimate?.toString() || '');
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId || '');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    task?.labels?.filter(l => l.id).map(l => l.id!) || []
  );

  // Linear data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [labels, setLabels] = useState<LinearLabel[]>([]);
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(task?.cycleId || '');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Get top-level tasks (potential parents = projects)
  const topLevelTasks = allTasks.filter(t => !t.parentId && t.id !== task?.id);

  // Fetch team members and labels on mount
  useEffect(() => {
    const fetchData = async () => {
      const apiKey = localStorage.getItem('linear-api-key');
      let teamId = localStorage.getItem('linear-selected-team-id');

      if (!apiKey) return;

      setIsLoadingData(true);
      try {
        // If no team selected, fetch first team
        if (!teamId) {
          const teams = await fetchLinearTeams(apiKey);
          if (teams.length > 0) {
            teamId = teams[0].id;
            localStorage.setItem('linear-selected-team-id', teamId);
          }
        }

        if (teamId) {
          const [members, labelList, cycleList] = await Promise.all([
            fetchLinearTeamMembers(apiKey, teamId),
            fetchLinearLabels(apiKey, teamId),
            fetchLinearCycles(apiKey, teamId),
          ]);
          setTeamMembers(members);
          setLabels(labelList);
          setCycles(cycleList);
        }
      } catch (error) {
        console.error('Failed to fetch Linear data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('이름을 입력하세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiKey = localStorage.getItem('linear-api-key');
      let teamId = localStorage.getItem('linear-selected-team-id');
      let linearProjectId: string | undefined;
      let linearIssueId: string | undefined;

      // If no team selected, fetch first team
      if (apiKey && !teamId) {
        const teams = await fetchLinearTeams(apiKey);
        if (teams.length > 0) {
          teamId = teams[0].id;
          localStorage.setItem('linear-selected-team-id', teamId);
        }
      }

      if (apiKey && teamId) {
        if (task) {
          // EDIT MODE - Update existing Linear Project or Issue
          if (task.linearProjectId) {
            // Update Linear Project
            const success = await updateLinearProject(apiKey, task.linearProjectId, {
              name: name,
              startDate: startDate,
              targetDate: endDate,
            });

            if (success) {
              toast.success('Linear 프로젝트 수정됨', { description: name });
            } else {
              toast.error('Linear 프로젝트 수정 실패');
            }
          } else if (task.linearIssueId) {
            // Update Linear Issue with extended fields including labels
            const success = await updateLinearIssueExtended(apiKey, task.linearIssueId, {
              title: name,
              description: description || undefined,
              dueDate: endDate,
              priority: priorityToLinear(priority),
              estimate: estimate ? parseInt(estimate, 10) : null,
              assigneeId: assigneeId || null,
              labelIds: selectedLabelIds,
            });

            // Handle cycle assignment separately
            if (selectedCycleId && selectedCycleId !== '__none__' && selectedCycleId !== task.cycleId) {
              await addIssueToCycle(apiKey, task.linearIssueId, selectedCycleId);
            } else if ((!selectedCycleId || selectedCycleId === '__none__') && task.cycleId) {
              await removeIssueFromCycle(apiKey, task.linearIssueId);
            }

            if (success) {
              toast.success('Linear 이슈 수정됨', { description: name });
            } else {
              toast.error('Linear 이슈 수정 실패');
            }
          }
        } else {
          // CREATE MODE - Create new Linear Project or Issue
          const hasParent = selectedParentId && selectedParentId !== '__none__';
          if (!hasParent) {
            // Create as Linear Project
            const result = await createLinearProject(apiKey, [teamId], {
              name: name,
              description: description || undefined,
              startDate: startDate,
              targetDate: endDate,
            });

            if (result.success && result.projectId) {
              linearProjectId = result.projectId;
              toast.success('Linear 프로젝트 생성됨', { description: name });
            } else {
              toast.error('Linear 프로젝트 생성 실패');
            }
          } else {
            // Create as Linear Issue (linked to parent's project)
            const parentTaskData = allTasks.find(t => t.id === selectedParentId);
            const projectId = parentTaskData?.linearProjectId;

            const result = await createLinearIssue(apiKey, teamId, {
              title: name,
              description: description || undefined,
              dueDate: endDate,
              projectId: projectId,
              priority: priorityToLinear(priority),
              estimate: estimate ? parseInt(estimate, 10) : undefined,
              assigneeId: assigneeId || undefined,
              labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
              cycleId: selectedCycleId && selectedCycleId !== '__none__' ? selectedCycleId : undefined,
            });

            if (result.success && result.issueId) {
              linearIssueId = result.issueId;
              toast.success('Linear 이슈 생성됨', { description: result.identifier });
            } else {
              toast.error('Linear 이슈 생성 실패');
            }
          }
        }
      }

      // Get assignee info for local display
      const assigneeMember = teamMembers.find(m => m.id === assigneeId);
      const assigneeName = assigneeMember?.displayName || assigneeMember?.name;
      const assigneeAvatarUrl = assigneeMember?.avatarUrl;

      // Get selected labels for local display
      const selectedLabels = labels
        .filter(l => selectedLabelIds.includes(l.id))
        .map(l => ({ id: l.id, name: l.name, color: l.color }));

      // Get cycle name for local display
      const selectedCycle = cycles.find(c => c.id === selectedCycleId);
      const cycleName = selectedCycle?.name || `Cycle ${selectedCycle?.number}`;

      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        progress: task?.progress || 0,
        color,
        linearIssueId: task?.linearIssueId || linearIssueId,
        linearProjectId: task?.linearProjectId || linearProjectId,
        assignee: assigneeName || task?.assignee,
        assigneeId: assigneeId || task?.assigneeId,
        assigneeAvatarUrl: assigneeAvatarUrl || task?.assigneeAvatarUrl,
        labels: selectedLabels.length > 0 ? selectedLabels : task?.labels,
        isMilestone: task?.isMilestone,
        parentId: (selectedParentId && selectedParentId !== '__none__') ? selectedParentId : undefined,
        dependencies: task?.dependencies,
        priority: priority as Task['priority'],
        estimate: estimate ? parseInt(estimate, 10) : task?.estimate,
        cycleId: selectedCycleId && selectedCycleId !== '__none__' ? selectedCycleId : undefined,
        cycleName: selectedCycleId && selectedCycleId !== '__none__' ? cycleName : undefined,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds(prev =>
      prev.includes(labelId)
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  const isIssue = selectedParentId && selectedParentId !== '__none__';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Type indicator */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center justify-between">
        {isIssue ? (
          <span className="text-blue-600 font-medium">이슈 (Linear Issue)</span>
        ) : (
          <span className="text-green-600 font-medium">프로젝트 (Linear Project)</span>
        )}
        {isLoadingData && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">이름 *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isIssue ? "이슈 이름" : "프로젝트 이름"}
          autoFocus
        />
      </div>

      {/* Parent (Project) Selection */}
      {topLevelTasks.length > 0 && (
        <div className="space-y-2">
          <Label>상위 프로젝트</Label>
          <Select value={selectedParentId} onValueChange={setSelectedParentId}>
            <SelectTrigger>
              <SelectValue placeholder="없음 (프로젝트로 생성)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">없음 (프로젝트로 생성)</SelectItem>
              {topLevelTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 (선택)"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">시작일</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{isIssue ? '마감일' : '목표일'}</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Issue-specific fields */}
      {isIssue && (
        <>
          {/* Priority & Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>우선순위</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimate">스토리 포인트</Label>
              <Input
                id="estimate"
                type="number"
                min="0"
                max="21"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="예: 1, 2, 3, 5, 8"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>담당자</Label>
            <Select value={assigneeId || '__unassigned__'} onValueChange={(v) => setAssigneeId(v === '__unassigned__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">미지정</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.displayName || member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-2">
              <Label>라벨</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedLabelIds.includes(label.id)
                        ? 'ring-2 ring-offset-1 ring-primary'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                      borderColor: label.color,
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sprint/Cycle Selection */}
          {cycles.length > 0 && (
            <div className="space-y-2">
              <Label>스프린트</Label>
              <Select value={selectedCycleId || '__none__'} onValueChange={(v) => setSelectedCycleId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-violet-200 dark:border-violet-800">
                  <SelectValue placeholder="스프린트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">
                    스프린트 없음
                  </SelectItem>
                  {cycles.map((cycle) => {
                    const startDate = new Date(cycle.startsAt);
                    const endDate = new Date(cycle.endsAt);
                    const now = new Date();
                    const isActive = now >= startDate && now <= endDate;
                    const isPast = now > endDate;

                    return (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : isPast ? 'bg-gray-400' : 'bg-blue-500'}`} />
                          <span className="font-medium">{cycle.name || `Cycle ${cycle.number}`}</span>
                          <span className="text-xs text-muted-foreground">
                            ({startDate.toLocaleDateString('ko', { month: 'short', day: 'numeric' })} ~ {endDate.toLocaleDateString('ko', { month: 'short', day: 'numeric' })})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label>색상</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {task ? '수정' : isIssue ? '이슈 추가' : '프로젝트 추가'}
        </Button>
      </div>
    </form>
  );
}

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;
  dependencies?: string[];
  parentId?: string;
  linearProjectId?: string;
  linearIssueId?: string;
  linearParentIssueId?: string;
  assignee?: string;
  assigneeId?: string;
  assigneeAvatarUrl?: string;
  labels?: { id?: string; name: string; color: string }[];
  isMilestone?: boolean;
  description?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  estimate?: number;
  cycleId?: string;
  cycleName?: string;
  teamId?: string;
  teamName?: string;
  teamIcon?: string;
  // State (workflow status)
  stateId?: string;
  stateName?: string;
  stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  // Linear relations (dependencies)
  linearBlocks?: string[]; // IDs of issues this task blocks
  linearBlockedBy?: string[]; // IDs of issues blocking this task
}

export interface LinearCycleInfo {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
}

export interface GanttChartProps {
  className?: string;
}

type ViewMode = 'day' | 'week' | 'sprint' | 'month' | 'quarter' | 'year';

const viewModeLabels: Record<ViewMode, string> = {
  day: '1 Day',
  week: '1 Week',
  sprint: '2 Weeks (Sprint)',
  month: '1 Month',
  quarter: '3 Months',
  year: '1 Year',
};

// Range in days for each view mode
const viewModeRangeDays: Record<ViewMode, number> = {
  day: 7,         // 1 week view
  week: 14,       // 2 weeks view
  sprint: 28,     // 4 weeks view
  month: 60,      // 2 months view
  quarter: 120,   // 4 months view
  year: 365,      // 1 year view
};

export function GanttChart({ className }: GanttChartProps) {
  const [projectName, setProjectName] = useState('My Project Timeline');
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const {
    state: tasks,
    setState: setTasks,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<Task[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [linearApiKey, setLinearApiKey] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [importedProjectIds, setImportedProjectIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<GanttStatusFilter>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GanttGroupBy>('none');
  const [showStats, setShowStats] = useState(false);
  const [ganttSettings, setGanttSettings] = useState<GanttSettingsData>(defaultSettings);
  const [taskColumnWidth, setTaskColumnWidth] = useState(360);
  const [isResizingColumn, setIsResizingColumn] = useState(false);
  const [linearCycles, setLinearCycles] = useState<LinearCycleInfo[]>([]);
  const [linearTeamMembers, setLinearTeamMembers] = useState<Map<string, string>>(new Map()); // name -> avatarUrl
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('linear-api-key');
    if (savedKey) {
      setLinearApiKey(savedKey);
    }

    const savedTasks = localStorage.getItem('gantt-tasks');
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        const tasksWithDates = parsed.map((task: any) => ({
          ...task,
          startDate: new Date(task.startDate),
          endDate: new Date(task.endDate),
        }));
        setTasks(tasksWithDates);
      } catch (e) {
        console.error('Failed to load saved tasks:', e);
      }
    }

    const savedProjectName = localStorage.getItem('gantt-project-name');
    if (savedProjectName) {
      setProjectName(savedProjectName);
    }

    const savedProjectIds = localStorage.getItem('linear-imported-project-ids');
    if (savedProjectIds) {
      try {
        setImportedProjectIds(JSON.parse(savedProjectIds));
      } catch (e) {
        console.error('Failed to load imported project IDs:', e);
      }
    }

    const savedViewMode = localStorage.getItem('gantt-view-mode');
    if (savedViewMode) {
      setViewMode(savedViewMode as ViewMode);
    }

    const savedSettings = localStorage.getItem('gantt-settings');
    if (savedSettings) {
      try {
        setGanttSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load gantt settings:', e);
      }
    }

    // Fetch cycles and team members if API key exists
    const loadLinearData = async () => {
      const apiKey = localStorage.getItem('linear-api-key');
      const teamId = localStorage.getItem('linear-selected-team-id');
      if (apiKey && teamId) {
        try {
          const [cycles, orgUsers] = await Promise.all([
            fetchLinearCycles(apiKey, teamId),
            fetchLinearOrganizationUsers(apiKey),
          ]);
          setLinearCycles(cycles.map(c => ({
            id: c.id,
            name: c.name || `Cycle ${c.number}`,
            startsAt: new Date(c.startsAt),
            endsAt: new Date(c.endsAt),
          })));

          // Create name -> avatarUrl map from all organization users
          const memberMap = new Map<string, string>();
          orgUsers.forEach(u => {
            if (u.avatarUrl) {
              memberMap.set(u.name, u.avatarUrl);
              if (u.displayName) memberMap.set(u.displayName, u.avatarUrl);
            }
          });
          setLinearTeamMembers(memberMap);
        } catch (e) {
          console.error('Failed to load Linear data:', e);
        }
      }
    };
    loadLinearData();


    // Simulate loading delay for smoother UX
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('gantt-tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  // Save project name to localStorage
  useEffect(() => {
    localStorage.setItem('gantt-project-name', projectName);
  }, [projectName]);

  // Save imported project IDs to localStorage
  useEffect(() => {
    if (importedProjectIds.length > 0) {
      localStorage.setItem('linear-imported-project-ids', JSON.stringify(importedProjectIds));
    }
  }, [importedProjectIds]);

  // Save view mode
  useEffect(() => {
    localStorage.setItem('gantt-view-mode', viewMode);
  }, [viewMode]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('gantt-settings', JSON.stringify(ganttSettings));
  }, [ganttSettings]);

  // Project name editing functions
  const handleStartEditingProjectName = () => {
    setTempProjectName(projectName);
    setIsEditingProjectName(true);
  };

  const handleSaveProjectName = () => {
    if (tempProjectName.trim()) {
      setProjectName(tempProjectName.trim());
    }
    setIsEditingProjectName(false);
  };

  const handleCancelEditingProjectName = () => {
    setTempProjectName(projectName);
    setIsEditingProjectName(false);
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveProjectName();
    } else if (e.key === 'Escape') {
      handleCancelEditingProjectName();
    }
  };

  // Column resize handlers
  const handleColumnResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingColumn(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = taskColumnWidth;

    // 드래그 중 텍스트 선택 방지
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - resizeStartX.current;
      const newWidth = Math.max(200, Math.min(600, resizeStartWidth.current + deltaX));
      setTaskColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingColumn(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Helper functions for task hierarchy
  const getChildTasks = (parentId: string): Task[] => {
    return tasks.filter(task => task.parentId === parentId);
  };

  const getRootTasks = (): Task[] => {
    return tasks.filter(task => !task.parentId);
  };

  const hasChildren = (taskId: string): boolean => {
    return tasks.some(task => task.parentId === taskId);
  };

  const isTaskCollapsed = (taskId: string): boolean => {
    return collapsedTasks.has(taskId);
  };

  const toggleTaskCollapse = (taskId: string): void => {
    const newCollapsed = new Set(collapsedTasks);
    if (newCollapsed.has(taskId)) {
      newCollapsed.delete(taskId);
    } else {
      newCollapsed.add(taskId);
    }
    setCollapsedTasks(newCollapsed);
  };

  // Get unique assignees from tasks
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee) assignees.add(task.assignee);
    });
    return Array.from(assignees).sort();
  }, [tasks]);

  // Get unique teams from tasks
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    tasks.forEach(task => {
      if (task.teamName) teams.add(task.teamName);
    });
    return Array.from(teams).sort();
  }, [tasks]);

  // Helper: Check if task matches filters (excluding parent consideration)
  const taskMatchesFilters = useCallback((task: Task): boolean => {
    // Search filter
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status filter
    if (filterStatus === 'completed' && task.progress !== 100) return false;
    if (filterStatus === 'in-progress' && (task.progress === 0 || task.progress === 100)) return false;
    if (filterStatus === 'not-started' && task.progress !== 0) return false;
    // Assignee filter - only apply to tasks with parentId (issues), not projects
    if (filterAssignee !== 'all' && task.parentId) {
      if (filterAssignee === 'unassigned') {
        if (task.assignee) return false;
      } else if (task.assignee !== filterAssignee) {
        return false;
      }
    }
    // Priority filter - only apply to tasks with parentId (issues)
    if (filterPriority !== 'all' && task.parentId && task.priority !== filterPriority) return false;
    // Team filter - only apply to tasks with parentId (issues)
    if (filterTeam !== 'all' && task.parentId && task.teamName !== filterTeam) return false;
    return true;
  }, [searchQuery, filterStatus, filterAssignee, filterPriority, filterTeam]);

  // Filter tasks based on search and filters
  // Include parent tasks if any of their children match
  const filteredTasks = useMemo(() => {
    // First pass: find all directly matching tasks
    const directMatches = new Set<string>();
    tasks.forEach(task => {
      if (taskMatchesFilters(task)) {
        directMatches.add(task.id);
      }
    });

    // Second pass: include parent tasks if they have matching children
    const result = new Set<string>(directMatches);

    // For assignee/priority/team filters, include projects that have matching children
    if (filterAssignee !== 'all' || filterPriority !== 'all' || filterTeam !== 'all') {
      tasks.forEach(task => {
        if (!task.parentId) {
          // This is a project - check if any children match
          const hasMatchingChild = tasks.some(child =>
            child.parentId === task.id && directMatches.has(child.id)
          );
          if (hasMatchingChild) {
            result.add(task.id);
          } else if (filterAssignee === 'all' && filterPriority === 'all' && filterTeam === 'all') {
            // No assignee/priority/team filter, check other filters
            if (taskMatchesFilters(task)) {
              result.add(task.id);
            }
          }
        }
      });
    }

    return tasks.filter(task => result.has(task.id));
  }, [tasks, taskMatchesFilters, filterAssignee, filterPriority, filterTeam]);

  // Statistics
  const stats = useMemo(() => {
    const rootTasks = tasks.filter(t => !t.parentId);
    const completed = rootTasks.filter(t => t.progress === 100).length;
    const inProgress = rootTasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const notStarted = rootTasks.filter(t => t.progress === 0).length;
    const avgProgress = rootTasks.length > 0
      ? Math.round(rootTasks.reduce((acc, t) => acc + t.progress, 0) / rootTasks.length)
      : 0;
    return { total: rootTasks.length, completed, inProgress, notStarted, avgProgress };
  }, [tasks]);

  // Organize tasks hierarchically for display
  const organizeTasksHierarchically = (): (Task & { level: number; isGroupHeader?: boolean; groupName?: string; groupCount?: number })[] => {
    const organized: (Task & { level: number; isGroupHeader?: boolean; groupName?: string; groupCount?: number })[] = [];
    const filteredIds = new Set(filteredTasks.map(t => t.id));

    const addTaskAndChildren = (task: Task, level: number = 0) => {
      if (!filteredIds.has(task.id)) return;
      organized.push({ ...task, level });

      if (!isTaskCollapsed(task.id)) {
        const children = getChildTasks(task.id).filter(c => filteredIds.has(c.id));
        children.forEach(child => addTaskAndChildren(child, level + 1));
      }
    };

    // If groupBy is 'none', use default hierarchical organization
    if (groupBy === 'none') {
      getRootTasks().filter(t => filteredIds.has(t.id)).forEach(task => addTaskAndChildren(task));
      return organized;
    }

    // Group tasks by the selected attribute
    const groups = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      let groupKey: string;
      switch (groupBy) {
        case 'assignee':
          groupKey = task.assignee || '미지정';
          break;
        case 'priority':
          groupKey = task.priority || 'none';
          break;
        case 'team':
          groupKey = task.teamName || '팀 미지정';
          break;
        case 'status':
          groupKey = task.progress === 100 ? '완료' : task.progress > 0 ? '진행중' : '시작전';
          break;
        default:
          groupKey = '기타';
      }
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(task);
    });

    // Sort groups by priority if grouping by priority
    const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
      if (groupBy === 'priority') {
        const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
        return (priorityOrder[a as keyof typeof priorityOrder] ?? 5) - (priorityOrder[b as keyof typeof priorityOrder] ?? 5);
      }
      if (groupBy === 'status') {
        const statusOrder = { '완료': 2, '진행중': 1, '시작전': 0 };
        return (statusOrder[a as keyof typeof statusOrder] ?? 3) - (statusOrder[b as keyof typeof statusOrder] ?? 3);
      }
      return a.localeCompare(b);
    });

    // Priority labels
    const priorityLabels: Record<string, string> = {
      urgent: '긴급',
      high: '높음',
      medium: '보통',
      low: '낮음',
      none: '없음',
    };

    // Add group headers and tasks
    sortedGroupKeys.forEach(groupKey => {
      const groupTasks = groups.get(groupKey)!;
      const displayName = groupBy === 'priority' ? priorityLabels[groupKey] || groupKey : groupKey;

      // Add group header as a pseudo-task
      organized.push({
        id: `group-${groupKey}`,
        name: displayName,
        startDate: new Date(),
        endDate: new Date(),
        progress: 0,
        color: '#6b7280',
        level: 0,
        isGroupHeader: true,
        groupName: displayName,
        groupCount: groupTasks.length,
      });

      // Add tasks in this group
      groupTasks.forEach(task => {
        organized.push({ ...task, level: 1 });
      });
    });

    return organized;
  };

  // Calculate timeline bounds based on view mode
  const { timelineStart, timelineEnd, totalDays, monthHeaders, dayMarkers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get range in days from viewModeRangeDays
    const rangeDays = viewModeRangeDays[viewMode];
    const halfRange = Math.floor(rangeDays / 2);

    // Calculate start and end based on view mode (centered on today)
    const start = new Date(today);
    start.setDate(start.getDate() - halfRange);

    const end = new Date(today);
    end.setDate(end.getDate() + halfRange);

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate month/week headers based on view mode
    const headers: { date: Date; width: number; label: string }[] = [];

    if (viewMode === 'day' || viewMode === 'week') {
      // Show day headers for day/week view
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayWidth = (1 / days) * 100;
        headers.push({
          date: new Date(currentDate),
          width: dayWidth,
          label: currentDate.toLocaleDateString('ko', { month: 'short', day: 'numeric' })
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (viewMode === 'sprint') {
      // Show week headers for sprint view
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week
      while (currentDate <= end) {
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const effectiveStart = currentDate < start ? start : currentDate;
        const effectiveEnd = weekEnd > end ? end : weekEnd;
        const daysInView = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        headers.push({
          date: new Date(currentDate),
          width: (daysInView / days) * 100,
          label: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
        });
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } else {
      // Show month headers for month/quarter/year view
      const currentDate = new Date(start);
      currentDate.setDate(1);
      while (currentDate <= end) {
        const monthStart = new Date(currentDate);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const effectiveStart = monthStart < start ? start : monthStart;
        const effectiveEnd = monthEnd > end ? end : monthEnd;
        const daysInView = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        headers.push({
          date: new Date(currentDate),
          width: (daysInView / days) * 100,
          label: currentDate.toLocaleDateString('ko', { month: 'short', year: viewMode === 'year' ? 'numeric' : undefined })
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Generate day markers for grid and weekend highlighting
    const dayMarkers: { date: Date; position: number; isWeekend: boolean }[] = [];
    const currentDay = new Date(start);
    while (currentDay <= end) {
      const dayOfWeek = currentDay.getDay();
      const position = ((currentDay.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / days) * 100;
      dayMarkers.push({
        date: new Date(currentDay),
        position,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return { timelineStart: start, timelineEnd: end, totalDays: days, monthHeaders: headers, dayMarkers };
  }, [viewMode]);

  // Calculate today's position
  const todayForIndicator = new Date();
  todayForIndicator.setHours(0, 0, 0, 0);
  const todayPosition = ((todayForIndicator.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
  const isTodayVisible = todayPosition >= 0 && todayPosition <= 100;

  // View mode controls
  const viewModes: ViewMode[] = ['day', 'week', 'sprint', 'month', 'quarter', 'year'];

  const zoomIn = () => {
    const currentIndex = viewModes.indexOf(viewMode);
    if (currentIndex > 0) {
      setViewMode(viewModes[currentIndex - 1]);
    }
  };

  const zoomOut = () => {
    const currentIndex = viewModes.indexOf(viewMode);
    if (currentIndex < viewModes.length - 1) {
      setViewMode(viewModes[currentIndex + 1]);
    }
  };

  const resetViewMode = () => {
    setViewMode('month');
  };

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (scrollContainerRef.current && isTodayVisible) {
      const container = scrollContainerRef.current;
      const containerWidth = container.clientWidth;
      const scrollWidth = container.scrollWidth;
      const todayScrollPosition = (todayPosition / 100) * scrollWidth - containerWidth / 2;
      container.scrollTo({ left: Math.max(0, todayScrollPosition), behavior: 'smooth' });
    }
  }, [todayPosition, isTodayVisible]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetViewMode();
        scrollToToday();
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          toast.info('Undo');
        }
      } else if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
                 (e.key === 'y' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        if (canRedo) {
          redo();
          toast.info('Redo');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToToday, canUndo, canRedo, undo, redo]);

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      parentId: addingSubtaskTo || taskData.parentId,
    };
    setTasks([...tasks, newTask]);
    setIsDialogOpen(false);
    setAddingSubtaskTo(null);
    toast.success('Task created', { description: newTask.name });
  };

  const handleEditTask = async (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      const updatedTask = { ...taskData, id: editingTask.id, linearProjectId: editingTask.linearProjectId, linearIssueId: editingTask.linearIssueId };

      setTasks(tasks.map(task =>
        task.id === editingTask.id ? updatedTask : task
      ));

      if (linearApiKey && (editingTask.linearProjectId || editingTask.linearIssueId)) {
        setIsSyncing(true);
        try {
          if (editingTask.linearProjectId) {
            await updateLinearProject(linearApiKey, editingTask.linearProjectId, {
              name: taskData.name,
              startDate: formatDateForLinear(taskData.startDate),
              targetDate: formatDateForLinear(taskData.endDate),
            });
          } else if (editingTask.linearIssueId) {
            await updateLinearIssue(linearApiKey, editingTask.linearIssueId, {
              title: taskData.name,
              dueDate: formatDateForLinear(taskData.endDate),
            });
          }
        } catch (error) {
          console.error('Failed to sync with Linear:', error);
        } finally {
          setIsSyncing(false);
        }
      }

      setEditingTask(null);
      setIsDialogOpen(false);
      toast.success('Task updated', { description: taskData.name });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setDeleteConfirmOpen(false);
    const taskId = taskToDelete.id;

    const taskIdsToDelete = new Set([taskId]);
    const findChildIds = (parentId: string) => {
      getChildTasks(parentId).forEach(child => {
        taskIdsToDelete.add(child.id);
        findChildIds(child.id);
      });
    };
    findChildIds(taskId);

    // Delete from Linear
    const apiKey = localStorage.getItem('linear-api-key');
    if (apiKey) {
      setIsSyncing(true);
      try {
        // Get all tasks to delete that have Linear IDs
        const tasksToDeleteFromLinear = tasks.filter(t => taskIdsToDelete.has(t.id));

        for (const task of tasksToDeleteFromLinear) {
          if (task.linearProjectId) {
            await deleteLinearProject(apiKey, task.linearProjectId);
          } else if (task.linearIssueId) {
            await deleteLinearIssue(apiKey, task.linearIssueId);
          }
        }
        toast.success('삭제됨 (Linear 아카이브됨)', { description: taskToDelete.name });
      } catch (error) {
        console.error('Failed to delete from Linear:', error);
        toast.error('Linear 삭제 실패', { description: '로컬에서는 삭제됩니다' });
      } finally {
        setIsSyncing(false);
      }
    } else {
      toast.success('삭제됨', { description: taskToDelete.name });
    }

    setTasks(tasks.filter(task => !taskIdsToDelete.has(task.id)));
    setEditingTask(null);
    setIsDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleDuplicateTask = (taskId: string) => {
    const taskToDuplicate = tasks.find(t => t.id === taskId);
    if (!taskToDuplicate) return;

    const newTask: Task = {
      ...taskToDuplicate,
      id: `task-${Date.now()}`,
      name: `${taskToDuplicate.name} (복사본)`,
      // Remove Linear IDs so it's treated as a new local task
      linearProjectId: undefined,
      linearIssueId: undefined,
    };

    setTasks([...tasks, newTask]);
    toast.success('태스크 복제됨', { description: newTask.name });
  };

  // Drag and drop handlers for task reordering
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Add a slight delay to show drag effect
    setTimeout(() => {
      const element = document.querySelector(`[data-task-id="${taskId}"]`);
      if (element) element.classList.add('opacity-50');
    }, 0);
  };

  const handleTaskDragEnd = () => {
    const element = document.querySelector(`[data-task-id="${draggedTaskId}"]`);
    if (element) element.classList.remove('opacity-50');
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDropPosition(null);
  };

  const handleTaskDragOver = (e: React.DragEvent, taskId: string, taskParentId?: string) => {
    e.preventDefault();
    if (draggedTaskId === taskId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'inside';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      // Middle area - drop inside (as child)
      position = 'inside';
    }

    setDragOverTaskId(taskId);
    setDropPosition(position);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTaskDragLeave = () => {
    setDragOverTaskId(null);
    setDropPosition(null);
  };

  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      handleTaskDragEnd();
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    if (!draggedTask || !targetTask) {
      handleTaskDragEnd();
      return;
    }

    // Prevent dropping a task onto its own children
    const isChildOf = (potentialChildId: string, parentId: string): boolean => {
      const child = tasks.find(t => t.id === potentialChildId);
      if (!child?.parentId) return false;
      if (child.parentId === parentId) return true;
      return isChildOf(child.parentId, parentId);
    };

    if (isChildOf(targetTaskId, draggedTaskId)) {
      toast.error('하위 태스크로 이동할 수 없습니다');
      handleTaskDragEnd();
      return;
    }

    let updatedTasks = [...tasks];
    let newParentId: string | undefined;
    let newLinearParentId: string | null = null;

    if (dropPosition === 'inside') {
      // Move as child of target
      newParentId = targetTaskId;
      newLinearParentId = targetTask.linearIssueId || null;
      updatedTasks = tasks.map(t =>
        t.id === draggedTaskId
          ? { ...t, parentId: targetTaskId }
          : t
      );
      toast.success('태스크 이동됨', { description: `${draggedTask.name} → ${targetTask.name}의 하위로` });
    } else {
      // Reorder: remove dragged task and insert at new position
      const draggedIndex = updatedTasks.findIndex(t => t.id === draggedTaskId);
      const targetIndex = updatedTasks.findIndex(t => t.id === targetTaskId);

      // Update parentId to match target's parent (sibling placement)
      newParentId = targetTask.parentId;
      const parentTask = newParentId ? tasks.find(t => t.id === newParentId) : null;
      newLinearParentId = parentTask?.linearIssueId || null;
      const updatedDraggedTask = { ...draggedTask, parentId: targetTask.parentId };

      // Remove from current position
      updatedTasks.splice(draggedIndex, 1);

      // Calculate new index (accounting for removal if dragged was before target)
      let newIndex = targetIndex;
      if (draggedIndex < targetIndex) {
        newIndex--;
      }
      if (dropPosition === 'after') {
        newIndex++;
      }

      // Insert at new position
      updatedTasks.splice(newIndex, 0, updatedDraggedTask);
      toast.success('태스크 순서 변경됨');
    }

    setTasks(updatedTasks);
    handleTaskDragEnd();

    // Sync to Linear if the task has a linearIssueId and parent changed
    if (linearApiKey && draggedTask.linearIssueId && draggedTask.parentId !== newParentId) {
      setIsSyncing(true);
      try {
        const success = await updateLinearIssueExtended(linearApiKey, draggedTask.linearIssueId, {
          parentId: newLinearParentId,
        });
        if (success) {
          toast.success('Linear 동기화 완료');
        } else {
          toast.error('Linear 동기화 실패');
        }
      } catch (error) {
        console.error('Failed to sync parent to Linear:', error);
        toast.error('Linear 동기화 실패');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDateChange = async (taskId: string, newStartDate: Date, newEndDate: Date) => {
    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, startDate: newStartDate, endDate: newEndDate }
        : t
    ));
  };

  const syncTaskToLinear = async (task: Task) => {
    if (!linearApiKey || (!task.linearProjectId && !task.linearIssueId)) return;

    setIsSyncing(true);
    try {
      if (task.linearProjectId) {
        await updateLinearProject(linearApiKey, task.linearProjectId, {
          startDate: formatDateForLinear(task.startDate),
          targetDate: formatDateForLinear(task.endDate),
        });
      } else if (task.linearIssueId) {
        await updateLinearIssue(linearApiKey, task.linearIssueId, {
          dueDate: formatDateForLinear(task.endDate),
        });
      }
    } catch (error) {
      console.error('Failed to sync with Linear:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDragEnd = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      syncTaskToLinear(task);
    }
  };

  const handleProgressChange = (taskId: string, progress: number) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, progress } : t
    ));
    toast.success('Progress updated', { description: `${task?.name}: ${progress}%` });
  };

  const handleLinearImport = (linearTasks: Task[]) => {
    const nonLinearTasks = tasks.filter(t => !t.linearProjectId && !t.linearIssueId);
    setTasks([...nonLinearTasks, ...linearTasks]);

    const projectIds = linearTasks
      .filter(t => t.linearProjectId)
      .map(t => t.linearProjectId!)
      .filter((id, index, arr) => arr.indexOf(id) === index);
    if (projectIds.length > 0) {
      setImportedProjectIds(projectIds);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setAddingSubtaskTo(null);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingTask(null);
    setAddingSubtaskTo(null);
    setIsDialogOpen(true);
  };

  const openAddSubtaskDialog = (parentTaskId: string) => {
    setEditingTask(null);
    setAddingSubtaskTo(parentTaskId);
    setIsDialogOpen(true);
  };

  // Clear all data
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all tasks? This cannot be undone.')) {
      const count = tasks.length;
      setTasks([]);
      setImportedProjectIds([]);
      localStorage.removeItem('gantt-tasks');
      localStorage.removeItem('linear-imported-project-ids');
      toast.success('All tasks cleared', { description: `${count} tasks removed` });
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const organizedTasks = organizeTasksHierarchically();

  // Show loading skeleton
  if (isLoading) {
    return <GanttSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className={`w-full ${className}`} role="application" aria-label="Gantt Chart Project Management">
        <Card className="p-4 md:p-6 shadow-sm border-border/50" role="region" aria-label="Project Timeline">
          {/* Header - Clean Professional Design */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              {isEditingProjectName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempProjectName}
                    onChange={(e) => setTempProjectName(e.target.value)}
                    onKeyDown={handleProjectNameKeyDown}
                    onBlur={handleSaveProjectName}
                    className="text-base md:text-lg font-semibold border-none p-0 h-auto bg-transparent focus:bg-background"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveProjectName} className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEditingProjectName} className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">{projectName}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEditingProjectName}
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {isSyncing && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">동기화 중...</span>
                </div>
              )}

              {/* View Mode Selector */}
              <div className="flex items-center gap-1.5">
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background border-border/60 hover:border-border focus:ring-1 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {viewModes.map((mode) => (
                      <SelectItem key={mode} value={mode} className="text-xs">
                        {viewModeLabels[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center bg-muted/30 rounded-md p-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background" onClick={zoomIn} disabled={viewMode === 'day'}>
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">확대 (+)</TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 bg-border/50" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background" onClick={() => { resetViewMode(); scrollToToday(); }}>
                        <Home className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">오늘 (0)</TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 bg-border/50" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background" onClick={zoomOut} disabled={viewMode === 'year'}>
                        <ZoomOut className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">축소 (-)</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Undo/Redo Controls */}
              <div className="flex items-center bg-muted/30 rounded-md p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-background disabled:opacity-30"
                      onClick={() => { undo(); toast.info('실행 취소'); }}
                      disabled={!canUndo}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">실행 취소 (⌘Z)</TooltipContent>
                </Tooltip>
                <div className="w-px h-4 bg-border/50" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-background disabled:opacity-30"
                      onClick={() => { redo(); toast.info('다시 실행'); }}
                      disabled={!canRedo}
                    >
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">다시 실행 (⌘⇧Z)</TooltipContent>
                </Tooltip>
              </div>

              <GanttSettings settings={ganttSettings} onSettingsChange={setGanttSettings} />

              <ExportMenu tasks={tasks} projectName="간트 차트" />

              {/* Linear Sync */}
              <LinearSync
                onImport={handleLinearImport}
                importedProjectIds={importedProjectIds}
              />

              {/* Add Task Button */}
              <Button onClick={openAddDialog} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">태스크 추가</span>
              </Button>
            </div>
          </div>

          {/* Linear-style Filter Controls */}
          {tasks.length > 0 && (
            <GanttFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterStatus={filterStatus}
              onStatusChange={setFilterStatus}
              filterAssignee={filterAssignee}
              onAssigneeChange={setFilterAssignee}
              filterPriority={filterPriority}
              onPriorityChange={setFilterPriority}
              filterTeam={filterTeam}
              onTeamChange={setFilterTeam}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              showStats={showStats}
              onShowStatsChange={setShowStats}
              assignees={uniqueAssignees}
              teams={uniqueTeams}
              className="mb-4"
            />
          )}

          {/* Statistics Panel - Premium Design */}
          {showStats && tasks.length > 0 && (
            <div className="mb-6 p-5 bg-gradient-to-br from-muted/30 via-background to-muted/20 rounded-xl border border-border/50 animate-slide-in-bottom">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Donut Chart */}
                <div className="flex items-center justify-center lg:w-48 animate-pop-in">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-muted/30"
                      />
                      {/* Not Started segment */}
                      <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={`${(stats.notStarted / stats.total) * 251.2} 251.2`}
                        strokeDashoffset="0"
                        className="text-gray-400 transition-all duration-700"
                      />
                      {/* In Progress segment */}
                      <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={`${(stats.inProgress / stats.total) * 251.2} 251.2`}
                        strokeDashoffset={`${-(stats.notStarted / stats.total) * 251.2}`}
                        className="text-amber-500 transition-all duration-700"
                      />
                      {/* Completed segment */}
                      <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={`${(stats.completed / stats.total) * 251.2} 251.2`}
                        strokeDashoffset={`${-((stats.notStarted + stats.inProgress) / stats.total) * 251.2}`}
                        className="text-emerald-500 transition-all duration-700"
                      />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold tabular-nums">{stats.avgProgress}%</span>
                      <span className="text-xs text-muted-foreground">완료율</span>
                    </div>
                  </div>
                </div>

                {/* Right: Stats Details */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Total */}
                  <div className="stats-card p-4 rounded-lg bg-background/80 border border-border/50 hover:border-border transition-colors card-enhanced">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">전체</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">태스크</div>
                  </div>

                  {/* Completed */}
                  <div className="stats-card p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors card-enhanced">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">완료</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.completed}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</div>
                  </div>

                  {/* In Progress */}
                  <div className="stats-card p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors card-enhanced">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">진행중</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{stats.inProgress}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%</div>
                  </div>

                  {/* Not Started */}
                  <div className="stats-card p-4 rounded-lg bg-gray-500/5 border border-gray-500/20 hover:border-gray-500/40 transition-colors card-enhanced">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">시작전</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 tabular-nums">{stats.notStarted}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats.total > 0 ? Math.round((stats.notStarted / stats.total) * 100) : 0}%</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-700"
                      style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-gray-400 transition-all duration-700"
                      style={{ width: `${(stats.notStarted / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium tabular-nums w-20 text-right">
                    {stats.completed}/{stats.total} 완료
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Results Info */}
          {(searchQuery || filterStatus !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all' || filterTeam !== 'all') && tasks.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <span>{filteredTasks.length}개 / 전체 {tasks.length}개</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                  setFilterAssignee('all');
                  setFilterPriority('all');
                  setFilterTeam('all');
                }}
                className="h-6 text-xs"
              >
                필터 초기화
              </Button>
            </div>
          )}

          {/* Empty State - Premium Design */}
          {tasks.length === 0 && (
            <div className="relative py-20 overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                <svg className="w-96 h-96" viewBox="0 0 100 100">
                  <rect x="5" y="20" width="90" height="8" rx="2" fill="currentColor" />
                  <rect x="5" y="35" width="70" height="8" rx="2" fill="currentColor" />
                  <rect x="5" y="50" width="80" height="8" rx="2" fill="currentColor" />
                  <rect x="5" y="65" width="60" height="8" rx="2" fill="currentColor" />
                </svg>
              </div>

              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-muted/50 mb-4">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  태스크가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  Linear에서 프로젝트를 동기화하면 여기에 표시됩니다
                </p>
              </div>
            </div>
          )}

          {/* Gantt Chart */}
          {tasks.length > 0 && (
            <div ref={scrollContainerRef} className="overflow-x-auto -mx-4 md:mx-0 rounded-xl border border-border/50 shadow-sm smooth-scroll">
              <div className="min-w-[800px] md:min-w-[1200px] px-4 md:px-0">
                {/* Timeline Header - Professional Design */}
                <div className="flex border-b-2 border-border/70 sticky top-0 z-30 bg-gradient-to-b from-muted/60 to-muted/40 backdrop-blur-md relative">
                  <div
                    className="px-5 py-4 border-r border-border/60 flex items-center gap-3 flex-shrink-0"
                    style={{ width: taskColumnWidth }}
                  >
                    <span className="text-[15px] font-bold text-foreground uppercase tracking-wider">태스크</span>
                    <span className="text-[13px] text-muted-foreground/90 px-2.5 py-1 bg-background/80 rounded-lg tabular-nums font-bold shadow-sm">{organizedTasks.length}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="flex">
                      {monthHeaders.map((month, index) => {
                        const isToday = month.date.toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={index}
                            className={`flex-1 min-w-[44px] py-3 px-2 text-center border-r border-border/40 transition-all duration-200 ${
                              isToday ? 'bg-blue-500/15 border-blue-500/40' : 'hover:bg-muted/50'
                            }`}
                            style={{ width: `${month.width}%` }}
                          >
                            <div className={`text-[13px] font-bold tabular-nums leading-tight ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                              {month.date.getDate()}
                            </div>
                            <div className={`text-[11px] font-medium truncate leading-tight mt-1 ${isToday ? 'text-blue-500/90 dark:text-blue-400/80' : 'text-muted-foreground/80'}`}>
                              {month.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sprint/Cycle Visualization Row */}
                {linearCycles.length > 0 && (
                  <div className="flex border-b border-border/50 bg-gradient-to-r from-violet-50/50 via-indigo-50/30 to-purple-50/50 dark:from-violet-950/20 dark:via-indigo-950/10 dark:to-purple-950/20">
                    <div
                      className="px-5 py-2 border-r border-border/50 flex items-center gap-2 flex-shrink-0 text-xs font-medium text-muted-foreground"
                      style={{ width: taskColumnWidth }}
                    >
                      <span className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-md">
                        스프린트
                      </span>
                    </div>
                    <div className="flex-1 relative h-8">
                      {linearCycles.map((cycle) => {
                        const cycleStart = cycle.startsAt;
                        const cycleEnd = cycle.endsAt;

                        // Calculate position
                        const startDiff = Math.max(0, (cycleStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                        const endDiff = Math.min(totalDays, (cycleEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

                        // Skip if outside visible range
                        if (startDiff >= totalDays || endDiff <= 0) return null;

                        const leftPercent = (startDiff / totalDays) * 100;
                        const widthPercent = ((endDiff - startDiff) / totalDays) * 100;

                        const now = new Date();
                        const isActive = now >= cycleStart && now <= cycleEnd;
                        const isPast = now > cycleEnd;

                        return (
                          <Tooltip key={cycle.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute top-1 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold shadow-sm border transition-all cursor-default ${
                                  isActive
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-500/50'
                                    : isPast
                                    ? 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                    : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-blue-500/50'
                                }`}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${Math.max(widthPercent, 3)}%`,
                                  minWidth: '60px',
                                }}
                              >
                                <span className="truncate px-2">{cycle.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">{cycle.name}</div>
                                <div className="text-muted-foreground">
                                  {cycleStart.toLocaleDateString('ko')} ~ {cycleEnd.toLocaleDateString('ko')}
                                </div>
                                <div className={`mt-1 ${isActive ? 'text-green-500' : isPast ? 'text-gray-500' : 'text-blue-500'}`}>
                                  {isActive ? '진행 중' : isPast ? '완료됨' : '예정됨'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Task Rows */}
                <div role="list" aria-label="Task list" className="relative">
                  {/* Dependency Lines */}
                  <DependencyLines
                    tasks={organizedTasks}
                    timelineStart={timelineStart}
                    totalDays={totalDays}
                    rowHeight={ganttSettings.rowHeight}
                    showDependencyLines={ganttSettings.showDependencyLines}
                  />
                {organizedTasks.map((task, index) => {
                  // Handle group headers
                  if (task.isGroupHeader) {
                    return (
                      <div
                        key={task.id}
                        className="flex border-b h-10 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/40 sticky top-[52px] z-20"
                        role="row"
                      >
                        <div
                          className="px-5 border-r border-border/50 flex items-center gap-3 flex-shrink-0"
                          style={{ width: taskColumnWidth }}
                        >
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">{task.groupName}</span>
                          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
                            {task.groupCount}
                          </span>
                        </div>
                        <div className="flex-1 bg-muted/30" />
                      </div>
                    );
                  }

                  const isProject = !task.parentId && groupBy === 'none'; // 프로젝트: parentId가 없는 것 (그룹 없을 때만)
                  const isParent = hasChildren(task.id);
                  const isCollapsed = isTaskCollapsed(task.id);
                  const level = task.level || 0;
                  const isEven = index % 2 === 0;
                  const rowHeightClass = ganttSettings.rowHeight === 'compact' ? 'h-12' : ganttSettings.rowHeight === 'comfortable' ? 'h-18' : 'h-16';
                  const isDragOver = dragOverTaskId === task.id;
                  const isDragging = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      data-task-id={task.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      onDragEnd={handleTaskDragEnd}
                      onDragOver={(e) => handleTaskDragOver(e, task.id, task.parentId)}
                      onDragLeave={handleTaskDragLeave}
                      onDrop={(e) => handleTaskDrop(e, task.id)}
                      className={`flex border-b group ${rowHeightClass} transition-all cursor-grab active:cursor-grabbing ${
                        isProject
                          ? 'bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/20 hover:from-primary/10 hover:via-primary/5'
                          : `${isEven ? 'bg-background' : 'bg-muted/30'} border-border/30 hover:bg-accent/50`
                      } ${isDragging ? 'opacity-50 scale-[0.98]' : ''} ${
                        isDragOver && dropPosition === 'before' ? 'border-t-2 border-t-primary' :
                        isDragOver && dropPosition === 'after' ? 'border-b-2 border-b-primary' :
                        isDragOver && dropPosition === 'inside' ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                      }`}
                      role="listitem"
                      aria-label={`${task.name}, ${task.progress}% complete`}
                    >
                      <div className="px-5 border-r border-border/50 flex items-center justify-between transition-colors flex-shrink-0" style={{ width: taskColumnWidth }}>
                        <div className="flex items-center gap-2 w-full">
                          {/* Drag Handle */}
                          <div className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {/* Indentation for hierarchy */}
                          <div style={{ width: `${level * 20}px` }} className="flex-shrink-0" />

                          {/* Collapse/Expand Button or Task Indicator */}
                          {isParent ? (
                            <button
                              className={`h-6 w-6 flex items-center justify-center rounded-md transition-all ${
                                isProject
                                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                              }`}
                              onClick={() => toggleTaskCollapse(task.id)}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <div className={`h-6 w-6 flex items-center justify-center rounded-md ${
                              isProject ? 'bg-primary/10' : 'bg-muted/50'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isProject ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                            </div>
                          )}

                          {/* Project/Task color indicator - vertical bar */}
                          <div
                            className={`rounded-full flex-shrink-0 shadow-sm ${isProject ? 'w-1.5 h-10' : 'w-1 h-7'}`}
                            style={{ backgroundColor: task.color }}
                          />

                          <div className="flex-1 min-w-0 ml-2">
                            <div className="flex items-center gap-2">
                              {/* Project/Task Type Badge */}
                              {isProject && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                                  프로젝트
                                </span>
                              )}
                              <span className={`leading-snug truncate flex-1 ${
                                isProject
                                  ? 'text-[15px] font-bold text-foreground tracking-tight'
                                  : 'text-[13px] font-medium text-foreground/85'
                              }`}>
                                {task.name}
                              </span>
                              {/* Priority Badge */}
                              {task.priority && task.priority !== 'none' && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                  task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                  'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                }`}>
                                  {task.priority === 'urgent' ? '긴급' : task.priority === 'high' ? '높음' : task.priority === 'medium' ? '보통' : '낮음'}
                                </span>
                              )}
                              {/* Estimate */}
                              {task.estimate && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 flex-shrink-0">
                                  {task.estimate}pt
                                </span>
                              )}
                              {/* Progress */}
                              <span className={`text-[11px] font-bold tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded ${
                                task.progress === 100 ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20' :
                                task.progress >= 50 ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20' :
                                'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-500/20'
                              }`}>
                                {task.progress}%
                              </span>
                            </div>
                            {/* Second row - Assignee & Meta (only show if there's content) */}
                            {(task.teamName || task.assignee || task.cycleName || (task.labels && task.labels.length > 0)) && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {/* Team Icon - show emoji if valid, otherwise show team initial with unique color */}
                              {task.teamName && (() => {
                                const teamColor = task.teamId ? getTeamColor(task.teamId) : TEAM_COLORS[0];
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex-shrink-0 cursor-default">
                                        {task.teamIcon && isValidEmoji(task.teamIcon) ? (
                                          <span className="text-sm">{task.teamIcon}</span>
                                        ) : (
                                          <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold border ${teamColor.bg} ${teamColor.text} ${teamColor.border}`}>
                                            {getTeamInitial(task.teamName)}
                                          </div>
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{task.teamName}</TooltipContent>
                                  </Tooltip>
                                );
                              })()}
                              {/* Assignee with Avatar */}
                              {task.assignee && (() => {
                                const avatarUrl = task.assigneeAvatarUrl || linearTeamMembers.get(task.assignee);
                                return (
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/90 font-medium">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={task.assignee}
                                        className="w-4 h-4 rounded-full object-cover ring-1 ring-border/50"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">
                                        {task.assignee.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="truncate max-w-[80px]">{task.assignee}</span>
                                  </span>
                                );
                              })()}
                              {/* Sprint Badge */}
                              {task.cycleName && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 flex-shrink-0">
                                  🏃 {task.cycleName}
                                </span>
                              )}
                              {/* Labels */}
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {task.labels.slice(0, 2).map((label, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: `${label.color}20`,
                                        color: label.color,
                                      }}
                                    >
                                      {label.name}
                                    </span>
                                  ))}
                                  {task.labels.length > 2 && (
                                    <span className="text-[9px] text-muted-foreground">+{task.labels.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEditDialog(task)} className="text-sm py-2 cursor-pointer font-medium">
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTask(task.id)} className="text-sm py-2 cursor-pointer font-medium gap-2">
                              <Copy className="h-3.5 w-3.5" />
                              복제
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAddSubtaskDialog(task.id)} className="text-sm py-2 cursor-pointer font-medium">
                              하위 태스크 추가
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-destructive text-sm py-2 cursor-pointer font-medium focus:text-destructive"
                            >
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex-1 relative">
                        {/* Weekend Highlighting */}
                        {ganttSettings.weekendHighlight && dayMarkers.filter(d => d.isWeekend).map((marker, idx) => (
                          <div
                            key={`weekend-${idx}`}
                            className="absolute top-0 bottom-0 bg-rose-500/8 dark:bg-rose-400/10 pointer-events-none"
                            style={{
                              left: `${marker.position}%`,
                              width: `${100 / totalDays}%`,
                            }}
                          />
                        ))}
                        {/* Grid Lines */}
                        {ganttSettings.showGridLines && dayMarkers.map((marker, idx) => (
                          <div
                            key={`grid-${idx}`}
                            className="absolute top-0 bottom-0 w-px bg-border/50 pointer-events-none"
                            style={{ left: `${marker.position}%` }}
                          />
                        ))}
                        {/* Today Indicator */}
                        {ganttSettings.todayHighlight && isTodayVisible && (
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-blue-500 z-10 pointer-events-none shadow-sm"
                            style={{ left: `${todayPosition}%` }}
                          />
                        )}
                        <TaskBar
                          task={task}
                          timelineStart={timelineStart}
                          timelineEnd={timelineEnd}
                          totalDays={totalDays}
                          isSubtask={!!task.parentId}
                          isParent={isParent}
                          level={level}
                          onDateChange={handleDateChange}
                          onDragEnd={handleDragEnd}
                          onProgressChange={handleProgressChange}
                          showTooltips={ganttSettings.showTooltips}
                          showProgress={ganttSettings.showProgress}
                          barStyle={ganttSettings.barStyle}
                          rowHeight={ganttSettings.rowHeight}
                        />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          {/* Legend - Professional Design */}
          {tasks.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full" />
                    <span className="font-medium">오늘</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-3 rounded bg-emerald-500" />
                    <span>완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-3 rounded bg-black/25 dark:bg-white/25" />
                    <span>남은 작업</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-5 text-sm text-muted-foreground/80">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted/70 rounded text-xs font-mono border border-border/40">+/-</kbd>
                    <span>줌</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted/70 rounded text-xs font-mono border border-border/40">0</kbd>
                    <span>오늘</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted/70 rounded text-xs font-mono border border-border/40">⌘Z</kbd>
                    <span>실행취소</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingTask(null);
          setAddingSubtaskTo(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? '태스크 수정' : '새 태스크'}
            </DialogTitle>
          </DialogHeader>
          <SimpleTaskForm
            task={editingTask}
            parentTask={addingSubtaskTo ? tasks.find(t => t.id === addingSubtaskTo) : null}
            allTasks={tasks}
            onSubmit={(taskData) => {
              if (editingTask) {
                handleEditTask(taskData);
              } else {
                handleAddTask(taskData);
              }
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setTaskToDelete(null);
        }}
        title="삭제 확인"
        description={
          taskToDelete?.linearProjectId
            ? `"${taskToDelete?.name}" 프로젝트와 하위 이슈들을 삭제하시겠습니까? Linear에서도 아카이브됩니다.`
            : taskToDelete?.linearIssueId
            ? `"${taskToDelete?.name}" 이슈를 삭제하시겠습니까? Linear에서도 아카이브됩니다.`
            : `"${taskToDelete?.name}" 태스크를 삭제하시겠습니까?`
        }
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        onConfirm={confirmDeleteTask}
        isLoading={isSyncing}
      />
    </TooltipProvider>
  );
}
