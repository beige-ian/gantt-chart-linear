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
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import {
  ChevronRight,
  Search,
  Inbox,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { SprintTask, STATUS_LABELS, PRIORITY_COLORS } from '../types/sprint';
import { cn } from './ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { PriorityBadge } from './ui/status-badge';

interface BacklogPanelProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onTaskAssignToSprint: (taskId: string, sprintId: string) => void;
  currentSprintId?: string;
}

type SortField = 'name' | 'priority' | 'assignee' | 'endDate' | 'storyPoints';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER: SprintTask['priority'][] = ['urgent', 'high', 'medium', 'low', 'none'];

export function BacklogPanel({
  tasks,
  onTaskClick,
  onTaskAssignToSprint,
  currentSprintId,
}: BacklogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

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

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
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
  }, [unassignedTasks, searchQuery, sortField, sortDirection]);

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

  if (unassignedTasks.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'bg-secondary/50 rounded-lg border border-border',
        'transition-all duration-300',
        isExpanded ? 'mb-4' : 'mb-3'
      )}>
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
            {/* Search Bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이슈 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10"></TableHead>
                    <SortableHeader field="name" className="min-w-[200px]">
                      이슈
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
                    {currentSprintId && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={currentSprintId ? 7 : 6} className="h-24 text-center text-muted-foreground">
                        {searchQuery ? '검색 결과가 없습니다' : '미할당 이슈가 없습니다'}
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
                            isDragging && 'opacity-50'
                          )}
                          onClick={() => onTaskClick(task)}
                        >
                          <TableCell>
                            <div
                              className="w-1.5 h-6 rounded-full"
                              style={{ backgroundColor: task.color }}
                            />
                          </TableCell>
                          <TableCell>
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
                          <TableCell>
                            <PriorityBadge priority={task.priority} size="sm" />
                          </TableCell>
                          <TableCell>
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
                          <TableCell>
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
                          <TableCell>
                            {task.storyPoints !== undefined && task.storyPoints > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                {task.storyPoints}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                          {currentSprintId && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => handleQuickAdd(task.id, e)}
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>스프린트에 추가</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          )}
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
                {searchQuery ? ` (전체 ${unassignedTasks.length}개 중)` : ''}
              </span>
              {currentSprintId && (
                <span>드래그하여 스프린트에 추가</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
