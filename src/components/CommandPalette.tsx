import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './ui/command';
import {
  Search,
  Plus,
  Layers,
  GanttChartSquare,
  Moon,
  Sun,
  Keyboard,
  FileDown,
  FileUp,
  RefreshCw,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Users,
  Hash,
  Zap,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { SprintTask } from '../types/sprint';
import { cn } from './ui/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: SprintTask[];
  onNavigate: (view: 'sprint' | 'timeline') => void;
  onCreateTask: () => void;
  onSelectTask: (task: SprintTask) => void;
  onToggleTheme: () => void;
  onShowShortcuts: () => void;
  onExport: () => void;
  onImport: () => void;
  onSync: () => void;
  currentTheme: string;
}

type CommandType = 'action' | 'navigation' | 'task' | 'setting';

interface CommandOption {
  id: string;
  type: CommandType;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  backlog: <Circle className="h-[14px] w-[14px] text-[#95959f]" strokeWidth={1.5} />,
  todo: <Circle className="h-[14px] w-[14px] text-[#e2e2e3]" strokeWidth={2} />,
  in_progress: <Timer className="h-[14px] w-[14px] text-[#f2c94c]" />,
  in_review: <AlertCircle className="h-[14px] w-[14px] text-[#bb87fc]" />,
  done: <CheckCircle2 className="h-[14px] w-[14px] text-[#4da568]" />,
};

export function CommandPalette({
  open,
  onOpenChange,
  tasks,
  onNavigate,
  onCreateTask,
  onSelectTask,
  onToggleTheme,
  onShowShortcuts,
  onExport,
  onImport,
  onSync,
  currentTheme,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback((callback: () => void) => {
    onOpenChange(false);
    callback();
  }, [onOpenChange]);

  const quickActions: CommandOption[] = useMemo(() => [
    {
      id: 'create-task',
      type: 'action',
      label: '새 이슈 생성',
      description: '새로운 이슈를 만듭니다',
      icon: <Plus className="h-4 w-4" />,
      shortcut: 'C',
      action: () => handleSelect(onCreateTask),
      keywords: ['new', 'create', 'task', 'issue', '생성', '만들기'],
    },
    {
      id: 'sync-linear',
      type: 'action',
      label: 'Linear 동기화',
      description: 'Linear와 데이터를 동기화합니다',
      icon: <RefreshCw className="h-4 w-4" />,
      action: () => handleSelect(onSync),
      keywords: ['sync', 'linear', '동기화', '연동'],
    },
  ], [handleSelect, onCreateTask, onSync]);

  const navigationCommands: CommandOption[] = useMemo(() => [
    {
      id: 'nav-sprint',
      type: 'navigation',
      label: '스프린트 보드',
      description: '칸반 보드로 이동',
      icon: <Layers className="h-4 w-4" />,
      shortcut: '⌘1',
      action: () => handleSelect(() => onNavigate('sprint')),
      keywords: ['board', 'kanban', 'sprint', '보드', '칸반'],
    },
    {
      id: 'nav-timeline',
      type: 'navigation',
      label: '타임라인',
      description: '간트 차트로 이동',
      icon: <GanttChartSquare className="h-4 w-4" />,
      shortcut: '⌘2',
      action: () => handleSelect(() => onNavigate('timeline')),
      keywords: ['gantt', 'timeline', 'chart', '간트', '타임라인'],
    },
  ], [handleSelect, onNavigate]);

  const settingsCommands: CommandOption[] = useMemo(() => [
    {
      id: 'toggle-theme',
      type: 'setting',
      label: currentTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환',
      description: '테마를 변경합니다',
      icon: currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      shortcut: '⌘T',
      action: () => handleSelect(onToggleTheme),
      keywords: ['theme', 'dark', 'light', '테마', '다크', '라이트'],
    },
    {
      id: 'shortcuts',
      type: 'setting',
      label: '키보드 단축키',
      description: '단축키 목록 보기',
      icon: <Keyboard className="h-4 w-4" />,
      shortcut: '⌘/',
      action: () => handleSelect(onShowShortcuts),
      keywords: ['keyboard', 'shortcuts', '키보드', '단축키'],
    },
    {
      id: 'export',
      type: 'setting',
      label: '데이터 내보내기',
      description: 'JSON/CSV로 내보내기',
      icon: <FileDown className="h-4 w-4" />,
      action: () => handleSelect(onExport),
      keywords: ['export', 'download', '내보내기', '다운로드'],
    },
    {
      id: 'import',
      type: 'setting',
      label: '데이터 가져오기',
      description: 'JSON/CSV 파일 가져오기',
      icon: <FileUp className="h-4 w-4" />,
      action: () => handleSelect(onImport),
      keywords: ['import', 'upload', '가져오기', '업로드'],
    },
  ], [currentTheme, handleSelect, onToggleTheme, onShowShortcuts, onExport, onImport]);

  const filteredTasks = useMemo(() => {
    if (!search || search.length < 2) return tasks.slice(0, 5);
    const lowerSearch = search.toLowerCase();
    return tasks.filter(task =>
      task.name.toLowerCase().includes(lowerSearch) ||
      task.description?.toLowerCase().includes(lowerSearch) ||
      task.assignee?.toLowerCase().includes(lowerSearch) ||
      task.labels?.some(label => {
        if (typeof label === 'string') return label.toLowerCase().includes(lowerSearch);
        return label.name?.toLowerCase().includes(lowerSearch);
      })
    ).slice(0, 10);
  }, [search, tasks]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg bg-[#1f2023] border-[#333438]" loop>
        <div className="flex items-center border-b border-[#333438] px-4 gap-3">
          <Search className="h-4 w-4 shrink-0 text-[#6b6b6f]" />
          <CommandInput
            placeholder="검색하거나 명령을 입력하세요..."
            value={search}
            onValueChange={setSearch}
            className="flex h-12 w-full bg-transparent py-3 text-[14px] text-[#e2e2e3] outline-none placeholder:text-[#6b6b6f] border-0"
          />
          <kbd className="hidden sm:flex h-5 items-center gap-1 rounded border border-[#333438] bg-[#26272b] px-1.5 font-mono text-[10px] text-[#6b6b6f]">
            ESC
          </kbd>
        </div>
        <CommandList className="max-h-[400px] overflow-y-auto p-2">
          <CommandEmpty className="py-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-8 w-8 text-[#4b4b4f]" />
              <span className="text-[13px] text-[#6b6b6f]">검색 결과가 없습니다</span>
            </div>
          </CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading={<span className="text-[11px] font-medium text-[#6b6b6f] uppercase tracking-wider">빠른 작업</span>}>
            {quickActions.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                onSelect={cmd.action}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer data-[selected=true]:bg-[#333438]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#5e6ad2]/20 text-[#5e6ad2]">
                  {cmd.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[13px] font-medium text-[#e2e2e3]">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-[11px] text-[#6b6b6f]">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded border border-[#333438] bg-[#26272b] text-[10px] font-mono text-[#6b6b6f]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <div className="h-px bg-[#333438] my-2" />

          {/* Navigation */}
          <CommandGroup heading={<span className="text-[11px] font-medium text-[#6b6b6f] uppercase tracking-wider">이동</span>}>
            {navigationCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                onSelect={cmd.action}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer data-[selected=true]:bg-[#333438]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#333438] text-[#8b8b8f]">
                  {cmd.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[13px] font-medium text-[#e2e2e3]">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-[11px] text-[#6b6b6f]">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded border border-[#333438] bg-[#26272b] text-[10px] font-mono text-[#6b6b6f]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <>
              <div className="h-px bg-[#333438] my-2" />
              <CommandGroup heading={<span className="text-[11px] font-medium text-[#6b6b6f] uppercase tracking-wider">이슈</span>}>
                {filteredTasks.map((task) => {
                  const issueId = task.linearIssueId
                    ? `COV-${task.linearIssueId.split('-').pop()?.slice(-3) || '???'}`
                    : `#${task.id.slice(0, 4)}`;

                  return (
                    <CommandItem
                      key={task.id}
                      value={`${task.name} ${task.assignee || ''} ${task.labels?.map(l => typeof l === 'string' ? l : l.name).join(' ') || ''}`}
                      onSelect={() => handleSelect(() => onSelectTask(task))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer data-[selected=true]:bg-[#333438]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center">
                        {STATUS_ICONS[task.status]}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#6b6b6f] font-mono">{issueId}</span>
                          <span className="text-[13px] font-medium text-[#e2e2e3] truncate">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#6b6b6f]">
                          {task.assignee && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {task.assignee}
                            </span>
                          )}
                          {task.storyPoints !== undefined && task.storyPoints > 0 && (
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {task.storyPoints}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#4b4b4f]" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          <div className="h-px bg-[#333438] my-2" />

          {/* Settings */}
          <CommandGroup heading={<span className="text-[11px] font-medium text-[#6b6b6f] uppercase tracking-wider">설정</span>}>
            {settingsCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                onSelect={cmd.action}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer data-[selected=true]:bg-[#333438]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#26272b] text-[#8b8b8f]">
                  {cmd.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[13px] font-medium text-[#e2e2e3]">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-[11px] text-[#6b6b6f]">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded border border-[#333438] bg-[#26272b] text-[10px] font-mono text-[#6b6b6f]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#333438] px-4 py-2.5">
          <div className="flex items-center gap-4 text-[11px] text-[#6b6b6f]">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-[#26272b] border border-[#333438]">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-[#26272b] border border-[#333438]">↵</kbd>
              선택
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-[#26272b] border border-[#333438]">esc</kbd>
              닫기
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5e6ad2]">
            <Zap className="h-3 w-3" />
            <span className="font-medium">Powered by Linear</span>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
