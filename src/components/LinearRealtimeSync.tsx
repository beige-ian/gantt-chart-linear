import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  RefreshCw,
  Link2,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  Settings,
  Clock,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { useLinearSync } from '../hooks/useLinearSync';
import { Sprint, SprintTask } from '../types/sprint';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface LinearRealtimeSyncProps {
  onSyncComplete?: (sprints: Sprint[], tasks: SprintTask[]) => void;
  className?: string;
}

export function LinearRealtimeSync({ onSyncComplete, className }: LinearRealtimeSyncProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30); // seconds
  const [apiKeyInput, setApiKeyInput] = useState('');

  const {
    isConnected,
    isSyncing,
    lastSyncAt,
    error,
    teams,
    selectedTeamId,
    cycles,
    selectedCycleId,
    apiKey,
    sprints,
    tasks,
    connect,
    disconnect,
    selectTeam,
    selectCycle,
    triggerSync,
  } = useLinearSync({
    autoSync: autoSyncEnabled,
    syncInterval: syncInterval * 1000,
    onSyncComplete: (result) => {
      onSyncComplete?.(result.sprints, result.tasks);
    },
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedAutoSync = localStorage.getItem('linear-auto-sync');
    const savedInterval = localStorage.getItem('linear-sync-interval');

    if (savedAutoSync !== null) {
      setAutoSyncEnabled(savedAutoSync === 'true');
    }
    if (savedInterval) {
      setSyncInterval(parseInt(savedInterval, 10));
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('linear-auto-sync', String(autoSyncEnabled));
    localStorage.setItem('linear-sync-interval', String(syncInterval));
  }, [autoSyncEnabled, syncInterval]);

  // Update parent when sync completes
  useEffect(() => {
    if (sprints.length > 0 || tasks.length > 0) {
      onSyncComplete?.(sprints, tasks);
    }
  }, [sprints, tasks, onSyncComplete]);

  const handleConnect = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('API 키를 입력해주세요');
      return;
    }
    connect(apiKeyInput);
    setApiKeyInput('');
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('Linear 연결 해제됨');
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return '동기화 안됨';

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSyncAt.getTime()) / 1000);

    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    return lastSyncAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    if (isSyncing) return 'text-blue-500';
    if (error) return 'text-red-500';
    if (isConnected) return 'text-green-500';
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (error) return <WifiOff className="h-4 w-4" />;
    if (isConnected) return <Wifi className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status Indicator */}
      <div className={cn('flex items-center gap-1.5', getStatusColor())}>
        {getStatusIcon()}
        {autoSyncEnabled && isConnected && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {formatLastSync()}
          </span>
        )}
      </div>

      {isConnected ? (
        <>
          {/* Team/Cycle Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {selectedTeam?.name || 'Linear'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <Label className="text-xs text-muted-foreground">팀 선택</Label>
              </div>
              {teams.map(team => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => selectTeam(team.id)}
                  className={cn(
                    'cursor-pointer',
                    selectedTeamId === team.id && 'bg-accent'
                  )}
                >
                  {team.name}
                  {selectedTeamId === team.id && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}

              {selectedTeamId && cycles.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <Label className="text-xs text-muted-foreground">스프린트 선택</Label>
                  </div>
                  {cycles.slice(0, 5).map(cycle => (
                    <DropdownMenuItem
                      key={cycle.id}
                      onClick={() => selectCycle(cycle.id)}
                      className={cn(
                        'cursor-pointer',
                        selectedCycleId === cycle.id && 'bg-accent'
                      )}
                    >
                      <div className="flex flex-col">
                        <span>{cycle.name || `Cycle ${cycle.number}`}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(cycle.startsAt).toLocaleDateString('ko-KR')} ~{' '}
                          {new Date(cycle.endsAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      {selectedCycleId === cycle.id && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDisconnect}
                className="text-red-600 cursor-pointer"
              >
                연결 해제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sync Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => triggerSync()}
            disabled={isSyncing}
          >
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
          </Button>

          {/* Settings */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Linear 동기화 설정</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>자동 동기화</Label>
                    <p className="text-xs text-muted-foreground">
                      Linear에서 변경사항 자동 가져오기
                    </p>
                  </div>
                  <Switch
                    checked={autoSyncEnabled}
                    onCheckedChange={setAutoSyncEnabled}
                  />
                </div>

                {autoSyncEnabled && (
                  <div className="space-y-2">
                    <Label>동기화 주기</Label>
                    <Select
                      value={String(syncInterval)}
                      onValueChange={(v) => setSyncInterval(parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10초</SelectItem>
                        <SelectItem value="30">30초</SelectItem>
                        <SelectItem value="60">1분</SelectItem>
                        <SelectItem value="300">5분</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>마지막 동기화: {formatLastSync()}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Linear 연결</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Linear 연결</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="lin_api_..."
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
                <p className="text-xs text-muted-foreground">
                  Linear Settings → API → Personal API keys
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                  <p className="font-medium">연결 실패</p>
                  <p className="text-xs mt-1">{error}</p>
                </div>
              )}

              <Button onClick={handleConnect} className="w-full" disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                연결
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
