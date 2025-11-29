import React, { useState, useEffect, useCallback } from 'react';
import { GanttChart } from './components/GanttChart';
import { SprintDashboard } from './components/SprintDashboard';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import {
  Moon,
  Sun,
  Monitor,
  GanttChartSquare,
  Layers,
  Keyboard,
  LayoutList,
  LayoutGrid,
  Search,
  Plus,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { useKeyboardShortcuts, SHORTCUT_KEYS } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { CommandPalette } from './components/CommandPalette';
import { IssueDetailPanel } from './components/IssueDetailPanel';
import { IssueListView } from './components/IssueListView';
import { LinearConnection } from './components/LinearConnection';
import { AutoSaveIndicator, useAutoSave } from './components/AutoSaveIndicator';
import { SprintTask } from './types/sprint';
import { useTaskStore } from './stores/useTaskStore';
import { toast } from 'sonner';
import { cn } from './components/ui/utils';

// Default sample tasks (only used if localStorage is empty)
const DEFAULT_TASKS: SprintTask[] = [
  {
    id: '1',
    name: 'Linear 스타일 UI 구현',
    description: '전체 애플리케이션을 Linear 스타일로 리디자인합니다.',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    progress: 60,
    color: '#5e6ad2',
    status: 'in_progress',
    priority: 'high',
    storyPoints: 8,
    assignee: '김개발',
    labels: ['design', 'frontend'],
  },
  {
    id: '2',
    name: 'Command Palette 기능 추가',
    description: 'Cmd+K로 열리는 Command Palette를 구현합니다.',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    progress: 100,
    color: '#0f783c',
    status: 'done',
    priority: 'urgent',
    storyPoints: 5,
    assignee: '박프론트',
    labels: ['feature'],
  },
  {
    id: '3',
    name: 'API 연동 개선',
    description: 'Linear API 연동을 개선하고 에러 핸들링을 추가합니다.',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    progress: 0,
    color: '#f2994a',
    status: 'todo',
    priority: 'medium',
    storyPoints: 3,
    assignee: '이백엔드',
    labels: ['api', 'backend'],
  },
  {
    id: '4',
    name: '성능 최적화',
    description: '렌더링 성능을 최적화합니다.',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    progress: 30,
    color: '#eb5757',
    status: 'in_review',
    priority: 'high',
    storyPoints: 5,
    assignee: '김개발',
    labels: ['performance'],
  },
  {
    id: '5',
    name: '문서 작성',
    description: 'README 및 사용 가이드 문서를 작성합니다.',
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    progress: 0,
    color: '#9b9a97',
    status: 'backlog',
    priority: 'low',
    storyPoints: 2,
    labels: ['docs'],
  },
];

// Load tasks from localStorage
const loadTasksFromStorage = (): SprintTask[] => {
  try {
    const saved = localStorage.getItem('sprint-tasks');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((t: SprintTask) => ({
        ...t,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate),
      }));
    }
  } catch (e) {
    console.error('Failed to load tasks from localStorage:', e);
  }
  return DEFAULT_TASKS;
};

// Save tasks to localStorage
const saveTasksToStorage = (tasks: SprintTask[]) => {
  try {
    localStorage.setItem('sprint-tasks', JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage:', e);
  }
};

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="테마 변경">
          {resolvedTheme === 'dark' ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2 text-sm">
          <Sun className="h-4 w-4" />
          라이트
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2 text-sm">
          <Moon className="h-4 w-4" />
          다크
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2 text-sm">
          <Monitor className="h-4 w-4" />
          시스템
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppContent() {
  const autoSave = useAutoSave();
  const [activeView, setActiveView] = useState<'sprint' | 'timeline'>(() => {
    const saved = localStorage.getItem('app-active-view');
    return (saved === 'sprint' || saved === 'timeline') ? saved : 'sprint';
  });
  const [viewMode, setViewMode] = useState<'board' | 'list'>(() => {
    const saved = localStorage.getItem('app-view-mode');
    return (saved === 'board' || saved === 'list') ? saved : 'board';
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SprintTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [tasks, setTasks] = useState<SprintTask[]>(() => loadTasksFromStorage());
  const { setTheme, resolvedTheme } = useTheme();

  // Save tasks to localStorage when they change
  useEffect(() => {
    if (tasks.length > 0) {
      autoSave.startSaving();
      try {
        saveTasksToStorage(tasks);
        autoSave.completeSave();
      } catch {
        autoSave.failSave();
      }
    }
  }, [tasks]);

  // Listen for storage events to sync across tabs and with SprintDashboard
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sprint-tasks' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const tasksWithDates = parsed.map((t: SprintTask) => ({
            ...t,
            startDate: new Date(t.startDate),
            endDate: new Date(t.endDate),
          }));
          setTasks(tasksWithDates);
        } catch (err) {
          console.error('Failed to parse storage event:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reload tasks from localStorage when switching to list view (to sync with SprintDashboard changes)
  useEffect(() => {
    if (viewMode === 'list') {
      setTasks(loadTasksFromStorage());
    }
  }, [viewMode]);

  // Save activeView to localStorage
  useEffect(() => {
    localStorage.setItem('app-active-view', activeView);
  }, [activeView]);

  // Save viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('app-view-mode', viewMode);
  }, [viewMode]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(`테마 변경됨`, { description: newTheme === 'dark' ? '다크 모드' : '라이트 모드' });
  }, [resolvedTheme, setTheme]);

  // Create new task
  const handleCreateTask = useCallback(() => {
    toast.info('새 태스크 생성', { description: '태스크 폼이 열립니다' });
    // In real implementation, this would open a task creation form
  }, []);

  // Select task
  const handleSelectTask = useCallback((task: SprintTask) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  }, []);

  // Update task
  const handleUpdateTask = useCallback((updatedTask: SprintTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    toast.success('태스크 업데이트됨');
  }, []);

  // Delete task
  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    // Close detail panel if deleted task is selected
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setShowTaskDetail(false);
    }
    toast.success('태스크 삭제됨');
  }, [selectedTask]);

  // Status change
  const handleStatusChange = useCallback((taskId: string, status: SprintTask['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  }, []);

  // Export data
  const handleExport = useCallback(() => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sprint-tasks.json';
    a.click();
    toast.success('데이터 내보내기 완료');
  }, [tasks]);

  // Import data
  const handleImport = useCallback(() => {
    toast.info('가져오기', { description: '파일 선택 대화상자가 열립니다' });
  }, []);

  // Sync with Linear
  const handleSync = useCallback(() => {
    toast.info('Linear 동기화', { description: '동기화를 시작합니다...' });
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...SHORTCUT_KEYS.BOARD_VIEW,
      action: () => setActiveView('sprint'),
    },
    {
      ...SHORTCUT_KEYS.GANTT_VIEW,
      action: () => setActiveView('timeline'),
    },
    {
      ...SHORTCUT_KEYS.TOGGLE_THEME,
      action: toggleTheme,
    },
    {
      ...SHORTCUT_KEYS.HELP,
      action: () => setShowHelp(true),
    },
    {
      ...SHORTCUT_KEYS.ESCAPE,
      action: () => {
        setShowHelp(false);
        setShowCommandPalette(false);
        setShowTaskDetail(false);
      },
    },
  ]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm hidden sm:inline">Sprint Manager</span>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            <Button
              variant={activeView === 'sprint' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-3 gap-1.5"
              onClick={() => setActiveView('sprint')}
            >
              <Layers className="h-4 w-4" />
              <span className="text-xs">스프린트</span>
            </Button>
            <Button
              variant={activeView === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-3 gap-1.5"
              onClick={() => setActiveView('timeline')}
            >
              <GanttChartSquare className="h-4 w-4" />
              <span className="text-xs">타임라인</span>
            </Button>
          </div>

          {/* View Mode Toggle (only for sprint view) */}
          {activeView === 'sprint' && (
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-md border border-border/40">
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">보드</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">리스트</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          <AutoSaveIndicator status={autoSave.status} lastSaved={autoSave.lastSaved} />

          {/* Linear Integration Group */}
          <LinearConnection />

          {/* Separator */}
          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Search */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCommandPalette(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs hidden md:inline">검색</span>
            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </Button>

          {/* Utility Actions Group */}
          <div className="flex items-center gap-0.5 p-0.5 bg-muted/30 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowHelp(true)}
              title="키보드 단축키"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </Button>
            <ThemeToggle />
          </div>

          {/* Primary Action */}
          <Button size="sm" className="h-8 gap-2 shadow-sm" onClick={handleCreateTask}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">새 이슈</span>
          </Button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-4 md:p-6">
          {activeView === 'sprint' && (
            viewMode === 'board' ? (
              <SprintDashboard />
            ) : (
              <IssueListView
                tasks={tasks}
                onTaskClick={handleSelectTask}
                onStatusChange={handleStatusChange}
                onDeleteTask={handleDeleteTask}
                onBulkDelete={(ids) => {
                  setTasks(prev => prev.filter(t => !ids.includes(t.id)));
                  toast.success(`${ids.length}개 태스크 삭제됨`);
                }}
                onBulkStatusChange={(ids, status) => {
                  setTasks(prev => prev.map(t =>
                    ids.includes(t.id) ? { ...t, status } : t
                  ));
                  toast.success(`${ids.length}개 태스크 상태 변경됨`);
                }}
              />
            )
          )}
          {activeView === 'timeline' && <GanttChart />}
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        tasks={tasks}
        onNavigate={setActiveView}
        onCreateTask={handleCreateTask}
        onSelectTask={handleSelectTask}
        onToggleTheme={toggleTheme}
        onShowShortcuts={() => setShowHelp(true)}
        onExport={handleExport}
        onImport={handleImport}
        onSync={handleSync}
        currentTheme={resolvedTheme || 'light'}
      />

      {/* Issue Detail Panel */}
      <IssueDetailPanel
        task={selectedTask}
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />

      {/* Toaster */}
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
