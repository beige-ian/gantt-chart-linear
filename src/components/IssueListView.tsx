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
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
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
import { Input } from './ui/input';
import {
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  SortAsc,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Flag,
  Calendar,
  User,
  Hash,
  ArrowUpDown,
  Trash2,
  Copy,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { SprintTask, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types/sprint';
import { cn } from './ui/utils';
import { StatusBadge, PriorityBadge } from './ui/status-badge';

interface IssueListViewProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onStatusChange: (taskId: string, status: SprintTask['status']) => void;
  onPriorityChange?: (taskId: string, priority: SprintTask['priority']) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkDelete?: (taskIds: string[]) => void;
  onBulkStatusChange?: (taskIds: string[], status: SprintTask['status']) => void;
}

type SortField = 'name' | 'status' | 'priority' | 'assignee' | 'endDate' | 'storyPoints';
type SortDirection = 'asc' | 'desc';

const STATUS_ICONS: Record<SprintTask['status'], React.ReactNode> = {
  backlog: <Circle className="h-4 w-4 text-status-backlog" />,
  todo: <Circle className="h-4 w-4 text-status-todo" strokeWidth={2.5} />,
  in_progress: <Timer className="h-4 w-4 text-status-in-progress" />,
  in_review: <AlertCircle className="h-4 w-4 text-status-in-review" />,
  done: <CheckCircle2 className="h-4 w-4 text-status-done" />,
};

const STATUS_ORDER: SprintTask['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITY_ORDER: SprintTask['priority'][] = ['urgent', 'high', 'medium', 'low', 'none'];

export function IssueListView({
  tasks,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onDeleteTask,
  onBulkDelete,
  onBulkStatusChange,
}: IssueListViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SprintTask['status'] | 'all'>('all');

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

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
  }, [tasks, searchQuery, statusFilter, sortField, sortDirection]);

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

  const getDaysRemaining = (endDate: Date) => {
    const diff = new Date(endDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
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
                <TableCell colSpan={9} className="h-48">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Inbox className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/70">
                      {searchQuery || statusFilter !== 'all'
                        ? '검색 결과가 없습니다'
                        : '이슈가 없습니다'}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {searchQuery || statusFilter !== 'all'
                        ? '다른 검색어나 필터를 시도해보세요'
                        : '새로운 이슈를 추가해보세요'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTasks.map((task) => {
                const daysRemaining = getDaysRemaining(task.endDate);
                const isOverdue = daysRemaining < 0;
                const isSoon = daysRemaining >= 0 && daysRemaining <= 3;

                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      'cursor-pointer group',
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
                              {label}
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
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {onPriorityChange ? (
                        <Select
                          value={task.priority}
                          onValueChange={(value) =>
                            onPriorityChange(task.id, value as SprintTask['priority'])
                          }
                        >
                          <SelectTrigger className="h-7 w-auto border-0 bg-transparent hover:bg-accent px-2 -ml-2 text-xs">
                            <SelectValue>
                              <PriorityBadge priority={task.priority} size="sm" />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_ORDER.map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: PRIORITY_COLORS[priority] }}
                                  />
                                  {PRIORITY_LABELS[priority]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <PriorityBadge priority={task.priority} size="sm" />
                      )}
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
                          isOverdue && 'text-priority-urgent font-medium',
                          isSoon && !isOverdue && 'text-priority-high'
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
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            복제
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
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
            ? ` (전체 ${tasks.length}개 중)`
            : ''}
        </span>
        <span>
          완료: {tasks.filter(t => t.status === 'done').length} / {tasks.length}
        </span>
      </div>
    </div>
  );
}
