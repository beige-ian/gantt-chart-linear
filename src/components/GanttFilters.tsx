import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
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
  Users,
  Layers,
  BarChart3,
  CircleDashed,
  Check,
} from 'lucide-react';
import { cn } from './ui/utils';

export type GanttStatusFilter = 'completed' | 'in-progress' | 'not-started';
export type GanttGroupBy = 'none' | 'assignee' | 'priority' | 'team' | 'status';

interface GanttFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatuses: GanttStatusFilter[];
  onStatusesChange: (statuses: GanttStatusFilter[]) => void;
  filterAssignees: string[];
  onAssigneesChange: (assignees: string[]) => void;
  filterPriorities: string[];
  onPrioritiesChange: (priorities: string[]) => void;
  filterTeams: string[];
  onTeamsChange: (teams: string[]) => void;
  groupBy: GanttGroupBy;
  onGroupByChange: (groupBy: GanttGroupBy) => void;
  showStats: boolean;
  onShowStatsChange: (show: boolean) => void;
  assignees: string[];
  teams: string[];
  className?: string;
}

const STATUS_CONFIG: Record<GanttStatusFilter, { icon: React.ReactNode; label: string; color?: string }> = {
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-status-done" />, label: '완료', color: 'text-status-done' },
  'in-progress': { icon: <Timer className="h-3.5 w-3.5 text-status-in-progress" />, label: '진행중', color: 'text-status-in-progress' },
  'not-started': { icon: <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />, label: '시작전', color: 'text-muted-foreground' },
};

const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
  urgent: { icon: <Zap className="h-3.5 w-3.5 text-red-500" />, label: '긴급', dotColor: 'bg-red-500' },
  high: { icon: <SignalHigh className="h-3.5 w-3.5 text-orange-500" />, label: '높음', dotColor: 'bg-orange-500' },
  medium: { icon: <Signal className="h-3.5 w-3.5 text-yellow-500" />, label: '보통', dotColor: 'bg-yellow-500' },
  low: { icon: <SignalLow className="h-3.5 w-3.5 text-green-500" />, label: '낮음', dotColor: 'bg-green-500' },
  none: { icon: <SignalZero className="h-3.5 w-3.5 text-muted-foreground" />, label: '없음', dotColor: 'bg-gray-400' },
};

const GROUP_CONFIG: Record<GanttGroupBy, { icon: React.ReactNode; label: string }> = {
  none: { icon: <Layers className="h-3.5 w-3.5" />, label: '그룹 없음' },
  assignee: { icon: <User className="h-3.5 w-3.5" />, label: '담당자별' },
  priority: { icon: <Signal className="h-3.5 w-3.5" />, label: '우선순위별' },
  team: { icon: <Layers className="h-3.5 w-3.5" />, label: '팀별' },
  status: { icon: <Circle className="h-3.5 w-3.5" />, label: '상태별' },
};

export function GanttFilters({
  searchQuery, onSearchChange,
  filterStatuses, onStatusesChange,
  filterAssignees, onAssigneesChange,
  filterPriorities, onPrioritiesChange,
  filterTeams, onTeamsChange,
  groupBy, onGroupByChange,
  showStats, onShowStatsChange,
  assignees, teams, className,
}: GanttFiltersProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const toggleStatus = (status: GanttStatusFilter) => {
    if (filterStatuses.includes(status)) {
      onStatusesChange(filterStatuses.filter(s => s !== status));
    } else {
      onStatusesChange([...filterStatuses, status]);
    }
  };

  const togglePriority = (priority: string) => {
    if (filterPriorities.includes(priority)) {
      onPrioritiesChange(filterPriorities.filter(p => p !== priority));
    } else {
      onPrioritiesChange([...filterPriorities, priority]);
    }
  };

  const toggleAssignee = (assignee: string) => {
    if (filterAssignees.includes(assignee)) {
      onAssigneesChange(filterAssignees.filter(a => a !== assignee));
    } else {
      onAssigneesChange([...filterAssignees, assignee]);
    }
  };

  const toggleTeam = (team: string) => {
    if (filterTeams.includes(team)) {
      onTeamsChange(filterTeams.filter(t => t !== team));
    } else {
      onTeamsChange([...filterTeams, team]);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery || filterStatuses.length > 0 || filterAssignees.length > 0 || filterPriorities.length > 0 || filterTeams.length > 0;
  }, [searchQuery, filterStatuses, filterAssignees, filterPriorities, filterTeams]);

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusesChange([]);
    onAssigneesChange([]);
    onPrioritiesChange([]);
    onTeamsChange([]);
  };

  const getStatusButtonText = () => {
    if (filterStatuses.length === 0) return '상태';
    if (filterStatuses.length === 1) return STATUS_CONFIG[filterStatuses[0]].label;
    return `상태 ${filterStatuses.length}개`;
  };

  const getPriorityButtonText = () => {
    if (filterPriorities.length === 0) return '우선순위';
    if (filterPriorities.length === 1) return PRIORITY_CONFIG[filterPriorities[0]]?.label;
    return `우선순위 ${filterPriorities.length}개`;
  };

  const getAssigneeButtonText = () => {
    if (filterAssignees.length === 0) return '담당자';
    if (filterAssignees.length === 1) return filterAssignees[0] === 'unassigned' ? '미지정' : filterAssignees[0];
    return `담당자 ${filterAssignees.length}명`;
  };

  const getTeamButtonText = () => {
    if (filterTeams.length === 0) return '팀';
    if (filterTeams.length === 1) return filterTeams[0];
    return `팀 ${filterTeams.length}개`;
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1 flex-wrap">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant={searchQuery ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 gap-1 text-xs font-normal', searchQuery && 'bg-accent')}>
              <Search className="h-3.5 w-3.5" />
              {searchQuery ? <span className="max-w-[80px] truncate">{searchQuery}</span> : '검색'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="text" className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground" placeholder="태스크 검색..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} autoFocus />
              {searchQuery && <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onSearchChange('')}><X className="h-3 w-3" /></Button>}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={filterStatuses.length > 0 ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 gap-1 text-xs font-normal', filterStatuses.length > 0 && 'bg-accent')}>
              {filterStatuses.length === 1 ? STATUS_CONFIG[filterStatuses[0]].icon : <Circle className="h-3.5 w-3.5" />}
              {getStatusButtonText()}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {(['completed', 'in-progress', 'not-started'] as const).map((status) => (
              <DropdownMenuCheckboxItem key={status} checked={filterStatuses.includes(status)} onCheckedChange={() => toggleStatus(status)} className="gap-2">
                {STATUS_CONFIG[status].icon}
                <span>{STATUS_CONFIG[status].label}</span>
              </DropdownMenuCheckboxItem>
            ))}
            {filterStatuses.length > 0 && (<><DropdownMenuSeparator /><DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onStatusesChange([])} className="text-muted-foreground">초기화</DropdownMenuCheckboxItem></>)}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={filterPriorities.length > 0 ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 gap-1 text-xs font-normal', filterPriorities.length > 0 && 'bg-accent')}>
              {filterPriorities.length === 1 ? PRIORITY_CONFIG[filterPriorities[0]]?.icon : <Signal className="h-3.5 w-3.5" />}
              {getPriorityButtonText()}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {(['urgent', 'high', 'medium', 'low', 'none'] as const).map((priority) => (
              <DropdownMenuCheckboxItem key={priority} checked={filterPriorities.includes(priority)} onCheckedChange={() => togglePriority(priority)} className="gap-2">
                <span className={cn('w-2 h-2 rounded-full', PRIORITY_CONFIG[priority].dotColor)} />
                <span>{PRIORITY_CONFIG[priority].label}</span>
              </DropdownMenuCheckboxItem>
            ))}
            {filterPriorities.length > 0 && (<><DropdownMenuSeparator /><DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onPrioritiesChange([])} className="text-muted-foreground">초기화</DropdownMenuCheckboxItem></>)}
          </DropdownMenuContent>
        </DropdownMenu>

        {assignees.length > 0 && (
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <Button variant={filterAssignees.length > 0 ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 gap-1 text-xs font-normal', filterAssignees.length > 0 && 'bg-accent')}>
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[80px] truncate">{getAssigneeButtonText()}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="담당자 검색..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="py-2 text-xs text-center">결과 없음</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => toggleAssignee('unassigned')} className="gap-2 text-xs">
                      <div className={cn('h-4 w-4 border rounded flex items-center justify-center', filterAssignees.includes('unassigned') ? 'bg-primary border-primary' : 'border-input')}>
                        {filterAssignees.includes('unassigned') && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>미지정</span>
                    </CommandItem>
                    <DropdownMenuSeparator />
                    {assignees.map((assignee) => (
                      <CommandItem key={assignee} onSelect={() => toggleAssignee(assignee)} className="gap-2 text-xs">
                        <div className={cn('h-4 w-4 border rounded flex items-center justify-center', filterAssignees.includes(assignee) ? 'bg-primary border-primary' : 'border-input')}>
                          {filterAssignees.includes(assignee) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">{assignee.charAt(0).toUpperCase()}</div>
                        <span className="truncate">{assignee}</span>
                      </CommandItem>
                    ))}
                    {filterAssignees.length > 0 && (<><DropdownMenuSeparator /><CommandItem onSelect={() => { onAssigneesChange([]); setAssigneeOpen(false); }} className="gap-2 text-xs text-muted-foreground">초기화</CommandItem></>)}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {teams.length > 0 && (
          <Popover open={teamOpen} onOpenChange={setTeamOpen}>
            <PopoverTrigger asChild>
              <Button variant={filterTeams.length > 0 ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 gap-1 text-xs font-normal', filterTeams.length > 0 && 'bg-accent')}>
                <Users className="h-3.5 w-3.5" />
                <span className="max-w-[80px] truncate">{getTeamButtonText()}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="팀 검색..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="py-2 text-xs text-center">결과 없음</CommandEmpty>
                  <CommandGroup>
                    {teams.map((team) => (
                      <CommandItem key={team} onSelect={() => toggleTeam(team)} className="gap-2 text-xs">
                        <div className={cn('h-4 w-4 border rounded flex items-center justify-center', filterTeams.includes(team) ? 'bg-primary border-primary' : 'border-input')}>
                          {filterTeams.includes(team) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold">{team.charAt(0).toUpperCase()}</div>
                        <span className="truncate">{team}</span>
                      </CommandItem>
                    ))}
                    {filterTeams.length > 0 && (<><DropdownMenuSeparator /><CommandItem onSelect={() => { onTeamsChange([]); setTeamOpen(false); }} className="gap-2 text-xs text-muted-foreground">초기화</CommandItem></>)}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        <div className="h-3.5 w-px bg-border/50 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={groupBy !== 'none' ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 gap-1 text-xs font-normal', groupBy !== 'none' && 'bg-accent')}>
              <Layers className="h-3.5 w-3.5" />
              {groupBy === 'none' ? '그룹' : GROUP_CONFIG[groupBy].label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(['none', 'assignee', 'priority', 'team', 'status'] as const).map((group) => (
              <DropdownMenuCheckboxItem key={group} checked={groupBy === group} onCheckedChange={() => onGroupByChange(group)} className="gap-2">
                {GROUP_CONFIG[group].icon}
                <span>{GROUP_CONFIG[group].label}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant={showStats ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1 text-xs font-normal" onClick={() => onShowStatsChange(!showStats)}>
          <BarChart3 className="h-3.5 w-3.5" />
          통계
        </Button>

        {hasActiveFilters && (
          <>
            <div className="h-3.5 w-px bg-border/50 mx-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs font-normal text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
              <X className="h-3.5 w-3.5 mr-1" />
              초기화
            </Button>
          </>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {searchQuery && (
            <Badge variant="outline" className="h-6 gap-1.5 pl-2 pr-1 text-xs font-medium bg-muted/50 border-border/60 cursor-pointer hover:bg-muted transition-colors group" onClick={() => onSearchChange('')}>
              <Search className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">"{searchQuery}"</span>
              <span className="h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-destructive" />
              </span>
            </Badge>
          )}
          {filterStatuses.map(status => (
            <Badge key={status} variant="outline" className="h-6 gap-1.5 pl-2 pr-1 text-xs font-medium bg-muted/50 border-border/60 cursor-pointer hover:bg-muted transition-colors group" onClick={() => toggleStatus(status)}>
              {STATUS_CONFIG[status].icon}
              <span className={STATUS_CONFIG[status].color}>{STATUS_CONFIG[status].label}</span>
              <span className="h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-destructive" />
              </span>
            </Badge>
          ))}
          {filterPriorities.map(priority => (
            <Badge key={priority} variant="outline" className="h-6 gap-1.5 pl-2 pr-1 text-xs font-medium bg-muted/50 border-border/60 cursor-pointer hover:bg-muted transition-colors group" onClick={() => togglePriority(priority)}>
              <span className={cn('w-2 h-2 rounded-full', PRIORITY_CONFIG[priority]?.dotColor)} />
              <span className="text-foreground">{PRIORITY_CONFIG[priority]?.label}</span>
              <span className="h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-destructive" />
              </span>
            </Badge>
          ))}
          {filterAssignees.map(assignee => (
            <Badge key={assignee} variant="outline" className="h-6 gap-1.5 pl-2 pr-1 text-xs font-medium bg-muted/50 border-border/60 cursor-pointer hover:bg-muted transition-colors group" onClick={() => toggleAssignee(assignee)}>
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">{assignee === 'unassigned' ? '미지정' : assignee}</span>
              <span className="h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-destructive" />
              </span>
            </Badge>
          ))}
          {filterTeams.map(team => (
            <Badge key={team} variant="outline" className="h-6 gap-1.5 pl-2 pr-1 text-xs font-medium bg-muted/50 border-border/60 cursor-pointer hover:bg-muted transition-colors group" onClick={() => toggleTeam(team)}>
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">{team}</span>
              <span className="h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-destructive" />
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
