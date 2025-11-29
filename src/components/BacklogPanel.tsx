import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  ChevronRight,
  Search,
  Inbox,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Filter,
  MoreHorizontal,
  Trash2,
  Copy,
  Circle,
  Timer,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SprintTask, STATUS_LABELS, PRIORITY_COLORS } from '../types/sprint';
import { cn } from './ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { PriorityBadge } from './ui/status-badge';

interface BacklogPanelProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onTaskAssignToSprint: (taskId: string, sprintId: string) => void;
  onTaskDropFromSprint?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: SprintTask['status']) => void;
  onDeleteTask?: (taskId: string) => void;
  onBulkDelete?: (taskIds: string[]) => void;
  onBulkStatusChange?: (taskIds: string[], status: SprintTask['status']) => void;
  currentSprintId?: string;
}

type SortField = 'name' | 'status' | 'priority' | 'assignee' | 'endDate' | 'storyPoints';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER: SprintTask['priority'][] = ['urgent', 'high', 'medium', 'low', 'none'];
const STATUS_ORDER: SprintTask['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

const STATUS_ICONS: Record<SprintTask['status'], React.ReactNode> = {
  backlog: <Circle className="h-4 w-4 text-status-backlog" />,
  todo: <Circle className="h-4 w-4 text-status-todo" strokeWidth={2.5} />,
  in_progress: <Timer className="h-4 w-4 text-status-in-progress" />,
  in_review: <AlertCircle className="h-4 w-4 text-status-in-review" />,
  done: <CheckCircle2 className="h-4 w-4 text-status-done" />,
};

export function BacklogPanel({
  tasks,
  onTaskClick,
  onTaskAssignToSprint,
  onTaskDropFromSprint,
  onStatusChange,
  onDeleteTask,
  onBulkDelete,
  onBulkStatusChange,
  currentSprintId,
}: BacklogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<SprintTask['status'] | 'all'>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter unassigned tasks (no sprintId)
  const unassignedTasks = useMemo(() => {
    return tasks.filter(task => !task.sprintId);
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = unassignedTasks;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignee?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
          break;
        case 'priority':
          comparison = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
          break;
        case 'assignee':
          comparison = (a.assignee || '').localeCompare(b.assignee || '');
          break;
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'storyPoints':
          comparison = (a.storyPoints || 0) - (b.storyPoints || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [unassignedTasks, searchQuery, statusFilter, sortField, sortDirection]);

  // Calculate total story points
  const totalPoints = useMemo(() => {
    return unassignedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  }, [unassignedTasks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredAndSortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedTasks.size > 0) {
      onBulkDelete(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkStatusChange = (status: SprintTask['status']) => {
    if (onBulkStatusChange && selectedTasks.size > 0) {
      onBulkStatusChange(Array.from(selectedTasks), status);
      setSelectedTasks(new Set());
    }
  };

  const handleDragStart = (e: React.DragEvent, task: SprintTask) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: task.id,
      source: 'backlog',
    }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  // Handle drop from sprint to backlog
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.source === 'sprint' && data.taskId && onTaskDropFromSprint) {
          onTaskDropFromSprint(data.taskId);
          return;
        }
      }
    } catch (err) {
      // Not JSON data, try plain text
    }

    // Try plain text (taskId from SprintBoard)
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onTaskDropFromSprint) {
      onTaskDropFromSprint(taskId);
    }
  };

  const handleQuickAdd = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSprintId) {
      onTaskAssignToSprint(taskId, currentSprintId);
    }
  };

  const getDaysRemaining = (endDate: Date) => {
    const diff = new Date(endDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={cn('cursor-pointer hover:bg-accent/50 select-none', className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // Always show if there's a drop handler (can receive drops from sprint)
  const showPanel = unassignedTasks.length > 0 || onTaskDropFromSprint;

  if (!showPanel) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'bg-secondary/50 rounded-lg border border-border',
          'transition-all duration-300',
          isExpanded ? 'mb-4' : 'mb-3',
          isDragOver && 'ring-2 ring-primary/50 border-primary/50 bg-primary/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'hover:bg-accent/30 transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            isExpanded ? 'rounded-t-lg' : 'rounded-lg'
          )}
        >
          <div className="flex items-center gap-3">
            <ChevronRight className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90'
            )} />
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                미할당 백로그
              </span>
            </div>
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-medium rounded-full">
              {unassignedTasks.length}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {totalPoints > 0 && (
              <Badge variant="outline" className="h-5 text-[10px] font-normal">
                {totalPoints} pts
              </Badge>
            )}
          </div>
        </button>

        {/* Content */}
        <div className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="px-4 pb-4 space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이슈 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as SprintTask['status'] | 'all')}
                >
                  <SelectTrigger className="w-[140px] h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          {STATUS_ICONS[status]}
                          {STATUS_LABELS[status]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {selectedTasks.size > 0 && (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
                  <span className="text-sm text-muted-foreground">
                    {selectedTasks.size}개 선택됨
                  </span>
                  {onBulkStatusChange && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          상태 변경
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {STATUS_ORDER.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleBulkStatusChange(status)}
                          >
                            <div className="flex items-center gap-2">
                              {STATUS_ICONS[status]}
                              {STATUS_LABELS[status]}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {onBulkDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          filteredAndSortedTasks.length > 0 &&
                          selectedTasks.size === filteredAndSortedTasks.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="전체 선택"
                      />
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                    <SortableHeader field="name" className="min-w-[200px]">
                      이슈
                    </SortableHeader>
                    <SortableHeader field="status" className="w-[120px]">
                      상태
                    </SortableHeader>
                    <SortableHeader field="priority" className="w-[100px]">
                      우선순위
                    </SortableHeader>
                    <SortableHeader field="assignee" className="w-[120px]">
                      담당자
                    </SortableHeader>
                    <SortableHeader field="endDate" className="w-[100px]">
                      마감일
                    </SortableHeader>
                    <SortableHeader field="storyPoints" className="w-[80px]">
                      포인트
                    </SortableHeader>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        {searchQuery || statusFilter !== 'all'
                          ? '검색 결과가 없습니다'
                          : '미할당 이슈가 없습니다'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTasks.map((task) => {
                      const daysRemaining = getDaysRemaining(task.endDate);
                      const isOverdue = daysRemaining < 0;
                      const isSoon = daysRemaining >= 0 && daysRemaining <= 3;
                      const isDragging = draggedTaskId === task.id;

                      return (
                        <TableRow
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'cursor-pointer group',
                            isDragging && 'opacity-50',
                            selectedTasks.has(task.id) && 'bg-accent/50'
                          )}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedTasks.has(task.id)}
                              onCheckedChange={() => handleSelectTask(task.id)}
                              aria-label={`${task.name} 선택`}
                            />
                          </TableCell>
                          <TableCell onClick={() => onTaskClick(task)}>
                            <div
                              className="w-1.5 h-6 rounded-full"
                              style={{ backgroundColor: task.color }}
                            />
                          </TableCell>
                          <TableCell onClick={() => onTaskClick(task)}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{task.name}</span>
                              {task.linearIssueId && (
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  Linear
                                </Badge>
                              )}
                            </div>
                            {task.labels && task.labels.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {task.labels.slice(0, 2).map((label, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground"
                                  >
                                    {typeof label === 'object' ? label.name : label}
                                  </span>
                                ))}
                                {task.labels.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{task.labels.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {onStatusChange ? (
                              <Select
                                value={task.status}
                                onValueChange={(value) =>
                                  onStatusChange(task.id, value as SprintTask['status'])
                                }
                              >
                                <SelectTrigger className="h-7 w-auto border-0 bg-transparent hover:bg-accent px-2 -ml-2 text-xs">
                                  <SelectValue>
                                    <div className="flex items-center gap-1.5">
                                      {STATUS_ICONS[task.status]}
                                      <span className="hidden sm:inline">
                                        {STATUS_LABELS[task.status]}
                                      </span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_ORDER.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      <div className="flex items-center gap-2">
                                        {STATUS_ICONS[status]}
                                        {STATUS_LABELS[status]}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {STATUS_ICONS[task.status]}
                                <span className="text-xs hidden sm:inline">
                                  {STATUS_LABELS[task.status]}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell onClick={() => onTaskClick(task)}>
                            <PriorityBadge priority={task.priority} size="sm" />
                          </TableCell>
                          <TableCell onClick={() => onTaskClick(task)}>
                            {task.assignee ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {task.assignee.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate hidden sm:inline">
                                  {task.assignee}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell onClick={() => onTaskClick(task)}>
                            <span
                              className={cn(
                                'text-xs',
                                isOverdue && 'text-red-500 font-medium',
                                isSoon && !isOverdue && 'text-orange-500'
                              )}
                            >
                              {format(task.endDate, 'M/d', { locale: ko })}
                            </span>
                          </TableCell>
                          <TableCell onClick={() => onTaskClick(task)}>
                            {task.storyPoints !== undefined && task.storyPoints > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                {task.storyPoints}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onTaskClick(task)}>
                                  상세 보기
                                </DropdownMenuItem>
                                {currentSprintId && (
                                  <DropdownMenuItem onClick={(e) => handleQuickAdd(task.id, e as any)}>
                                    <ArrowUpRight className="h-4 w-4 mr-2" />
                                    스프린트에 추가
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  복제
                                </DropdownMenuItem>
                                {onDeleteTask && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => onDeleteTask(task.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                총 {filteredAndSortedTasks.length}개 이슈
                {searchQuery || statusFilter !== 'all'
                  ? ` (전체 ${unassignedTasks.length}개 중)`
                  : ''}
              </span>
              <span>
                {currentSprintId && '드래그하여 스프린트에 추가 | '}
                완료: {unassignedTasks.filter(t => t.status === 'done').length} / {unassignedTasks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Empty state drop zone */}
        {unassignedTasks.length === 0 && isExpanded && (
          <div className="px-4 pb-4">
            <div
              className={cn(
                'flex flex-col items-center justify-center py-12 rounded-lg border-2 border-dashed transition-all',
                isDragOver
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/50 text-muted-foreground'
              )}
            >
              <Inbox className={cn(
                'h-10 w-10 mb-3 transition-transform',
                isDragOver && 'scale-110'
              )} />
              <p className="text-sm font-medium">
                {isDragOver ? '여기에 놓으세요' : '백로그가 비어있습니다'}
              </p>
              <p className="text-xs mt-1 opacity-70">
                {isDragOver ? '태스크를 백로그로 이동합니다' : '스프린트에서 태스크를 드래그하여 이동하세요'}
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
