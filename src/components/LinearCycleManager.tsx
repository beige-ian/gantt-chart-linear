import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
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
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Plus,
  Calendar,
  Loader2,
  Play,
  CheckCircle2,
  Clock,
  Archive,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  fetchLinearTeams,
  fetchLinearCycles,
  createLinearCycle,
  updateLinearCycle,
  archiveLinearCycle,
  getActiveCycle,
  formatDateForLinear,
  LinearTeam,
  LinearCycle,
} from '../services/linear';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface LinearCycleManagerProps {
  onCycleSelect?: (cycleId: string) => void;
  selectedCycleId?: string;
}

export function LinearCycleManager({ onCycleSelect, selectedCycleId }: LinearCycleManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<LinearCycle | null>(null);
  const [editingCycle, setEditingCycle] = useState<LinearCycle | null>(null);

  // Form state for creating/editing cycle
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startsAt: '',
    endsAt: '',
  });

  const apiKey = localStorage.getItem('linear-api-key');

  useEffect(() => {
    if (apiKey && isOpen) {
      loadTeams();
    }
  }, [apiKey, isOpen]);

  useEffect(() => {
    if (selectedTeamId && apiKey) {
      loadCycles();
    }
  }, [selectedTeamId, apiKey]);

  const loadTeams = async () => {
    if (!apiKey) return;
    setIsLoading(true);
    try {
      const fetchedTeams = await fetchLinearTeams(apiKey);
      setTeams(fetchedTeams);
      if (fetchedTeams.length > 0 && !selectedTeamId) {
        const savedTeamId = localStorage.getItem('linear-selected-team-id');
        setSelectedTeamId(savedTeamId || fetchedTeams[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('팀 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCycles = async () => {
    if (!apiKey || !selectedTeamId) return;
    setIsLoading(true);
    try {
      const [fetchedCycles, active] = await Promise.all([
        fetchLinearCycles(apiKey, selectedTeamId),
        getActiveCycle(apiKey, selectedTeamId),
      ]);
      setCycles(fetchedCycles);
      setActiveCycle(active);
    } catch (error) {
      console.error('Failed to fetch cycles:', error);
      toast.error('스프린트 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCycle = async () => {
    if (!apiKey || !selectedTeamId) return;
    if (!formData.startsAt || !formData.endsAt) {
      toast.error('시작일과 종료일을 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createLinearCycle(apiKey, selectedTeamId, {
        name: formData.name || undefined,
        description: formData.description || undefined,
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: new Date(formData.endsAt).toISOString(),
      });

      if (result.success) {
        toast.success('스프린트 생성됨', {
          description: `Cycle ${result.number}${formData.name ? `: ${formData.name}` : ''}`,
        });
        setIsCreateOpen(false);
        setFormData({ name: '', description: '', startsAt: '', endsAt: '' });
        loadCycles();
      } else {
        toast.error('스프린트 생성 실패');
      }
    } catch (error) {
      console.error('Failed to create cycle:', error);
      toast.error('스프린트 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCycle = async () => {
    if (!apiKey || !editingCycle) return;

    setIsLoading(true);
    try {
      const success = await updateLinearCycle(apiKey, editingCycle.id, {
        name: formData.name || undefined,
        description: formData.description || undefined,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
        endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
      });

      if (success) {
        toast.success('스프린트 업데이트됨');
        setEditingCycle(null);
        setFormData({ name: '', description: '', startsAt: '', endsAt: '' });
        loadCycles();
      } else {
        toast.error('스프린트 업데이트 실패');
      }
    } catch (error) {
      console.error('Failed to update cycle:', error);
      toast.error('스프린트 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveCycle = async (cycleId: string) => {
    if (!apiKey) return;
    if (!confirm('이 스프린트를 아카이브하시겠습니까?')) return;

    setIsLoading(true);
    try {
      const success = await archiveLinearCycle(apiKey, cycleId);
      if (success) {
        toast.success('스프린트 아카이브됨');
        loadCycles();
      } else {
        toast.error('스프린트 아카이브 실패');
      }
    } catch (error) {
      console.error('Failed to archive cycle:', error);
      toast.error('스프린트 아카이브에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditCycle = (cycle: LinearCycle) => {
    setEditingCycle(cycle);
    setFormData({
      name: cycle.name || '',
      description: cycle.description || '',
      startsAt: cycle.startsAt.split('T')[0],
      endsAt: cycle.endsAt.split('T')[0],
    });
  };

  const getCycleStatus = (cycle: LinearCycle) => {
    const now = new Date();
    const start = new Date(cycle.startsAt);
    const end = new Date(cycle.endsAt);

    if (cycle.completedAt) return 'completed';
    if (now < start) return 'upcoming';
    if (now > end) return 'past';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">진행중</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">예정</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">완료</Badge>;
      case 'past':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">종료</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Set default dates for new cycle (2 weeks starting next Monday)
  const setDefaultDates = () => {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    const twoWeeksLater = new Date(nextMonday);
    twoWeeksLater.setDate(nextMonday.getDate() + 13);

    setFormData({
      name: '',
      description: '',
      startsAt: formatDateForLinear(nextMonday),
      endsAt: formatDateForLinear(twoWeeksLater),
    });
  };

  if (!apiKey) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">스프린트</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            스프린트 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team Selector */}
          <div className="space-y-2">
            <Label>팀</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="팀 선택" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Cycle */}
          {activeCycle && (
            <Card className="p-4 border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-green-600" />
                  <span className="font-medium">현재 스프린트</span>
                </div>
                <Badge className="bg-green-500/10 text-green-600">진행중</Badge>
              </div>
              <h3 className="font-semibold">
                {activeCycle.name || `Cycle ${activeCycle.number}`}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(activeCycle.startsAt)} ~ {formatDate(activeCycle.endsAt)}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>진행률</span>
                  <span>{Math.round(activeCycle.progress * 100)}%</span>
                </div>
                <Progress value={activeCycle.progress * 100} />
              </div>
            </Card>
          )}

          {/* Create New Cycle */}
          <Dialog open={isCreateOpen || !!editingCycle} onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingCycle(null);
              setFormData({ name: '', description: '', startsAt: '', endsAt: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setDefaultDates();
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                새 스프린트 생성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCycle ? '스프린트 수정' : '새 스프린트 생성'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>이름 (선택)</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Sprint 이름"
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명 (선택)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="스프린트 목표..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={formData.startsAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
                    <Input
                      type="date"
                      value={formData.endsAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, endsAt: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={editingCycle ? handleUpdateCycle : handleCreateCycle}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingCycle ? '수정' : '생성'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cycle List */}
          <div className="space-y-2">
            <Label>스프린트 목록</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cycles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                스프린트가 없습니다
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cycles.map(cycle => {
                  const status = getCycleStatus(cycle);
                  const isSelected = selectedCycleId === cycle.id;

                  return (
                    <Card
                      key={cycle.id}
                      className={cn(
                        'p-3 cursor-pointer transition-colors hover:bg-muted/50',
                        isSelected && 'border-primary bg-primary/5'
                      )}
                      onClick={() => onCycleSelect?.(cycle.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {cycle.name || `Cycle ${cycle.number}`}
                            </span>
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formatDate(cycle.startsAt)} ~ {formatDate(cycle.endsAt)}
                          </p>
                          {cycle.progress > 0 && (
                            <Progress value={cycle.progress * 100} className="mt-2 h-1.5" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditCycle(cycle);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveCycle(cycle.id);
                            }}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
