import React from 'react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Filter, SortAsc, SortDesc, X, Search } from 'lucide-react';
import { SprintTask } from '../types/sprint';

export interface TaskFilterOptions {
  search: string;
  priority: SprintTask['priority'][];
  assignee: string[];
  hasDeadlineSoon: boolean;
  isOverdue: boolean;
}

export interface TaskSortOptions {
  field: 'name' | 'priority' | 'endDate' | 'storyPoints' | 'progress';
  direction: 'asc' | 'desc';
}

interface TaskFiltersProps {
  filters: TaskFilterOptions;
  sort: TaskSortOptions;
  onFiltersChange: (filters: TaskFilterOptions) => void;
  onSortChange: (sort: TaskSortOptions) => void;
  assignees: string[];
}

const priorityLabels: Record<SprintTask['priority'], string> = {
  urgent: '긴급',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const sortFieldLabels: Record<TaskSortOptions['field'], string> = {
  name: '이름',
  priority: '우선순위',
  endDate: '마감일',
  storyPoints: '스토리 포인트',
  progress: '진행률',
};

export function TaskFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  assignees,
}: TaskFiltersProps) {
  const activeFilterCount = [
    filters.search ? 1 : 0,
    filters.priority.length,
    filters.assignee.length,
    filters.hasDeadlineSoon ? 1 : 0,
    filters.isOverdue ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const resetFilters = () => {
    onFiltersChange({
      search: '',
      priority: [],
      assignee: [],
      hasDeadlineSoon: false,
      isOverdue: false,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="검색..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-8 h-9 w-40 sm:w-48"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => onFiltersChange({ ...filters, search: '' })}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">필터</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">필터</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
                  초기화
                </Button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label className="text-sm">우선순위</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => (
                  <div key={priority} className="flex items-center gap-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priority.includes(priority)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onFiltersChange({
                            ...filters,
                            priority: [...filters.priority, priority],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            priority: filters.priority.filter((p) => p !== priority),
                          });
                        }
                      }}
                    />
                    <label htmlFor={`priority-${priority}`} className="text-sm cursor-pointer">
                      {priorityLabels[priority]}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            {assignees.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">담당자</Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {assignees.map((assignee) => (
                    <div key={assignee} className="flex items-center gap-2">
                      <Checkbox
                        id={`assignee-${assignee}`}
                        checked={filters.assignee.includes(assignee)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onFiltersChange({
                              ...filters,
                              assignee: [...filters.assignee, assignee],
                            });
                          } else {
                            onFiltersChange({
                              ...filters,
                              assignee: filters.assignee.filter((a) => a !== assignee),
                            });
                          }
                        }}
                      />
                      <label htmlFor={`assignee-${assignee}`} className="text-sm cursor-pointer truncate">
                        {assignee}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deadline Filters */}
            <div className="space-y-2">
              <Label className="text-sm">마감일</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="deadline-soon"
                    checked={filters.hasDeadlineSoon}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, hasDeadlineSoon: !!checked })
                    }
                  />
                  <label htmlFor="deadline-soon" className="text-sm cursor-pointer">
                    마감 임박 (3일 이내)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="overdue"
                    checked={filters.isOverdue}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, isOverdue: !!checked })
                    }
                  />
                  <label htmlFor="overdue" className="text-sm cursor-pointer">
                    지연됨
                  </label>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Select */}
      <div className="flex items-center gap-1">
        <Select
          value={sort.field}
          onValueChange={(value) => onSortChange({ ...sort, field: value as TaskSortOptions['field'] })}
        >
          <SelectTrigger className="h-9 w-32 sm:w-36">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortFieldLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() =>
            onSortChange({
              ...sort,
              direction: sort.direction === 'asc' ? 'desc' : 'asc',
            })
          }
        >
          {sort.direction === 'asc' ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Helper function to apply filters and sorting
export function applyTaskFiltersAndSort(
  tasks: SprintTask[],
  filters: TaskFilterOptions,
  sort: TaskSortOptions
): SprintTask[] {
  let result = [...tasks];

  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (task) =>
        task.name.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.assignee?.toLowerCase().includes(searchLower)
    );
  }

  // Apply priority filter
  if (filters.priority.length > 0) {
    result = result.filter((task) => filters.priority.includes(task.priority));
  }

  // Apply assignee filter
  if (filters.assignee.length > 0) {
    result = result.filter((task) => task.assignee && filters.assignee.includes(task.assignee));
  }

  // Apply deadline soon filter
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
      case 'endDate':
        comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        break;
      case 'storyPoints':
        comparison = (a.storyPoints || 0) - (b.storyPoints || 0);
        break;
      case 'progress':
        comparison = a.progress - b.progress;
        break;
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  return result;
}
