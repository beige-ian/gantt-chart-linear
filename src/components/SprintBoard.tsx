import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  MoreHorizontal,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Loader2,
  Inbox,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { SprintTask, STATUS_LABELS, PRIORITY_COLORS } from '../types/sprint';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SprintBoardProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onStatusChange: (taskId: string, status: SprintTask['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskDropFromBacklog?: (taskId: string, status: SprintTask['status']) => void;
  onUnassignFromSprint?: (taskId: string) => void;
}

const COLUMNS: SprintTask['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

// Linear-style status icons
const STATUS_ICONS: Record<SprintTask['status'], React.ReactNode> = {
  backlog: <Circle className="h-[14px] w-[14px] text-[#95959f]" strokeWidth={1.5} />,
  todo: <Circle className="h-[14px] w-[14px] text-[#e2e2e3]" strokeWidth={2} />,
  in_progress: <Loader2 className="h-[14px] w-[14px] text-[#f2c94c]" />,
  in_review: <AlertTriangle className="h-[14px] w-[14px] text-[#bb87fc]" />,
  done: <CheckCircle2 className="h-[14px] w-[14px] text-[#4da568]" />,
};

// Linear-style column labels
const LINEAR_STATUS_LABELS: Record<SprintTask['status'], string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

// Priority icons
const PRIORITY_ICONS: Record<SprintTask['priority'], React.ReactNode> = {
  urgent: <div className="w-3 h-3 rounded-sm bg-[#f2994a] flex items-center justify-center"><span className="text-[8px] text-white font-bold">!</span></div>,
  high: <div className="w-3 h-3 rounded-sm bg-[#eb5757] flex items-center justify-center"><span className="text-[8px] text-white font-bold">↑</span></div>,
  medium: <div className="w-3 h-3 rounded-sm bg-[#f2c94c] flex items-center justify-center"><span className="text-[8px] text-black font-bold">−</span></div>,
  low: <div className="w-3 h-3 rounded-sm bg-[#6fcf97] flex items-center justify-center"><span className="text-[8px] text-white font-bold">↓</span></div>,
  none: null,
};

export function SprintBoard({ tasks, onTaskClick, onStatusChange, onDeleteTask, onTaskDropFromBacklog, onUnassignFromSprint }: SprintBoardProps) {
  const [draggedTask, setDraggedTask] = useState<SprintTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<SprintTask['status'] | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  // Group tasks by status and then by project
  const tasksByStatusAndProject = useMemo(() => {
    const grouped: Record<SprintTask['status'], Map<string, SprintTask[]>> = {
      backlog: new Map(),
      todo: new Map(),
      in_progress: new Map(),
      in_review: new Map(),
      done: new Map(),
    };

    tasks.forEach(task => {
      const projectKey = task.parentId || task.linearParentIssueId || '__no_project__';
      const statusMap = grouped[task.status];
      if (!statusMap.has(projectKey)) {
        statusMap.set(projectKey, []);
      }
      statusMap.get(projectKey)!.push(task);
    });

    return grouped;
  }, [tasks]);

  // Get project info from tasks
  const projectInfo = useMemo(() => {
    const info: Record<string, { name: string; color: string }> = {};
    tasks.forEach(task => {
      if (!task.parentId && task.linearProjectId) {
        // This is a project-level task
        info[task.id] = { name: task.name, color: task.color };
      }
    });
    return info;
  }, [tasks]);

  // Column stats
  const columnStats = useMemo(() => {
    const stats: Record<SprintTask['status'], number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };
    tasks.forEach(task => {
      stats[task.status]++;
    });
    return stats;
  }, [tasks]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, task: SprintTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: SprintTask['status']) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDrop = (e: React.DragEvent, status: SprintTask['status']) => {
    e.preventDefault();

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.source === 'backlog' && data.taskId && onTaskDropFromBacklog) {
          // Pass both taskId and the target status
          onTaskDropFromBacklog(data.taskId, status);
          setDragOverColumn(null);
          return;
        }
      }
    } catch (err) {
      // Not JSON data
    }

    if (draggedTask && draggedTask.status !== status) {
      onStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getProjectName = (projectId: string): string => {
    if (projectId === '__no_project__') return '';
    const project = tasks.find(t => t.id === projectId || t.linearIssueId === projectId);
    return project?.name || projectId;
  };

  const renderTaskCard = (task: SprintTask, status: SprintTask['status']) => {
    const isDragging = draggedTask?.id === task.id;
    const issueId = task.linearIssueId ? `${task.linearIssueId.slice(-6).toUpperCase()}` : '';

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        onClick={() => onTaskClick(task)}
        className={`
          group relative bg-[#1f2023] hover:bg-[#26272b] rounded-md p-3 cursor-pointer
          transition-all duration-150 border border-transparent hover:border-[#3d3e42]
          ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
        `}
      >
        {/* Issue ID & Parent Project */}
        <div className="flex items-center gap-2 text-[11px] text-[#8b8b8f] mb-1.5">
          {issueId && <span>{issueId}</span>}
          {task.parentId && (
            <>
              <span className="text-[#5c5c5f]">›</span>
              <span className="truncate">{getProjectName(task.parentId)}</span>
            </>
          )}
        </div>

        {/* Status icon + Title */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">
            {task.status === 'done' ? (
              <CheckCircle2 className="h-4 w-4 text-[#4da568]" />
            ) : (
              <Circle className="h-4 w-4 text-[#5c5c5f]" strokeWidth={1.5} />
            )}
          </div>
          <span className={`text-[13px] leading-snug ${task.status === 'done' ? 'text-[#8b8b8f] line-through' : 'text-[#e8e8e8]'}`}>
            {task.name}
          </span>
        </div>

        {/* Priority & Assignee row */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2">
            {/* Priority */}
            {task.priority && task.priority !== 'none' && PRIORITY_ICONS[task.priority]}

            {/* Story Points */}
            {task.storyPoints && task.storyPoints > 0 && (
              <span className="text-[10px] text-[#8b8b8f] bg-[#2d2e32] px-1.5 py-0.5 rounded">
                {task.storyPoints}
              </span>
            )}
          </div>

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-1.5">
              {task.assigneeAvatarUrl ? (
                <img
                  src={task.assigneeAvatarUrl}
                  alt={task.assignee}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#5e6ad2] flex items-center justify-center text-[10px] text-white font-medium">
                  {task.assignee.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* More menu (visible on hover) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-[#3d3e42] transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4 text-[#8b8b8f]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#1f2023] border-[#3d3e42]">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTaskClick(task); }} className="text-[#e8e8e8] focus:bg-[#2d2e32]">
              수정
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#3d3e42]" />
            {COLUMNS.filter(s => s !== status).map(s => (
              <DropdownMenuItem
                key={s}
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, s); }}
                className="text-[#e8e8e8] focus:bg-[#2d2e32]"
              >
                <span className="flex items-center gap-2">
                  {STATUS_ICONS[s]}
                  {LINEAR_STATUS_LABELS[s]}로 이동
                </span>
              </DropdownMenuItem>
            ))}
            {onUnassignFromSprint && (
              <>
                <DropdownMenuSeparator className="bg-[#3d3e42]" />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onUnassignFromSprint(task.id); }}
                  className="text-[#e8e8e8] focus:bg-[#2d2e32]"
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    백로그로 이동
                  </span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-[#3d3e42]" />
            <DropdownMenuItem
              className="text-[#eb5757] focus:bg-[#2d2e32] focus:text-[#eb5757]"
              onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Project tag at bottom */}
        {task.parentId && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded flex items-center justify-center text-[8px]"
              style={{ backgroundColor: projectInfo[task.parentId]?.color || '#5e6ad2' }}
            >
              <span className="text-white">●</span>
            </div>
            <span className="text-[11px] text-[#8b8b8f] truncate">
              {getProjectName(task.parentId)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex gap-0 overflow-x-auto">
        {COLUMNS.map(status => {
          const projectGroups = tasksByStatusAndProject[status];
          const isDropTarget = dragOverColumn === status;
          const taskCount = columnStats[status];

          return (
            <div
              key={status}
              data-column={status}
              className="flex-1 min-w-[280px] max-w-[380px]"
              onDragOver={(e) => handleDragOver(e, status)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header - Linear style */}
              <div className="flex items-center justify-between px-3 py-2.5 sticky top-0 bg-background z-10">
                <div className="flex items-center gap-2">
                  {STATUS_ICONS[status]}
                  <span className="text-[13px] font-medium text-[#e8e8e8]">
                    {LINEAR_STATUS_LABELS[status]}
                  </span>
                  {taskCount > 0 && (
                    <span className="text-[12px] text-[#8b8b8f] ml-0.5">
                      {taskCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#8b8b8f] hover:text-[#e8e8e8] hover:bg-[#2d2e32]">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#8b8b8f] hover:text-[#e8e8e8] hover:bg-[#2d2e32]">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Column Body */}
              <div
                className={`
                  min-h-[400px] px-2 py-1 transition-colors duration-150
                  ${isDropTarget ? 'bg-[#5e6ad2]/10' : ''}
                `}
              >
                {/* Render tasks grouped by project */}
                {Array.from(projectGroups.entries()).map(([projectId, projectTasks]) => {
                  if (projectId === '__no_project__') {
                    // Tasks without project - render directly
                    return (
                      <div key={projectId} className="space-y-2 mb-3">
                        {projectTasks.map(task => renderTaskCard(task, status))}
                      </div>
                    );
                  }

                  // Project group
                  const isCollapsed = collapsedProjects.has(projectId);
                  const projectName = getProjectName(projectId);
                  const projectColor = projectInfo[projectId]?.color || '#5e6ad2';

                  return (
                    <div key={projectId} className="mb-3">
                      {/* Project header */}
                      <button
                        onClick={() => toggleProjectCollapse(projectId)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-[#26272b] rounded transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-[#8b8b8f]" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[#8b8b8f]" />
                        )}
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ backgroundColor: projectColor }}
                        >
                          <span className="text-white text-[10px]">●</span>
                        </div>
                        <span className="text-[12px] text-[#e8e8e8] truncate flex-1 text-left">
                          {projectName}
                        </span>
                        <span className="text-[11px] text-[#8b8b8f]">
                          {projectTasks.length}
                        </span>
                      </button>

                      {/* Project tasks */}
                      {!isCollapsed && (
                        <div className="space-y-2 mt-1 ml-5">
                          {projectTasks.map(task => renderTaskCard(task, status))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty state */}
                {projectGroups.size === 0 && (
                  <div className={`
                    text-center py-12 text-[13px] text-[#5c5c5f]
                    ${isDropTarget ? 'bg-[#5e6ad2]/5 border border-dashed border-[#5e6ad2]/30 rounded-lg' : ''}
                  `}>
                    {isDropTarget ? '여기에 놓기' : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
