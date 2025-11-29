import React, { useState } from 'react';
import {
  Layers,
  GanttChartSquare,
  LayoutDashboard,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Tag,
  Home,
  Inbox,
  FolderKanban,
  Target,
  Repeat,
  BarChart3,
  CheckCircle2,
  Circle,
  Timer,
  Zap,
  Command,
} from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface AppSidebarProps {
  activeView: 'sprint' | 'timeline' | 'dashboard';
  onViewChange: (view: 'sprint' | 'timeline' | 'dashboard') => void;
  onCommandPaletteOpen: () => void;
  onCreateTask: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

export function AppSidebar({
  activeView,
  onViewChange,
  onCommandPaletteOpen,
  onCreateTask,
  collapsed = false,
  onCollapsedChange,
}: AppSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    views: true,
    projects: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const mainNavItems: NavItem[] = [
    {
      id: 'inbox',
      label: '인박스',
      icon: <Inbox className="h-4 w-4" />,
      badge: 3,
    },
    {
      id: 'my-issues',
      label: '내 이슈',
      icon: <CheckCircle2 className="h-4 w-4" />,
      badge: 12,
    },
  ];

  const viewItems: NavItem[] = [
    {
      id: 'sprint',
      label: '스프린트 보드',
      icon: <Layers className="h-4 w-4" />,
      shortcut: '⌘1',
      active: activeView === 'sprint',
      onClick: () => onViewChange('sprint'),
    },
    {
      id: 'timeline',
      label: '타임라인',
      icon: <GanttChartSquare className="h-4 w-4" />,
      shortcut: '⌘2',
      active: activeView === 'timeline',
      onClick: () => onViewChange('timeline'),
    },
    {
      id: 'dashboard',
      label: '대시보드',
      icon: <LayoutDashboard className="h-4 w-4" />,
      shortcut: '⌘3',
      active: activeView === 'dashboard',
      onClick: () => onViewChange('dashboard'),
    },
  ];

  const workspaceItems: NavItem[] = [
    {
      id: 'backlog',
      label: 'Backlog',
      icon: <Circle className="h-4 w-4 text-muted-foreground" />,
    },
    {
      id: 'active',
      label: '진행 중',
      icon: <Timer className="h-4 w-4 text-[#5e6ad2]" />,
    },
    {
      id: 'cycles',
      label: '사이클',
      icon: <Repeat className="h-4 w-4" />,
    },
    {
      id: 'roadmap',
      label: '로드맵',
      icon: <Target className="h-4 w-4" />,
    },
  ];

  const projectItems: NavItem[] = [
    {
      id: 'project-1',
      label: 'Sprint Manager',
      icon: <FolderKanban className="h-4 w-4" />,
    },
    {
      id: 'project-2',
      label: 'Linear Integration',
      icon: <FolderKanban className="h-4 w-4" />,
    },
  ];

  const renderNavItem = (item: NavItem, showShortcut = true) => (
    <TooltipProvider key={item.id} delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
              'hover:bg-accent/80',
              item.active && 'bg-accent text-foreground font-medium',
              !item.active && 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn(
              'shrink-0 opacity-70',
              item.active && 'opacity-100'
            )}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                    {item.badge}
                  </span>
                )}
                {item.shortcut && showShortcut && (
                  <span className="shrink-0 text-[10px] text-muted-foreground/60 font-mono">
                    {item.shortcut}
                  </span>
                )}
              </>
            )}
          </button>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  const renderSection = (section: NavSection) => (
    <Collapsible
      key={section.id}
      open={!collapsed && openSections[section.id]}
      onOpenChange={() => toggleSection(section.id)}
    >
      {!collapsed && (
        <CollapsibleTrigger className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wide hover:text-muted-foreground transition-colors">
          <span>{section.label}</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              openSections[section.id] && 'rotate-0',
              !openSections[section.id] && '-rotate-90'
            )}
          />
        </CollapsibleTrigger>
      )}
      <CollapsibleContent className="space-y-0.5">
        {section.items.map(item => renderNavItem(item, false))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full border-r border-border/40 bg-muted/20 transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-b border-border/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
          <Zap className="h-3.5 w-3.5" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold truncate">Sprint Manager</h2>
            <p className="text-[11px] text-muted-foreground/70 truncate">Workspace</p>
          </div>
        )}
      </div>

      {/* Search / Command Palette Trigger */}
      <div className="px-2 pt-2">
        <button
          onClick={onCommandPaletteOpen}
          className={cn(
            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/40',
            'bg-background/60 hover:bg-accent/50 hover:border-border/60',
            'text-muted-foreground text-[13px] transition-colors'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-muted-foreground/70">검색...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground/70">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Create Button */}
      <div className="px-2 py-2">
        <Button
          onClick={onCreateTask}
          size="sm"
          className={cn(
            'w-full gap-1.5 h-8 text-[13px]',
            collapsed && 'px-0'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {!collapsed && <span>새 이슈</span>}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-4 py-2">
          {/* Main Nav */}
          <div className="space-y-0.5">
            {mainNavItems.map(item => renderNavItem(item))}
          </div>

          {/* Views */}
          <div className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wide">
                뷰
              </div>
            )}
            {viewItems.map(item => renderNavItem(item))}
          </div>

          {/* Workspace */}
          {renderSection({
            id: 'workspace',
            label: '워크스페이스',
            items: workspaceItems,
            defaultOpen: true,
          })}

          {/* Projects */}
          {renderSection({
            id: 'projects',
            label: '프로젝트',
            items: projectItems,
            defaultOpen: false,
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-border/40">
        <button
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px]',
            'text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors'
          )}
        >
          <Settings className="h-4 w-4 opacity-70" />
          {!collapsed && <span>설정</span>}
        </button>
      </div>
    </div>
  );
}
