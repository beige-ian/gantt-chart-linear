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
  Inbox,
  FolderKanban,
  Target,
  Repeat,
  CheckCircle2,
  Circle,
  Timer,
  Zap,
  MoreHorizontal,
  Bell,
  HelpCircle,
  LogOut,
  User,
  Keyboard,
} from 'lucide-react';
import { cn } from './ui/utils';
import { ScrollArea } from './ui/scroll-area';
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

export function AppSidebar({
  activeView,
  onViewChange,
  onCommandPaletteOpen,
  onCreateTask,
  collapsed = false,
}: AppSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    views: true,
    projects: true,
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
      icon: <Circle className="h-4 w-4 text-[#95959f]" strokeWidth={1.5} />,
    },
    {
      id: 'active',
      label: '진행 중',
      icon: <Timer className="h-4 w-4 text-[#f2c94c]" />,
    },
    {
      id: 'cycles',
      label: '사이클',
      icon: <Repeat className="h-4 w-4 text-[#5e6ad2]" />,
    },
    {
      id: 'roadmap',
      label: '로드맵',
      icon: <Target className="h-4 w-4 text-[#4da568]" />,
    },
  ];

  const projectItems: NavItem[] = [
    {
      id: 'project-1',
      label: 'Sprint Manager',
      icon: <div className="w-4 h-4 rounded bg-[#5e6ad2] flex items-center justify-center text-[10px] font-bold text-white">S</div>,
    },
    {
      id: 'project-2',
      label: 'Linear Integration',
      icon: <div className="w-4 h-4 rounded bg-[#4da568] flex items-center justify-center text-[10px] font-bold text-white">L</div>,
    },
    {
      id: 'project-3',
      label: 'Design System',
      icon: <div className="w-4 h-4 rounded bg-[#f2994a] flex items-center justify-center text-[10px] font-bold text-white">D</div>,
    },
  ];

  const renderNavItem = (item: NavItem, showShortcut = true) => (
    <TooltipProvider key={item.id} delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all duration-150',
              'hover:bg-[#333438]',
              item.active && 'bg-[#333438] text-[#e2e2e3]',
              !item.active && 'text-[#8b8b8f] hover:text-[#e2e2e3]'
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#5e6ad2] text-white text-[10px] font-medium">
                    {item.badge}
                  </span>
                )}
                {item.shortcut && showShortcut && (
                  <span className="shrink-0 text-[10px] text-[#6b6b6f] font-mono">
                    {item.shortcut}
                  </span>
                )}
              </>
            )}
          </button>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="bg-[#26272b] border-[#333438] text-[#e2e2e3]">
            <div className="flex items-center gap-2">
              {item.label}
              {item.shortcut && (
                <span className="text-xs text-[#6b6b6f]">{item.shortcut}</span>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  const renderSection = (
    id: string,
    label: string,
    items: NavItem[],
    showAdd = false
  ) => (
    <div key={id} className="mb-4">
      {!collapsed && (
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-[#6b6b6f] uppercase tracking-wider hover:text-[#8b8b8f] transition-colors group"
        >
          <div className="flex items-center gap-1">
            <ChevronRight
              className={cn(
                'h-3 w-3 transition-transform duration-200',
                openSections[id] && 'rotate-90'
              )}
            />
            <span>{label}</span>
          </div>
          {showAdd && (
            <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )}
      {(!collapsed && openSections[id] || collapsed) && (
        <div className="space-y-0.5 mt-1">
          {items.map(item => renderNavItem(item, false))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#1f2023] border-r border-[#333438] transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#333438]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#5e6ad2] to-[#8b5cf6] shrink-0">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-[13px] font-semibold text-[#e2e2e3] truncate">Covering</h2>
              <p className="text-[11px] text-[#6b6b6f] truncate">Workspace</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="p-1 rounded hover:bg-[#333438] transition-colors">
            <MoreHorizontal className="h-4 w-4 text-[#6b6b6f]" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-2 pt-3">
        <button
          onClick={onCommandPaletteOpen}
          className={cn(
            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md',
            'bg-[#26272b] hover:bg-[#333438] border border-[#333438]',
            'text-[#6b6b6f] text-[13px] transition-colors'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">검색...</span>
              <kbd className="hidden sm:flex h-5 items-center gap-0.5 rounded border border-[#333438] bg-[#1f2023] px-1.5 font-mono text-[10px] text-[#6b6b6f]">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Create Button */}
      <div className="px-2 py-2">
        <button
          onClick={onCreateTask}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 h-8 rounded-md',
            'bg-[#5e6ad2] hover:bg-[#6872d9] text-white text-[13px] font-medium',
            'transition-colors duration-150',
            collapsed && 'px-0'
          )}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>새 이슈</span>}
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="py-2">
          {/* Main Nav */}
          <div className="space-y-0.5 mb-4">
            {mainNavItems.map(item => renderNavItem(item))}
          </div>

          {/* Views */}
          {renderSection('views', '뷰', viewItems)}

          {/* Workspace */}
          {renderSection('workspace', '워크스페이스', workspaceItems)}

          {/* Projects */}
          {renderSection('projects', '프로젝트', projectItems, true)}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-[#333438] space-y-0.5">
        <button
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px]',
            'text-[#8b8b8f] hover:bg-[#333438] hover:text-[#e2e2e3] transition-colors'
          )}
        >
          <Bell className="h-4 w-4" />
          {!collapsed && <span>알림</span>}
        </button>
        <button
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px]',
            'text-[#8b8b8f] hover:bg-[#333438] hover:text-[#e2e2e3] transition-colors'
          )}
        >
          <Keyboard className="h-4 w-4" />
          {!collapsed && <span>단축키</span>}
        </button>
        <button
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px]',
            'text-[#8b8b8f] hover:bg-[#333438] hover:text-[#e2e2e3] transition-colors'
          )}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>설정</span>}
        </button>
      </div>

      {/* User */}
      <div className="px-2 py-2 border-t border-[#333438]">
        <button
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md',
            'hover:bg-[#333438] transition-colors'
          )}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5e6ad2] to-[#8b5cf6] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-medium text-white">함</span>
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-[13px] text-[#e2e2e3] truncate">함정훈</span>
              <ChevronDown className="h-3 w-3 text-[#6b6b6f]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
