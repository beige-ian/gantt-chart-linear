import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import {
  Zap,
  Link2,
  Loader2,
  Check,
  ChevronDown,
  RefreshCw,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface LinearConnectionProps {
  className?: string;
  showTeamSelector?: boolean;
  onSyncComplete?: () => void;
}

export function LinearConnection({ className, showTeamSelector = true, onSyncComplete }: LinearConnectionProps) {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    linear,
    isSyncing,
    lastSyncAt,
    connectLinear,
    disconnectLinear,
    selectTeam,
    selectCycle,
    syncFromLinear,
  } = useTaskStore();

  const handleConnect = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('API 키를 입력해주세요');
      return;
    }

    setIsConnecting(true);
    try {
      const success = await connectLinear(apiKeyInput.trim());
      if (success) {
        toast.success('Linear 연결됨', {
          description: `${linear.teams.length}개 팀 연결`,
        });
        setIsConnectDialogOpen(false);
        setApiKeyInput('');

        // Auto-sync after connection
        await syncFromLinear();
        onSyncComplete?.();
      } else {
        toast.error('연결 실패', {
          description: 'API 키를 확인해주세요',
        });
      }
    } catch (error) {
      toast.error('연결 실패');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectLinear();
    toast.success('Linear 연결 해제됨');
  };

  const handleSync = async () => {
    await syncFromLinear();
    onSyncComplete?.();
    toast.success('동기화 완료');
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return '동기화 안됨';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSyncAt.getTime()) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    return lastSyncAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const selectedTeam = linear.teams.find(t => t.id === linear.selectedTeamId);
  const selectedCycle = linear.cycles.find(c => c.id === linear.selectedCycleId);

  // If not connected, show connect button
  if (!linear.isConnected) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
          onClick={() => setIsConnectDialogOpen(true)}
        >
          <Link2 className="h-4 w-4" />
          <span className="hidden sm:inline">Linear 연결</span>
        </Button>

        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#5e6ad2]" />
                Linear 연결
              </DialogTitle>
              <DialogDescription>
                Linear API 키를 입력하여 프로젝트와 이슈를 동기화하세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
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
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a
                  href="https://linear.app/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Linear Settings → API → Personal API keys
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                연결
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Connected state
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Connection Status */}
      <div className="flex items-center gap-1.5 text-green-600">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs hidden sm:inline">{formatLastSync()}</span>
      </div>

      {/* Team/Cycle Selector */}
      {showTeamSelector && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 max-w-[180px]">
              {selectedTeam?.icon ? (
                <span className="text-base">{selectedTeam.icon}</span>
              ) : (
                <Zap className="h-4 w-4 text-[#5e6ad2]" />
              )}
              <span className="truncate">{selectedTeam?.name || 'Linear'}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Teams */}
            <div className="px-2 py-1.5">
              <Label className="text-xs text-muted-foreground">팀</Label>
            </div>
            {linear.teams.map(team => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => selectTeam(team.id)}
                className={cn(
                  'cursor-pointer gap-2',
                  linear.selectedTeamId === team.id && 'bg-accent'
                )}
              >
                {team.icon && <span className="text-base">{team.icon}</span>}
                <span className="flex-1">{team.name}</span>
                {linear.selectedTeamId === team.id && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}

            {/* Cycles */}
            {linear.cycles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <Label className="text-xs text-muted-foreground">스프린트</Label>
                </div>
                <DropdownMenuItem
                  onClick={() => selectCycle(null)}
                  className={cn(
                    'cursor-pointer',
                    !linear.selectedCycleId && 'bg-accent'
                  )}
                >
                  전체
                  {!linear.selectedCycleId && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                {linear.cycles.slice(0, 5).map(cycle => (
                  <DropdownMenuItem
                    key={cycle.id}
                    onClick={() => selectCycle(cycle.id)}
                    className={cn(
                      'cursor-pointer flex-col items-start',
                      linear.selectedCycleId === cycle.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{cycle.name || `Cycle ${cycle.number}`}</span>
                      {linear.selectedCycleId === cycle.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(cycle.startsAt).toLocaleDateString('ko-KR')} ~{' '}
                      {new Date(cycle.endsAt).toLocaleDateString('ko-KR')}
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDisconnect}
              className="text-red-600 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              연결 해제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Sync Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleSync}
        disabled={isSyncing}
      >
        <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
      </Button>
    </div>
  );
}
