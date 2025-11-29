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
  Settings,
  Moon,
  Sun,
  Keyboard,
  FileDown,
  FileUp,
  RefreshCw,
  Filter,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Calendar,
  Users,
  Tag,
  Hash,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { SprintTask } from '../types/sprint';

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
  backlog: <Circle className="h-4 w-4 text-gray-400" />,
  todo: <Circle className="h-4 w-4 text-gray-500" strokeWidth={2.5} />,
  in_progress: <Timer className="h-4 w-4 text-[#5e6ad2]" />,
  in_review: <AlertCircle className="h-4 w-4 text-[#f2994a]" />,
  done: <CheckCircle2 className="h-4 w-4 text-[#0f783c]" />,
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

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  // Global keyboard shortcut to open command palette
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
      label: '새 태스크 생성',
      description: '새로운 태스크를 만듭니다',
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

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    if (!search || search.length < 2) return tasks.slice(0, 5);
    const lowerSearch = search.toLowerCase();
    return tasks.filter(task =>
      task.name.toLowerCase().includes(lowerSearch) ||
      task.description?.toLowerCase().includes(lowerSearch) ||
      task.assignee?.toLowerCase().includes(lowerSearch) ||
      task.labels?.some(label => label.toLowerCase().includes(lowerSearch))
    ).slice(0, 10);
  }, [search, tasks]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md" loop>
        <div className="flex items-center border-b px-3 gap-2">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="검색하거나 명령을 입력하세요..."
            value={search}
            onValueChange={setSearch}
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0"
          />
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ESC
          </kbd>
        </div>
        <CommandList className="max-h-[400px] overflow-y-auto">
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-8 w-8 opacity-30" />
              <span>검색 결과가 없습니다</span>
            </div>
          </CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading="빠른 작업">
            {quickActions.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                onSelect={cmd.action}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {cmd.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && (
                  <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Navigation */}
          <CommandGroup heading="이동">
            {navigationCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                onSelect={cmd.action}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                  {cmd.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && (
                  <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <>
              <CommandGroup heading="태스크">
                {filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`${task.name} ${task.assignee || ''} ${task.labels?.join(' ') || ''}`}
                    onSelect={() => handleSelect(() => onSelectTask(task))}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  >
                    <div className="flex h-8 w-8 items-center justify-center">
                      {STATUS_ICONS[task.status]}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{task.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {task.assignee && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {task.assignee}
                          </span>
                        )}
                        {task.storyPoints !== undefined && task.storyPoints > 0 && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {task.storyPoints}pts
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Settings */}
          <CommandGroup heading="설정">
            {settingsCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                onSelect={cmd.action}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  {cmd.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && (
                  <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted">↵</kbd>
              선택
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted">esc</kbd>
              닫기
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>Linear Style</span>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
