import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Trash2, Loader2, User, Tag, Check } from 'lucide-react';
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
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];

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

  // Linear integration states
  const [linearMembers, setLinearMembers] = useState<LinearMember[]>([]);
  const [linearLabels, setLinearLabels] = useState<LinearLabel[]>([]);
  const [isLoadingLinear, setIsLoadingLinear] = useState(false);
  const [hasLinearConnection, setHasLinearConnection] = useState(false);

  // Load Linear data
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
      alert('End date must be after start date');
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
      // Include Linear-specific fields for API calls
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
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Task Name */}
      <div className="space-y-2">
        <Label htmlFor="taskName">Task Name *</Label>
        <Input
          id="taskName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter task name"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add a description..."
          rows={3}
        />
      </div>

      {/* Sprint & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sprint</Label>
          <Select
            value={formData.sprintId}
            onValueChange={(value) => setFormData({ ...formData, sprintId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Backlog (No Sprint)</SelectItem>
              {sprints.filter(s => s.status !== 'completed').map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name} {sprint.status === 'active' ? '(Active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as SprintTask['status'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Priority & Story Points */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as SprintTask['priority'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Story Points</Label>
          <Select
            value={formData.storyPoints.toString()}
            onValueChange={(value) => setFormData({ ...formData, storyPoints: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STORY_POINTS.map(points => (
                <SelectItem key={points} value={points.toString()}>
                  {points === 0 ? 'Not estimated' : `${points} points`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Due Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Assignee
          {isLoadingLinear && <Loader2 className="h-3 w-3 animate-spin" />}
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
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Unassigned</span>
              </SelectItem>
              {linearMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
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
            placeholder="Assign to..."
          />
        )}
      </div>

      {/* Progress (only if not done) */}
      {formData.status !== 'done' && (
        <div className="space-y-2">
          <Label>Progress: {formData.progress}%</Label>
          <Slider
            value={[formData.progress]}
            onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
            max={100}
            step={10}
          />
        </div>
      )}

      {/* Labels */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Labels
        </Label>

        {/* Linear Labels Selection */}
        {hasLinearConnection && linearLabels.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-2">Linear Labels</p>
            <div className="flex flex-wrap gap-2">
              {linearLabels.map(label => {
                const isSelected = formData.labelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleLabelToggle(label.id, label.name)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5",
                      isSelected
                        ? "border-transparent text-white"
                        : "border-border hover:border-primary/50 text-foreground"
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
            placeholder="Add custom label"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
          />
          <Button type="button" variant="outline" onClick={handleAddLabel}>
            Add
          </Button>
        </div>

        {/* Display selected/custom labels */}
        {formData.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.labels.map(label => {
              const linearLabel = linearLabels.find(l => l.name === label);
              return (
                <span
                  key={label}
                  className="px-2 py-1 text-sm rounded-md flex items-center gap-1"
                  style={{
                    backgroundColor: linearLabel?.color || 'hsl(var(--muted))',
                    color: linearLabel ? 'white' : 'inherit',
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
                    className="text-current opacity-70 hover:opacity-100"
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
        <Label>Color</Label>
        <div className="flex gap-2 flex-wrap">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-md border-2 transition-all ${
                formData.color === color
                  ? 'border-foreground scale-110'
                  : 'border-border hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {onDelete && (
            <Button type="button" variant="destructive" size="sm" onClick={onDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </div>
    </form>
  );
}
