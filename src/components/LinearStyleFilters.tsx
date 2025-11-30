import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from './ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Filter,
  X,
  Search,
  ChevronDown,
  Circle,
  Timer,
  AlertCircle,
  CheckCircle2,
  Inbox,
  SignalHigh,
  Signal,
  SignalLow,
  SignalZero,
  Zap,
  User,
  SortAsc,
  SortDesc,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';
import { SprintTask, STATUS_LABELS, PRIORITY_LABELS } from '../types/sprint';
import { cn } from './ui/utils';

export interface LinearFilterOptions {
  search: string;
  status: SprintTask['status'][];
  priority: SprintTask['priority'][];
  assignee: string[];
  labels: string[];
  hasDeadlineSoon: boolean;
  isOverdue: boolean;
}

export interface LinearSortOptions {
  field: 'name' | 'priority' | 'status' | 'endDate' | 'storyPoints' | 'progress' | 'created';
  direction: 'asc' | 'desc';
}

interface LinearStyleFiltersProps {
  filters: LinearFilterOptions;
  sort: LinearSortOptions;
  onFiltersChange: (filters: LinearFilterOptions) => void;
  onSortChange: (sort: LinearSortOptions) => void;
  assignees: string[];
  labels?: string[];
  showStatusFilter?: boolean;
  className?: string;
}

// Status icons matching Linear's style
const STATUS_ICONS: Record<SprintTask['status'], React.ReactNode> = {
  backlog: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  todo: <Circle className="h-3.5 w-3.5 text-status-todo" strokeWidth={2.5} />,
  in_progress: <Timer className="h-3.5 w-3.5 text-status-in-progress" />,
  in_review: <AlertCircle className="h-3.5 w-3.5 text-status-in-review" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-status-done" />,
};

// Priority icons matching Linear's style
const PRIORITY_ICONS: Record<SprintTask['priority'], React.ReactNode> = {
  urgent: <Zap className="h-3.5 w-3.5 text-orange-500" />,
  high: <SignalHigh className="h-3.5 w-3.5 text-priority-high" />,
  medium: <Signal className="h-3.5 w-3.5 text-priority-medium" />,
  low: <SignalLow className="h-3.5 w-3.5 text-priority-low" />,
  none: <SignalZero className="h-3.5 w-3.5 text-muted-foreground" />,
};

const SORT_FIELD_LABELS: Record<LinearSortOptions['field'], string> = {
  name: '이름',
  priority: '우선순위',
  status: '상태',
  endDate: '마감일',
  storyPoints: '포인트',
  progress: '진행률',
  created: '생성일',
};

export function LinearStyleFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  assignees,
  labels = [],
  showStatusFilter = true,
  className,
}: LinearStyleFiltersProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return [
      filters.search ? 1 : 0,
      filters.status.length,
      filters.priority.length,
      filters.assignee.length,
      filters.labels?.length || 0,
      filters.hasDeadlineSoon ? 1 : 0,
      filters.isOverdue ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
  }, [filters]);

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      status: [],
      priority: [],
      assignee: [],
      labels: [],
      hasDeadlineSoon: false,
      isOverdue: false,
    });
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'search':
        onFiltersChange({ ...filters, search: '' });
        break;
      case 'status':
        onFiltersChange({
          ...filters,
          status: filters.status.filter((s) => s !== value),
        });
        break;
      case 'priority':
        onFiltersChange({
          ...filters,
          priority: filters.priority.filter((p) => p !== value),
        });
        break;
      case 'assignee':
        onFiltersChange({
          ...filters,
          assignee: filters.assignee.filter((a) => a !== value),
        });
        break;
      case 'deadline':
        onFiltersChange({ ...filters, hasDeadlineSoon: false });
        break;
      case 'overdue':
        onFiltersChange({ ...filters, isOverdue: false });
        break;
    }
  };

  const toggleStatus = (status: SprintTask['status']) => {
    if (filters.status.includes(status)) {
      onFiltersChange({
        ...filters,
        status: filters.status.filter((s) => s !== status),
      });
    } else {
      onFiltersChange({
        ...filters,
        status: [...filters.status, status],
      });
    }
  };

  const togglePriority = (priority: SprintTask['priority']) => {
    if (filters.priority.includes(priority)) {
      onFiltersChange({
        ...filters,
        priority: filters.priority.filter((p) => p !== priority),
      });
    } else {
      onFiltersChange({
        ...filters,
        priority: [...filters.priority, priority],
      });
    }
  };

  const toggleAssignee = (assignee: string) => {
    if (filters.assignee.includes(assignee)) {
      onFiltersChange({
        ...filters,
        assignee: filters.assignee.filter((a) => a !== assignee),
      });
    } else {
      onFiltersChange({
        ...filters,
        assignee: [...filters.assignee, assignee],
      });
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Filter Bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={filters.search ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1.5 text-xs font-normal',
                filters.search && 'bg-accent'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              {filters.search ? (
                <span className="max-w-[100px] truncate">{filters.search}</span>
              ) : (
                '검색'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                placeholder="이슈 검색..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                autoFocus
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => onFiltersChange({ ...filters, search: '' })}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Status Filter */}
        {showStatusFilter && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={filters.status.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-7 gap-1 text-xs font-normal',
                  filters.status.length > 0 && 'bg-accent'
                )}
              >
                <Circle className="h-3.5 w-3.5" />
                상태
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                    {filters.status.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {(['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const).map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                  className="gap-2"
                >
                  {STATUS_ICONS[status]}
                  <span>{STATUS_LABELS[status]}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.priority.length > 0 ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs font-normal',
                filters.priority.length > 0 && 'bg-accent'
              )}
            >
              <Signal className="h-3.5 w-3.5" />
              우선순위
              {filters.priority.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                  {filters.priority.length}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {(['urgent', 'high', 'medium', 'low', 'none'] as const).map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority}
                checked={filters.priority.includes(priority)}
                onCheckedChange={() => togglePriority(priority)}
                className="gap-2"
              >
                {PRIORITY_ICONS[priority]}
                <span>{PRIORITY_LABELS[priority]}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee Filter */}
        {assignees.length > 0 && (
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filters.assignee.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-7 gap-1 text-xs font-normal',
                  filters.assignee.length > 0 && 'bg-accent'
                )}
              >
                <User className="h-3.5 w-3.5" />
                담당자
                {filters.assignee.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                    {filters.assignee.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="담당자 검색..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="py-2 text-xs text-center">
                    결과 없음
                  </CommandEmpty>
                  <CommandGroup>
                    {assignees.map((assignee) => (
                      <CommandItem
                        key={assignee}
                        onSelect={() => toggleAssignee(assignee)}
                        className="gap-2 text-xs"
                      >
                        <div
                          className={cn(
                            'h-4 w-4 border rounded flex items-center justify-center',
                            filters.assignee.includes(assignee)
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30'
                          )}
                        >
                          {filters.assignee.includes(assignee) && (
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="truncate">{assignee}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* Due Date Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.hasDeadlineSoon || filters.isOverdue ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs font-normal',
                (filters.hasDeadlineSoon || filters.isOverdue) && 'bg-accent'
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              마감일
              {(filters.hasDeadlineSoon || filters.isOverdue) && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                  {(filters.hasDeadlineSoon ? 1 : 0) + (filters.isOverdue ? 1 : 0)}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuCheckboxItem
              checked={filters.hasDeadlineSoon}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, hasDeadlineSoon: !!checked })
              }
              className="gap-2"
            >
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
              <span>마감 임박 (3일)</span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.isOverdue}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, isOverdue: !!checked })
              }
              className="gap-2"
            >
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span>지연됨</span>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-3.5 w-px bg-border/50 mx-1" />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-normal">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {SORT_FIELD_LABELS[sort.field]}
              {sort.direction === 'asc' ? (
                <SortAsc className="h-3 w-3 opacity-50" />
              ) : (
                <SortDesc className="h-3 w-3 opacity-50" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {Object.entries(SORT_FIELD_LABELS).map(([field, label]) => (
              <DropdownMenuItem
                key={field}
                onClick={() => {
                  if (sort.field === field) {
                    onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
                  } else {
                    onSortChange({ field: field as LinearSortOptions['field'], direction: 'asc' });
                  }
                }}
                className={cn('gap-2', sort.field === field && 'bg-accent')}
              >
                <span className="flex-1">{label}</span>
                {sort.field === field && (
                  sort.direction === 'asc' ? (
                    <SortAsc className="h-3.5 w-3.5" />
                  ) : (
                    <SortDesc className="h-3.5 w-3.5" />
                  )
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <>
            <div className="h-3.5 w-px bg-border/50 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-normal text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              초기화
            </Button>
          </>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.search && (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => removeFilter('search')}
            >
              <Search className="h-2.5 w-2.5" />
              "{filters.search}"
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filters.status.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => removeFilter('status', status)}
            >
              {STATUS_ICONS[status]}
              {STATUS_LABELS[status]}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.priority.map((priority) => (
            <Badge
              key={priority}
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => removeFilter('priority', priority)}
            >
              {PRIORITY_ICONS[priority]}
              {PRIORITY_LABELS[priority]}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.assignee.map((assignee) => (
            <Badge
              key={assignee}
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => removeFilter('assignee', assignee)}
            >
              <User className="h-2.5 w-2.5" />
              {assignee}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.hasDeadlineSoon && (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-yellow-500/20 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
              onClick={() => removeFilter('deadline')}
            >
              <AlertCircle className="h-2.5 w-2.5" />
              마감 임박
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filters.isOverdue && (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-red-500/20 bg-red-500/10 text-red-600 border-red-500/20"
              onClick={() => removeFilter('overdue')}
            >
              <AlertCircle className="h-2.5 w-2.5" />
              지연됨
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to apply Linear-style filters and sorting
export function applyLinearFiltersAndSort(
  tasks: SprintTask[],
  filters: LinearFilterOptions,
  sort: LinearSortOptions
): SprintTask[] {
  let result = [...tasks];

  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (task) =>
        task.name.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.assignee?.toLowerCase().includes(searchLower) ||
        task.labels?.some(l => l.toLowerCase().includes(searchLower))
    );
  }

  // Apply status filter
  if (filters.status.length > 0) {
    result = result.filter((task) => filters.status.includes(task.status));
  }

  // Apply priority filter
  if (filters.priority.length > 0) {
    result = result.filter((task) => filters.priority.includes(task.priority));
  }

  // Apply assignee filter
  if (filters.assignee.length > 0) {
    result = result.filter((task) => task.assignee && filters.assignee.includes(task.assignee));
  }

  // Apply labels filter
  if (filters.labels && filters.labels.length > 0) {
    result = result.filter((task) =>
      task.labels?.some(label => filters.labels.includes(label))
    );
  }

  // Apply deadline soon filter (within 3 days)
  if (filters.hasDeadlineSoon) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    result = result.filter((task) => {
      const endDate = new Date(task.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate <= threeDaysFromNow && endDate >= now && task.status !== 'done';
    });
  }

  // Apply overdue filter
  if (filters.isOverdue) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    result = result.filter((task) => {
      const endDate = new Date(task.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate < now && task.status !== 'done';
    });
  }

  // Apply sorting
  const priorityOrder: Record<SprintTask['priority'], number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
  };

  const statusOrder: Record<SprintTask['status'], number> = {
    backlog: 0,
    todo: 1,
    in_progress: 2,
    in_review: 3,
    done: 4,
  };

  result.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'status':
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      case 'endDate':
        comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        break;
      case 'storyPoints':
        comparison = (a.storyPoints || 0) - (b.storyPoints || 0);
        break;
      case 'progress':
        comparison = a.progress - b.progress;
        break;
      case 'created':
        // Use ID as proxy for creation time (IDs are timestamp-based)
        comparison = a.id.localeCompare(b.id);
        break;
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  return result;
}

// Default filter values
export const defaultLinearFilters: LinearFilterOptions = {
  search: '',
  status: [],
  priority: [],
  assignee: [],
  labels: [],
  hasDeadlineSoon: false,
  isOverdue: false,
};

export const defaultLinearSort: LinearSortOptions = {
  field: 'priority',
  direction: 'asc',
};
