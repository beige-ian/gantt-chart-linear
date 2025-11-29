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
import { Card } from './ui/card';
import { Users, UserPlus, Trash2, Mail, Briefcase, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'developer' | 'designer' | 'pm' | 'qa' | 'other';
  avatar?: string;
  color: string;
}

interface TeamManagerProps {
  members: TeamMember[];
  onMembersChange: (members: TeamMember[]) => void;
}

const roleLabels: Record<TeamMember['role'], string> = {
  developer: '개발자',
  designer: '디자이너',
  pm: 'PM',
  qa: 'QA',
  other: '기타',
};

const roleColors: Record<TeamMember['role'], string> = {
  developer: '#3b82f6',
  designer: '#ec4899',
  pm: '#8b5cf6',
  qa: '#10b981',
  other: '#6b7280',
};

const predefinedColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
];

export function TeamManager({ members, onMembersChange }: TeamManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'developer' as TeamMember['role'],
    color: predefinedColors[0],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'developer',
      color: predefinedColors[Math.floor(Math.random() * predefinedColors.length)],
    });
  };

  const handleAdd = () => {
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      color: formData.color,
    };

    onMembersChange([...members, newMember]);
    toast.success('팀원 추가됨', { description: newMember.name });
    resetForm();
    setIsAdding(false);
  };

  const handleUpdate = (id: string) => {
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }

    onMembersChange(members.map(m =>
      m.id === id ? {
        ...m,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        color: formData.color,
      } : m
    ));
    toast.success('팀원 정보 수정됨');
    setEditingId(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const member = members.find(m => m.id === id);
    onMembersChange(members.filter(m => m.id !== id));
    toast.success('팀원 삭제됨', { description: member?.name });
  };

  const startEditing = (member: TeamMember) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      color: member.color,
    });
    setIsAdding(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">팀 관리</span>
          {members.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {members.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            팀원 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new member button */}
          {!isAdding && !editingId && (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              새 팀원 추가
            </Button>
          )}

          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <Card className="p-4 space-y-4 border-primary/50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {isAdding ? '새 팀원 추가' : '팀원 정보 수정'}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>이름 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>

                <div className="space-y-2">
                  <Label>이메일</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>역할</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v as TeamMember['role'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>색상</Label>
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-lg transition-all ${
                          formData.color === color
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      resetForm();
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  >
                    <Check className="h-4 w-4" />
                    {editingId ? '수정' : '추가'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>아직 팀원이 없습니다</p>
                <p className="text-sm">위의 버튼을 눌러 팀원을 추가하세요</p>
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    editingId === member.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
                    style={{ backgroundColor: member.color }}
                  >
                    {getInitials(member.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{member.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: roleColors[member.role] }}
                      >
                        {roleLabels[member.role]}
                      </span>
                      {member.email && (
                        <span className="truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEditing(member)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {members.length > 0 && (
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">팀 구성:</span>{' '}
                {Object.entries(
                  members.reduce((acc, m) => {
                    acc[m.role] = (acc[m.role] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([role, count]) => `${roleLabels[role as TeamMember['role']]} ${count}명`).join(', ')}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing team members with localStorage
export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('team-members');
    if (saved) {
      try {
        setMembers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load team members:', e);
      }
    }
  }, []);

  const updateMembers = (newMembers: TeamMember[]) => {
    setMembers(newMembers);
    localStorage.setItem('team-members', JSON.stringify(newMembers));
  };

  return { members, updateMembers };
}
