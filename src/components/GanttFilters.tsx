import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
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
  X,
  Search,
  ChevronDown,
  Circle,
  CheckCircle2,
  Timer,
  SignalHigh,
  Signal,
  SignalLow,
  SignalZero,
  Zap,
  User,
  Layers,
  BarChart3,
  CircleDashed,
} from 'lucide-react';
import { cn } from './ui/utils';

export type GanttStatusFilter = 'all' | 'completed' | 'in-progress' | 'not-started';
export type GanttGroupBy = 'none' | 'assignee' | 'priority' | 'team' | 'status';

interface GanttFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: GanttStatusFilter;
  onStatusChange: (status: GanttStatusFilter) => void;
  filterAssignee: string;
  onAssigneeChange: (assignee: string) => void;
  filterPriority: string;
  onPriorityChange: (priority: string) => void;
  groupBy: GanttGroupBy;
  onGroupByChange: (groupBy: GanttGroupBy) => void;
  showStats: boolean;
  onShowStatsChange: (show: boolean) => void;
  assignees: string[];
  className?: string;
}

// Status icons
const STATUS_CONFIG: Record<GanttStatusFilter, { icon: React.ReactNode; label: string; color?: string }> = {
  all: { icon: <Circle className="h-3.5 w-3.5" />, label: '전체' },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-status-done" />, label: '완료', color: 'text-status-done' },
  'in-progress': { icon: <Timer className="h-3.5 w-3.5 text-status-in-progress" />, label: '진행중', color: 'text-status-in-progress' },
  'not-started': { icon: <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />, label: '시작전', color: 'text-muted-foreground' },
};

// Priority config
const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
  all: { icon: <Signal className="h-3.5 w-3.5" />, label: '전체', dotColor: '' },
  urgent: { icon: <Zap className="h-3.5 w-3.5 text-red-500" />, label: '긴급', dotColor: 'bg-red-500' },
  high: { icon: <SignalHigh className="h-3.5 w-3.5 text-orange-500" />, label: '높음', dotColor: 'bg-orange-500' },
  medium: { icon: <Signal className="h-3.5 w-3.5 text-yellow-500" />, label: '보통', dotColor: 'bg-yellow-500' },
  low: { icon: <SignalLow className="h-3.5 w-3.5 text-green-500" />, label: '낮음', dotColor: 'bg-green-500' },
  none: { icon: <SignalZero className="h-3.5 w-3.5 text-muted-foreground" />, label: '없음', dotColor: 'bg-gray-400' },
};

// Group by config
const GROUP_CONFIG: Record<GanttGroupBy, { icon: React.ReactNode; label: string }> = {
  none: { icon: <Layers className="h-3.5 w-3.5" />, label: '그룹 없음' },
  assignee: { icon: <User className="h-3.5 w-3.5" />, label: '담당자별' },
  priority: { icon: <Signal className="h-3.5 w-3.5" />, label: '우선순위별' },
  team: { icon: <Layers className="h-3.5 w-3.5" />, label: '팀별' },
  status: { icon: <Circle className="h-3.5 w-3.5" />, label: '상태별' },
};

export function GanttFilters({
  searchQuery,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterAssignee,
  onAssigneeChange,
  filterPriority,
  onPriorityChange,
  groupBy,
  onGroupByChange,
  showStats,
  onShowStatsChange,
  assignees,
  className,
}: GanttFiltersProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery || filterStatus !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all';
  }, [searchQuery, filterStatus, filterAssignee, filterPriority]);

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onAssigneeChange('all');
    onPriorityChange('all');
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Filter Bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={searchQuery ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs font-normal',
                searchQuery && 'bg-accent'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              {searchQuery ? (
                <span className="max-w-[80px] truncate">{searchQuery}</span>
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
                placeholder="태스크 검색..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filterStatus !== 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs font-normal',
                filterStatus !== 'all' && 'bg-accent'
              )}
            >
              {STATUS_CONFIG[filterStatus].icon}
              {filterStatus === 'all' ? '상태' : STATUS_CONFIG[filterStatus].label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(['all', 'completed', 'in-progress', 'not-started'] as const).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onStatusChange(status)}
                className={cn('gap-2', filterStatus === status && 'bg-accent')}
              >
                {STATUS_CONFIG[status].icon}
                <span>{STATUS_CONFIG[status].label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filterPriority !== 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs font-normal',
                filterPriority !== 'all' && 'bg-accent'
              )}
            >
              {PRIORITY_CONFIG[filterPriority]?.icon || <Signal className="h-3.5 w-3.5" />}
              {filterPriority === 'all' ? '우선순위' : PRIORITY_CONFIG[filterPriority]?.label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(['all', 'urgent', 'high', 'medium', 'low', 'none'] as const).map((priority) => (
              <DropdownMenuItem
                key={priority}
                onClick={() => onPriorityChange(priority)}
                className={cn('gap-2', filterPriority === priority && 'bg-accent')}
              >
                {priority !== 'all' && (
                  <span className={cn('w-2 h-2 rounded-full', PRIORITY_CONFIG[priority].dotColor)} />
                )}
                {priority === 'all' && PRIORITY_CONFIG[priority].icon}
                <span>{PRIORITY_CONFIG[priority].label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee Filter */}
        {assignees.length > 0 && (
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterAssignee !== 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-7 gap-1 text-xs font-normal',
                  filterAssignee !== 'all' && 'bg-accent'
                )}
              >
                <User className="h-3.5 w-3.5" />
                {filterAssignee === 'all' ? '담당자' : (
                  filterAssignee === 'unassigned' ? '미지정' : (
                    <span className="max-w-[60px] truncate">{filterAssignee}</span>
                  )
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
                    <CommandItem
                      onSelect={() => {
                        onAssigneeChange('all');
                        setAssigneeOpen(false);
                      }}
                      className={cn('gap-2 text-xs', filterAssignee === 'all' && 'bg-accent')}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>전체 담당자</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        onAssigneeChange('unassigned');
                        setAssigneeOpen(false);
                      }}
                      className={cn('gap-2 text-xs', filterAssignee === 'unassigned' && 'bg-accent')}
                    >
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>미지정</span>
                    </CommandItem>
                    <DropdownMenuSeparator />
                    {assignees.map((assignee) => (
                      <CommandItem
                        key={assignee}
                        onSelect={() => {
                          onAssigneeChange(assignee);
                          setAssigneeOpen(false);
                        }}
                        className={cn('gap-2 text-xs', filterAssignee === assignee && 'bg-accent')}
                      >
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                          {assignee.charAt(0).toUpperCase()}
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

        {/* Divider */}
        <div className="h-3.5 w-px bg-border/50 mx-1" />

        {/* Group By */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={groupBy !== 'none' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs font-normal',
                groupBy !== 'none' && 'bg-accent'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              {groupBy === 'none' ? '그룹' : GROUP_CONFIG[groupBy].label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(['none', 'assignee', 'priority', 'team', 'status'] as const).map((group) => (
              <DropdownMenuItem
                key={group}
                onClick={() => onGroupByChange(group)}
                className={cn('gap-2', groupBy === group && 'bg-accent')}
              >
                {GROUP_CONFIG[group].icon}
                <span>{GROUP_CONFIG[group].label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stats Toggle */}
        <Button
          variant={showStats ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 gap-1 text-xs font-normal"
          onClick={() => onShowStatsChange(!showStats)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          통계
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
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
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {searchQuery && (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => onSearchChange('')}
            >
              <Search className="h-2.5 w-2.5" />
              "{searchQuery}"
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Badge
              variant="secondary"
              className={cn(
                'h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80',
                STATUS_CONFIG[filterStatus].color
              )}
              onClick={() => onStatusChange('all')}
            >
              {STATUS_CONFIG[filterStatus].icon}
              {STATUS_CONFIG[filterStatus].label}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filterPriority !== 'all' && (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => onPriorityChange('all')}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_CONFIG[filterPriority]?.dotColor)} />
              {PRIORITY_CONFIG[filterPriority]?.label}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filterAssignee !== 'all' && (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 pl-1.5 pr-0.5 text-[11px] font-normal cursor-pointer hover:bg-accent/80"
              onClick={() => onAssigneeChange('all')}
            >
              <User className="h-2.5 w-2.5" />
              {filterAssignee === 'unassigned' ? '미지정' : filterAssignee}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
