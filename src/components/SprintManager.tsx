import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Plus, Calendar, Target, Users, ChevronRight, Play, CheckCircle2, Clock } from 'lucide-react';
import { Sprint } from '../types/sprint';

interface SprintManagerProps {
  sprints: Sprint[];
  currentSprintId?: string;
  onCreateSprint: (sprint: Omit<Sprint, 'id'>) => void;
  onUpdateSprint: (sprint: Sprint) => void;
  onSelectSprint: (sprintId: string) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
}

export function SprintManager({
  sprints,
  currentSprintId,
  onCreateSprint,
  onUpdateSprint,
  onSelectSprint,
  onStartSprint,
  onCompleteSprint,
}: SprintManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    capacity: 0,
  });

  const currentSprint = sprints.find(s => s.id === currentSprintId);
  const activeSprint = sprints.find(s => s.status === 'active');
  const planningSprints = sprints.filter(s => s.status === 'planning');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) return;

    onCreateSprint({
      name: formData.name.trim(),
      goal: formData.goal.trim() || undefined,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: 'planning',
      capacity: formData.capacity || undefined,
    });

    setFormData({ name: '', goal: '', startDate: '', endDate: '', capacity: 0 });
    setIsDialogOpen(false);
  };

  const getSprintDuration = (sprint: Sprint) => {
    const days = Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  const getSprintProgress = (sprint: Sprint) => {
    const now = new Date();
    const total = sprint.endDate.getTime() - sprint.startDate.getTime();
    const elapsed = now.getTime() - sprint.startDate.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getStatusBadge = (status: Sprint['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">Active</Badge>;
      case 'planning':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Planning</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Completed</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Sprint Selector Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={currentSprintId || ''} onValueChange={onSelectSprint}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Sprint" />
            </SelectTrigger>
            <SelectContent>
              {activeSprint && (
                <SelectItem value={activeSprint.id}>
                  {activeSprint.name} (Active)
                </SelectItem>
              )}
              {planningSprints.map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </SelectItem>
              ))}
              {completedSprints.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Completed</div>
                  {completedSprints.slice(0, 5).map(sprint => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Sprint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sprint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sprintName">Sprint Name</Label>
                <Input
                  id="sprintName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sprint 24-01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sprintGoal">Sprint Goal (Optional)</Label>
                <Input
                  id="sprintGoal"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="What do you want to achieve?"
                />
              </div>

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
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Team Capacity (Story Points)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Sprint</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Sprint Info */}
      {currentSprint && (
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{currentSprint.name}</h3>
                {getStatusBadge(currentSprint.status)}
              </div>
              {currentSprint.goal && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {currentSprint.goal}
                </p>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(currentSprint.startDate)} - {formatDate(currentSprint.endDate)} ({getSprintDuration(currentSprint)})
              </p>
              {currentSprint.capacity && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Capacity: {currentSprint.capacity} points
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentSprint.status === 'planning' && (
                <Button
                  size="sm"
                  onClick={() => onStartSprint(currentSprint.id)}
                  className="gap-1"
                >
                  <Play className="h-3 w-3" />
                  Start Sprint
                </Button>
              )}
              {currentSprint.status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCompleteSprint(currentSprint.id)}
                  className="gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </Button>
              )}
            </div>
          </div>

          {/* Sprint Progress Bar */}
          {currentSprint.status === 'active' && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Sprint Progress</span>
                <span>{Math.round(getSprintProgress(currentSprint))}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${getSprintProgress(currentSprint)}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
