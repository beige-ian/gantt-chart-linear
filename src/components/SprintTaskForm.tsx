import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Trash2,
  Loader2,
  User,
  Tag,
  Check,
  Calendar,
  Circle,
  Timer,
  AlertCircle,
  CheckCircle2,
  AlertOctagon,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Minus,
  Hash,
} from 'lucide-react';
import { SprintTask, Sprint, STATUS_LABELS, PRIORITY_LABELS } from '../types/sprint';
import { fetchLinearTeamMembers, fetchLinearLabels, fetchLinearTeams } from '../services/linear';
import { cn } from './ui/utils';

interface LinearMember {
  id: string;
  name: string;
  displayName: string;
  email: string;
}

interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

interface SprintTaskFormProps {
  task?: SprintTask | null;
  sprints: Sprint[];
  currentSprintId?: string;
  onSubmit: (taskData: Omit<SprintTask, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const predefinedColors = [
  '#5e6ad2', // Linear purple
  '#4da568', // Green
  '#f2c94c', // Yellow
  '#f87171', // Red
  '#bb87fc', // Purple
  '#60a5fa', // Blue
  '#f2994a', // Orange
  '#84cc16', // Lime
];

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];

const STATUS_ICONS: Record<SprintTask['status'], React.ReactNode> = {
  backlog: <Circle className="h-4 w-4 text-[#95959f]" strokeWidth={1.5} />,
  todo: <Circle className="h-4 w-4 text-[#e2e2e3]" strokeWidth={2} />,
  in_progress: <Timer className="h-4 w-4 text-[#f2c94c]" />,
  in_review: <AlertCircle className="h-4 w-4 text-[#bb87fc]" />,
  done: <CheckCircle2 className="h-4 w-4 text-[#4da568]" />,
};

const PRIORITY_ICONS: Record<SprintTask['priority'], React.ReactNode> = {
  urgent: <AlertOctagon className="h-4 w-4 text-[#f87171]" fill="#f87171" />,
  high: <SignalHigh className="h-4 w-4 text-[#fb923c]" />,
  medium: <SignalMedium className="h-4 w-4 text-[#facc15]" />,
  low: <SignalLow className="h-4 w-4 text-[#60a5fa]" />,
  none: <Minus className="h-4 w-4 text-[#6b7280]" />,
};

export function SprintTaskForm({
  task,
  sprints,
  currentSprintId,
  onSubmit,
  onDelete,
  onCancel
}: SprintTaskFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    progress: 0,
    color: predefinedColors[0],
    status: 'todo' as SprintTask['status'],
    priority: 'medium' as SprintTask['priority'],
    storyPoints: 0,
    assignee: '',
    assigneeId: '',
    sprintId: currentSprintId || '',
    labels: [] as string[],
    labelIds: [] as string[],
  });

  const [labelInput, setLabelInput] = useState('');
  const [linearMembers, setLinearMembers] = useState<LinearMember[]>([]);
  const [linearLabels, setLinearLabels] = useState<LinearLabel[]>([]);
  const [isLoadingLinear, setIsLoadingLinear] = useState(false);
  const [hasLinearConnection, setHasLinearConnection] = useState(false);

  useEffect(() => {
    const loadLinearData = async () => {
      const apiKey = localStorage.getItem('linear-api-key');
      if (!apiKey) {
        setHasLinearConnection(false);
        setIsLoadingLinear(false);
        return;
      }

      setIsLoadingLinear(true);

      try {
        const teams = await fetchLinearTeams(apiKey);
        if (teams.length > 0) {
          setHasLinearConnection(true);
          const teamId = teams[0].id;
          const [members, labels] = await Promise.all([
            fetchLinearTeamMembers(apiKey, teamId),
            fetchLinearLabels(apiKey, teamId),
          ]);
          setLinearMembers(members || []);
          setLinearLabels(labels || []);
        } else {
          setHasLinearConnection(false);
        }
      } catch (error) {
        console.error('Failed to load Linear data:', error);
        setHasLinearConnection(false);
        setLinearMembers([]);
        setLinearLabels([]);
      } finally {
        setIsLoadingLinear(false);
      }
    };

    loadLinearData();
  }, []);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        startDate: task.startDate.toISOString().split('T')[0],
        endDate: task.endDate.toISOString().split('T')[0],
        progress: task.progress,
        color: task.color,
        status: task.status,
        priority: task.priority,
        storyPoints: task.storyPoints || 0,
        assignee: task.assignee || '',
        assigneeId: (task as any).assigneeId || '',
        sprintId: task.sprintId || currentSprintId || '',
        labels: task.labels || [],
        labelIds: (task as any).labelIds || [],
      });
    } else {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      setFormData({
        name: '',
        description: '',
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        progress: 0,
        color: predefinedColors[Math.floor(Math.random() * predefinedColors.length)],
        status: 'todo',
        priority: 'medium',
        storyPoints: 0,
        assignee: '',
        assigneeId: '',
        sprintId: currentSprintId || '',
        labels: [],
        labelIds: [],
      });
    }
  }, [task, currentSprintId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate <= startDate) {
      alert('마감일은 시작일 이후여야 합니다');
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      startDate,
      endDate,
      progress: formData.status === 'done' ? 100 : formData.progress,
      color: formData.color,
      status: formData.status,
      priority: formData.priority,
      storyPoints: formData.storyPoints || undefined,
      assignee: formData.assignee.trim() || undefined,
      sprintId: formData.sprintId || undefined,
      labels: formData.labels.length > 0 ? formData.labels : undefined,
      ...(formData.assigneeId && { assigneeId: formData.assigneeId }),
      ...(formData.labelIds.length > 0 && { labelIds: formData.labelIds }),
    } as any);
  };

  const handleAssigneeChange = (memberId: string) => {
    const member = linearMembers.find(m => m.id === memberId);
    setFormData({
      ...formData,
      assigneeId: memberId,
      assignee: member?.displayName || member?.name || '',
    });
  };

  const handleLabelToggle = (labelId: string, labelName: string) => {
    const hasLabel = formData.labelIds.includes(labelId);
    if (hasLabel) {
      setFormData({
        ...formData,
        labelIds: formData.labelIds.filter(id => id !== labelId),
        labels: formData.labels.filter(name => name !== labelName),
      });
    } else {
      setFormData({
        ...formData,
        labelIds: [...formData.labelIds, labelId],
        labels: [...formData.labels, labelName],
      });
    }
  };

  const handleAddLabel = () => {
    if (labelInput.trim() && !formData.labels.includes(labelInput.trim())) {
      setFormData({ ...formData, labels: [...formData.labels, labelInput.trim()] });
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setFormData({ ...formData, labels: formData.labels.filter(l => l !== label) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
      {/* Task Name */}
      <div className="space-y-2">
        <Label htmlFor="taskName" className="text-[13px] text-[#e2e2e3]">이슈 제목 *</Label>
        <Input
          id="taskName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="이슈 제목을 입력하세요"
          required
          className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3] placeholder:text-[#6b6b6f] focus:border-[#5e6ad2]"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-[13px] text-[#e2e2e3]">설명</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="설명을 추가하세요..."
          rows={3}
          className="resize-none bg-[#26272b] border-[#333438] text-[#e2e2e3] placeholder:text-[#6b6b6f] focus:border-[#5e6ad2]"
        />
      </div>

      {/* Status & Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[13px] text-[#e2e2e3]">상태</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as SprintTask['status'] })}
          >
            <SelectTrigger className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#26272b] border-[#333438]">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-[#e2e2e3] focus:bg-[#333438]">
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[value as SprintTask['status']]}
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[13px] text-[#e2e2e3]">우선순위</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as SprintTask['priority'] })}
          >
            <SelectTrigger className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#26272b] border-[#333438]">
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-[#e2e2e3] focus:bg-[#333438]">
                  <div className="flex items-center gap-2">
                    {PRIORITY_ICONS[value as SprintTask['priority']]}
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sprint & Story Points */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[13px] text-[#e2e2e3]">스프린트</Label>
          <Select
            value={formData.sprintId}
            onValueChange={(value) => setFormData({ ...formData, sprintId: value })}
          >
            <SelectTrigger className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]">
              <SelectValue placeholder="스프린트 선택" />
            </SelectTrigger>
            <SelectContent className="bg-[#26272b] border-[#333438]">
              <SelectItem value="" className="text-[#8b8b8f] focus:bg-[#333438]">
                백로그 (스프린트 미지정)
              </SelectItem>
              {sprints.filter(s => s.status !== 'completed').map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id} className="text-[#e2e2e3] focus:bg-[#333438]">
                  {sprint.name} {sprint.status === 'active' ? '(활성)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[13px] text-[#e2e2e3] flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            스토리 포인트
          </Label>
          <Select
            value={formData.storyPoints.toString()}
            onValueChange={(value) => setFormData({ ...formData, storyPoints: parseInt(value) })}
          >
            <SelectTrigger className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#26272b] border-[#333438]">
              {STORY_POINTS.map(points => (
                <SelectItem key={points} value={points.toString()} className="text-[#e2e2e3] focus:bg-[#333438]">
                  {points === 0 ? '미정' : `${points} 포인트`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-[13px] text-[#e2e2e3] flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            시작일
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
            className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-[13px] text-[#e2e2e3] flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            마감일
          </Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
            className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]"
          />
        </div>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label className="text-[13px] text-[#e2e2e3] flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          담당자
          {isLoadingLinear && <Loader2 className="h-3 w-3 animate-spin text-[#5e6ad2]" />}
        </Label>
        {hasLinearConnection && linearMembers.length > 0 ? (
          <Select
            value={formData.assigneeId || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                setFormData({ ...formData, assigneeId: '', assignee: '' });
              } else {
                handleAssigneeChange(value);
              }
            }}
          >
            <SelectTrigger className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3]">
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent className="bg-[#26272b] border-[#333438]">
              <SelectItem value="none" className="text-[#8b8b8f] focus:bg-[#333438]">
                미할당
              </SelectItem>
              {linearMembers.map(member => (
                <SelectItem key={member.id} value={member.id} className="text-[#e2e2e3] focus:bg-[#333438]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#5e6ad2] to-[#8b5cf6] flex items-center justify-center text-[9px] font-medium text-white">
                      {(member.displayName || member.name).slice(0, 2).toUpperCase()}
                    </div>
                    {member.displayName || member.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="assignee"
            value={formData.assignee}
            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
            placeholder="담당자 이름"
            className="h-9 bg-[#26272b] border-[#333438] text-[#e2e2e3] placeholder:text-[#6b6b6f]"
          />
        )}
      </div>

      {/* Progress (only if not done) */}
      {formData.status !== 'done' && (
        <div className="space-y-2">
          <Label className="text-[13px] text-[#e2e2e3]">진행률: {formData.progress}%</Label>
          <Slider
            value={[formData.progress]}
            onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
            max={100}
            step={10}
            className="[&_[role=slider]]:bg-[#5e6ad2] [&_[role=slider]]:border-[#5e6ad2]"
          />
        </div>
      )}

      {/* Labels */}
      <div className="space-y-2">
        <Label className="text-[13px] text-[#e2e2e3] flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          라벨
        </Label>

        {/* Linear Labels Selection */}
        {hasLinearConnection && linearLabels.length > 0 && (
          <div className="border border-[#333438] rounded-lg p-3 space-y-2 bg-[#1f2023]">
            <p className="text-[11px] text-[#6b6b6f] mb-2">Linear 라벨</p>
            <div className="flex flex-wrap gap-2">
              {linearLabels.map(label => {
                const isSelected = formData.labelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleLabelToggle(label.id, label.name)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] rounded-full border transition-all flex items-center gap-1.5",
                      isSelected
                        ? "border-transparent text-white"
                        : "border-[#333438] hover:border-[#5e6ad2]/50 text-[#8b8b8f]"
                    )}
                    style={{
                      backgroundColor: isSelected ? label.color : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Labels Input */}
        <div className="flex gap-2">
          <Input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="커스텀 라벨 추가"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
            className="h-8 bg-[#26272b] border-[#333438] text-[#e2e2e3] placeholder:text-[#6b6b6f] text-[13px]"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddLabel}
            className="h-8 bg-[#26272b] border-[#333438] text-[#8b8b8f] hover:bg-[#333438] hover:text-[#e2e2e3] text-[13px]"
          >
            추가
          </Button>
        </div>

        {/* Display selected/custom labels */}
        {formData.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {formData.labels.map(label => {
              const linearLabel = linearLabels.find(l => l.name === label);
              return (
                <span
                  key={label}
                  className="px-2 py-1 text-[11px] rounded-md flex items-center gap-1"
                  style={{
                    backgroundColor: linearLabel?.color || '#333438',
                    color: linearLabel ? 'white' : '#8b8b8f',
                  }}
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveLabel(label);
                      if (linearLabel) {
                        setFormData(prev => ({
                          ...prev,
                          labelIds: prev.labelIds.filter(id => id !== linearLabel.id),
                        }));
                      }
                    }}
                    className="text-current opacity-70 hover:opacity-100 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label className="text-[13px] text-[#e2e2e3]">색상</Label>
        <div className="flex gap-2 flex-wrap">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "w-7 h-7 rounded-md border-2 transition-all",
                formData.color === color
                  ? "border-[#e2e2e3] scale-110"
                  : "border-transparent hover:scale-105 hover:border-[#333438]"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-[#333438]">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="gap-2 bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171]/20 border-0"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-[#26272b] border-[#333438] text-[#8b8b8f] hover:bg-[#333438] hover:text-[#e2e2e3]"
          >
            취소
          </Button>
          <Button
            type="submit"
            className="bg-[#5e6ad2] hover:bg-[#6872d9] text-white border-0"
          >
            {task ? '이슈 수정' : '이슈 생성'}
          </Button>
        </div>
      </div>
    </form>
  );
}
