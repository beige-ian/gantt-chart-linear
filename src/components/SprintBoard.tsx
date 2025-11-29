import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  MoreHorizontal,
  Clock,
  User,
  AlertCircle,
  Link,
  GripVertical,
  ChevronRight,
  CheckCircle2,
  Circle,
  Timer,
  Search as SearchIcon,
  Inbox,
  Copy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { SprintTask, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../types/sprint';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { PriorityBadge } from './ui/status-badge';

interface SprintBoardProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onStatusChange: (taskId: string, status: SprintTask['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskDropFromBacklog?: (taskId: string) => void;
  onMoveToBacklog?: (taskId: string) => void;
}

const COLUMNS: SprintTask['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

// Status icons with semantic colors from design tokens
const STATUS_ICONS: Record<SprintTask['status'], React.ReactNode> = {
  backlog: <Circle className="h-4 w-4 text-status-backlog" />,
  todo: <Circle className="h-4 w-4 text-status-todo" strokeWidth={2.5} />,
  in_progress: <Timer className="h-4 w-4 text-status-in-progress" />,
  in_review: <SearchIcon className="h-4 w-4 text-status-in-review" />,
  done: <CheckCircle2 className="h-4 w-4 text-status-done" />,
};

// Column header border colors using design tokens
const COLUMN_COLORS: Record<SprintTask['status'], string> = {
  backlog: 'border-l-4 border-l-status-backlog',
  todo: 'border-l-4 border-l-status-todo',
  in_progress: 'border-l-4 border-l-status-in-progress',
  in_review: 'border-l-4 border-l-status-in-review',
  done: 'border-l-4 border-l-status-done',
};

// Status colors from design tokens (for inline styles where needed)
const STATUS_DOT_COLORS: Record<SprintTask['status'], string> = {
  backlog: 'var(--status-backlog)',
  todo: 'var(--status-todo)',
  in_progress: 'var(--status-in-progress)',
  in_review: 'var(--status-in-review)',
  done: 'var(--status-done)',
};

export function SprintBoard({ tasks, onTaskClick, onStatusChange, onDeleteTask, onTaskDropFromBacklog, onMoveToBacklog }: SprintBoardProps) {
  const [draggedTask, setDraggedTask] = useState<SprintTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<SprintTask['status'] | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchedTask, setTouchedTask] = useState<SprintTask | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Memoized task grouping by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<SprintTask['status'], SprintTask[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    tasks.forEach(task => {
      grouped[task.status].push(task);
    });
    return grouped;
  }, [tasks]);

  const getTasksByStatus = useCallback((status: SprintTask['status']) => {
    return tasksByStatus[status];
  }, [tasksByStatus]);

  // Memoized column stats
  const columnStats = useMemo(() => {
    const stats: Record<SprintTask['status'], { count: number; points: number; completedPoints: number }> = {} as any;
    COLUMNS.forEach(status => {
      const columnTasks = tasksByStatus[status];
      const points = columnTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      stats[status] = {
        count: columnTasks.length,
        points,
        completedPoints: status === 'done' ? points : 0,
      };
    });
    return stats;
  }, [tasksByStatus]);

  const getColumnStats = useCallback((status: SprintTask['status']) => {
    return columnStats[status];
  }, [columnStats]);

  // Memoized total stats
  const totalStats = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasksByStatus.done.length;
    const totalPoints = tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const donePoints = tasksByStatus.done.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    return {
      totalTasks,
      doneTasks,
      totalPoints,
      donePoints,
      progressPercent: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      pointsProgressPercent: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
    };
  }, [tasks, tasksByStatus.done]);

  const getTotalStats = useCallback(() => totalStats, [totalStats]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: SprintTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    // Add drag image
    const dragElement = e.currentTarget as HTMLElement;
    dragElement.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const dragElement = e.currentTarget as HTMLElement;
    dragElement.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: SprintTask['status']) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column completely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: SprintTask['status']) => {
    e.preventDefault();

    // Check if this is a drop from the backlog panel
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.source === 'backlog' && data.taskId && onTaskDropFromBacklog) {
          onTaskDropFromBacklog(data.taskId);
          setDragOverColumn(null);
          return;
        }
      }
    } catch (err) {
      // Not JSON data, continue with normal drop
    }

    if (draggedTask && draggedTask.status !== status) {
      onStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, task: SprintTask) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchedTask(task);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY || !touchedTask) return;

    const currentY = e.touches[0].clientY;
    const diff = Math.abs(currentY - touchStartY);

    // If moved enough, consider it a drag
    if (diff > 20) {
      setDraggedTask(touchedTask);

      // Find which column we're over
      const touch = e.touches[0];
      const columns = document.querySelectorAll('[data-column]');
      columns.forEach((col) => {
        const rect = col.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          const status = col.getAttribute('data-column') as SprintTask['status'];
          setDragOverColumn(status);
        }
      });
    }
  };

  const handleTouchEnd = () => {
    if (draggedTask && dragOverColumn && draggedTask.status !== dragOverColumn) {
      onStatusChange(draggedTask.id, dragOverColumn);
    }
    setTouchStartY(null);
    setTouchedTask(null);
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, task: SprintTask) => {
    const currentColumnIndex = COLUMNS.indexOf(task.status);

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (currentColumnIndex < COLUMNS.length - 1) {
          onStatusChange(task.id, COLUMNS[currentColumnIndex + 1]);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (currentColumnIndex > 0) {
          onStatusChange(task.id, COLUMNS[currentColumnIndex - 1]);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onTaskClick(task);
        break;
      case 'Delete':
      case 'Backspace':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          onDeleteTask(task.id);
        }
        break;
    }
  }, [onStatusChange, onTaskClick, onDeleteTask]);

  // Quick action: move to next status
  const moveToNextStatus = (task: SprintTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = COLUMNS.indexOf(task.status);
    if (currentIndex < COLUMNS.length - 1) {
      onStatusChange(task.id, COLUMNS[currentIndex + 1]);
    }
  };

  const getPriorityIcon = (priority: SprintTask['priority']) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[priority] }} />;
    }
    return null;
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `${Math.abs(days)}일 지남`, isOverdue: true, isSoon: false };
    if (days === 0) return { text: '오늘 마감', isOverdue: false, isSoon: true };
    if (days === 1) return { text: '내일 마감', isOverdue: false, isSoon: true };
    if (days <= 3) return { text: `${days}일 남음`, isOverdue: false, isSoon: true };
    return { text: `${days}일 남음`, isOverdue: false, isSoon: false };
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Overall Progress Bar - Notion style */}
        {tasks.length > 0 && (
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">진행률</span>
                <div className="flex items-center gap-1.5">
                  {COLUMNS.map(status => (
                    <Tooltip key={status}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-2.5 h-2.5 rounded-full cursor-help"
                          style={{ backgroundColor: STATUS_DOT_COLORS[status] }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {STATUS_LABELS[status]}: {columnStats[status].count}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <span className="text-sm font-medium" style={{ color: '#5e6ad2' }}>
                {totalStats.progressPercent}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${totalStats.progressPercent}%`,
                  background: 'linear-gradient(90deg, #5e6ad2 0%, #0f783c 100%)',
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalStats.doneTasks}/{totalStats.totalTasks} 완료</span>
              {totalStats.totalPoints > 0 && (
                <span>{totalStats.donePoints}/{totalStats.totalPoints} pts</span>
              )}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
          {COLUMNS.map(status => {
            const stats = getColumnStats(status);
            const columnTasks = getTasksByStatus(status);
            const isDropTarget = dragOverColumn === status;

            return (
              <div
                key={status}
                data-column={status}
                className="flex-shrink-0 w-80"
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header - Notion style */}
                <div className={`flex items-center justify-between mb-3 py-2 px-3 rounded-md bg-muted/30 ${COLUMN_COLORS[status]}`}>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[status]}
                    <h3 className="font-medium text-sm text-foreground/90">{STATUS_LABELS[status]}</h3>
                    <Badge
                      variant={stats.count > 0 ? (status === 'done' ? 'default' : 'secondary') : 'outline'}
                      className={`h-5 min-w-5 px-1.5 text-[10px] font-medium rounded-full transition-all ${
                        stats.count > 0
                          ? status === 'done'
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
                            : status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
                            : ''
                          : ''
                      }`}
                    >
                      {stats.count}
                    </Badge>
                  </div>
                  {stats.points > 0 && (
                    <Badge variant="outline" className="h-5 text-[10px] font-normal">
                      {stats.points} pts
                    </Badge>
                  )}
                </div>

                {/* Column Body */}
                <div
                  className={`min-h-[300px] rounded-lg p-2 transition-all duration-200 ${
                    isDropTarget
                      ? 'bg-primary/10 ring-2 ring-primary/40 ring-offset-2'
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="space-y-3">
                    {columnTasks.map(task => {
                      const dueInfo = formatDueDate(task.endDate);
                      const isDragging = draggedTask?.id === task.id;
                      const isFocused = focusedTaskId === task.id;

                      return (
                        <Card
                          key={task.id}
                          ref={(el) => {
                            if (el) taskRefs.current.set(task.id, el);
                            else taskRefs.current.delete(task.id);
                          }}
                          className={`
                            group relative p-3 cursor-pointer transition-all duration-150
                            bg-card hover:bg-accent/50 border-border/50
                            hover:border-border hover:shadow-sm
                            focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
                            ${isDragging ? 'opacity-50 scale-[0.98] rotate-1 shadow-lg' : ''}
                            ${isFocused ? 'ring-2 ring-primary/50 bg-accent/30' : ''}
                          `}
                          draggable
                          tabIndex={0}
                          role="button"
                          aria-label={`${task.name}, ${STATUS_LABELS[task.status]}, ${task.progress}% 완료`}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleTouchStart(e, task)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onClick={() => onTaskClick(task)}
                          onKeyDown={(e) => handleKeyDown(e, task)}
                          onFocus={() => setFocusedTaskId(task.id)}
                          onBlur={() => setFocusedTaskId(null)}
                        >
                          {/* Color indicator - Linear style */}
                          <div
                            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                            style={{ backgroundColor: task.color }}
                          />

                          {/* Drag handle (visible on hover) */}
                          <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>

                          {/* Task Header */}
                          <div className="flex items-start justify-between gap-2 pl-1">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {getPriorityIcon(task.priority)}
                              {task.linearIssueId && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                  </TooltipTrigger>
                                  <TooltipContent>Linear 연동됨</TooltipContent>
                                </Tooltip>
                              )}
                              <span className="font-medium text-sm line-clamp-2 leading-tight">
                                {task.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {/* Quick action: Move to next status */}
                              {status !== 'done' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-accent transition-all rounded"
                                      onClick={(e) => moveToNextStatus(task, e)}
                                    >
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>다음 단계로 이동</TooltipContent>
                                </Tooltip>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-accent transition-all rounded">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}>
                                    상세 보기
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="h-4 w-4 mr-2" />
                                    복제
                                  </DropdownMenuItem>
                                  {onMoveToBacklog && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToBacklog(task.id); }}>
                                        <Inbox className="h-4 w-4 mr-2" />
                                        백로그로 이동
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  {COLUMNS.filter(s => s !== status).map(s => (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, s); }}
                                    >
                                      <span className="flex items-center gap-2">
                                        {STATUS_ICONS[s]}
                                        {STATUS_LABELS[s]}로 이동
                                      </span>
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                  >
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Progress bar for tasks */}
                          {task.progress > 0 && task.progress < 100 && (
                            <div className="mt-2 pl-1">
                              <Progress value={task.progress} className="h-1" />
                            </div>
                          )}

                          {/* Task Meta - Notion style inline tags */}
                          <div className="mt-2 pl-1 flex items-center gap-1.5 flex-wrap">
                            {task.storyPoints !== undefined && task.storyPoints > 0 && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                                {task.storyPoints} pts
                              </span>
                            )}
                            {task.priority !== 'none' && (
                              <PriorityBadge priority={task.priority} size="sm" />
                            )}
                          </div>

                          {/* Task Footer */}
                          <div className="mt-2 pl-1 flex items-center justify-between text-xs">
                            <div
                              className={`flex items-center gap-1 ${
                                dueInfo.isOverdue
                                  ? 'text-red-500 font-medium'
                                  : dueInfo.isSoon
                                  ? 'text-orange-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {dueInfo.text}
                            </div>
                            {task.assignee && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Avatar className="h-5 w-5">
                                      {task.assigneeAvatarUrl ? (
                                        <img
                                          src={task.assigneeAvatarUrl}
                                          alt={task.assignee}
                                          className="w-full h-full rounded-full object-cover"
                                        />
                                      ) : (
                                        <AvatarFallback className="text-[9px]">
                                          {task.assignee.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <span className="truncate max-w-[80px]">{task.assignee}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{task.assignee}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Labels - Notion style */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="mt-2 pl-1 flex flex-wrap gap-1">
                              {task.labels.slice(0, 2).map((label, i) => (
                                <span key={i} className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                                  {label}
                                </span>
                              ))}
                              {task.labels.length > 2 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground cursor-help">
                                      +{task.labels.length - 2}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {task.labels.slice(2).join(', ')}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className={`text-center text-sm py-8 rounded-lg transition-all ${
                        isDropTarget
                          ? 'bg-primary/10 border-2 border-dashed border-primary/40 text-primary font-medium'
                          : 'text-muted-foreground/60'
                      }`}>
                        {isDropTarget ? '여기에 놓으세요' : '태스크 없음'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Keyboard shortcut hint - Notion style */}
        {tasks.length > 0 && (
          <div className="text-[11px] text-muted-foreground/70 text-center pt-3">
            <span className="hidden md:inline">
              태스크 선택 후 <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px] font-mono">←</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px] font-mono">→</kbd> 키로 상태 변경
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
