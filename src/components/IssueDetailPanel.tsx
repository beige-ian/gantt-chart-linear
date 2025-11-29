import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from './ui/sheet';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import {
  X,
  MoreHorizontal,
  Calendar,
  User,
  MessageSquare,
  Activity,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Copy,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  ChevronRight,
  Hash,
  Tag,
  AlertOctagon,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Minus,
  Link2,
  GitBranch,
} from 'lucide-react';
import { SprintTask, STATUS_LABELS, PRIORITY_LABELS } from '../types/sprint';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import {
  fetchLinearIssueComments,
  fetchLinearIssueHistory,
  createLinearComment,
  LinearComment,
  LinearIssueHistory,
} from '../services/linear';

interface IssueDetailPanelProps {
  task: SprintTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: SprintTask) => void;
  onDelete: (taskId: string) => void;
}

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

const STATUSES: SprintTask['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES: SprintTask['priority'][] = ['urgent', 'high', 'medium', 'low', 'none'];

export function IssueDetailPanel({
  task,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: IssueDetailPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const [comments, setComments] = useState<LinearComment[]>([]);
  const [activities, setActivities] = useState<LinearIssueHistory[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('linear-api-key');
    setApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (task) {
      setTitle(task.name);
      setDescription(task.description || '');
    }
  }, [task]);

  useEffect(() => {
    if (open && task?.linearIssueId && apiKey) {
      loadLinearData();
    } else {
      setComments([]);
      setActivities([]);
    }
  }, [open, task?.linearIssueId, apiKey]);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown="status"]') && !target.closest('[data-dropdown="priority"]')) {
        setShowStatusMenu(false);
        setShowPriorityMenu(false);
      }
    };

    if (showStatusMenu || showPriorityMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusMenu, showPriorityMenu]);

  const loadLinearData = async () => {
    if (!task?.linearIssueId || !apiKey) return;

    setIsLoadingComments(true);
    setIsLoadingActivities(true);

    try {
      const [commentsData, historyData] = await Promise.all([
        fetchLinearIssueComments(apiKey, task.linearIssueId),
        fetchLinearIssueHistory(apiKey, task.linearIssueId),
      ]);
      setComments(commentsData);
      setActivities(historyData);
    } catch (error) {
      console.error('Failed to load Linear data:', error);
    } finally {
      setIsLoadingComments(false);
      setIsLoadingActivities(false);
    }
  };

  if (!task) return null;

  const isLinearLinked = !!task.linearIssueId && !!apiKey;
  const issueIdentifier = task.linearIssueId || `TASK-${task.id.slice(0, 4).toUpperCase()}`;

  const handleTitleSave = () => {
    if (title.trim() && title !== task.name) {
      onUpdate({ ...task, name: title.trim() });
    }
    setEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    if (description !== task.description) {
      onUpdate({ ...task, description });
    }
    setEditingDescription(false);
  };

  const handleStatusChange = (status: SprintTask['status']) => {
    onUpdate({ ...task, status });
    setShowStatusMenu(false);
  };

  const handlePriorityChange = (priority: SprintTask['priority']) => {
    onUpdate({ ...task, priority });
    setShowPriorityMenu(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !task.linearIssueId || !apiKey) return;

    setIsSubmittingComment(true);
    try {
      const success = await createLinearComment(apiKey, task.linearIssueId, newComment.trim());
      if (success) {
        toast.success('댓글이 작성되었습니다');
        setNewComment('');
        const updatedComments = await fetchLinearIssueComments(apiKey, task.linearIssueId);
        setComments(updatedComments);
      } else {
        toast.error('댓글 작성 실패');
      }
    } catch (error) {
      toast.error('댓글 작성 중 오류 발생');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return format(date, 'M월 d일', { locale: ko });
  };

  const getActivityDescription = (activity: LinearIssueHistory): string => {
    if (activity.fromState && activity.toState) {
      return `상태를 ${activity.fromState.name}에서 ${activity.toState.name}(으)로 변경`;
    }
    if (activity.fromAssignee || activity.toAssignee) {
      if (activity.toAssignee) {
        return `담당자를 ${activity.toAssignee.name}(으)로 지정`;
      }
      return '담당자 지정 해제';
    }
    if (activity.fromPriority !== activity.toPriority) {
      return '우선순위 변경';
    }
    return '변경됨';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-[#1f2023] border-l border-[#333438]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333438]">
          <div className="flex items-center gap-2">
            {STATUS_ICONS[task.status]}
            <span className="text-[13px] font-medium text-[#8b8b8f]">
              {issueIdentifier}
            </span>
            {isLinearLinked && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#5e6ad2]/20 text-[#5e6ad2] font-medium">
                Linear
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {task.linearIssueId && (
              <button
                onClick={() => window.open(`https://linear.app/issue/${task.linearIssueId}`, '_blank')}
                className="p-1.5 rounded hover:bg-[#333438] transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-[#8b8b8f]" />
              </button>
            )}
            <button className="p-1.5 rounded hover:bg-[#333438] transition-colors">
              <Copy className="h-4 w-4 text-[#8b8b8f]" />
            </button>
            <button className="p-1.5 rounded hover:bg-[#333438] transition-colors">
              <MoreHorizontal className="h-4 w-4 text-[#8b8b8f]" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded hover:bg-[#333438] transition-colors"
            >
              <X className="h-4 w-4 text-[#8b8b8f]" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Title */}
            <div>
              {editingTitle ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') {
                      setTitle(task.name);
                      setEditingTitle(false);
                    }
                  }}
                  className="text-xl font-semibold bg-transparent border-0 px-0 text-[#e2e2e3] focus-visible:ring-0 placeholder:text-[#6b6b6f]"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-xl font-semibold text-[#e2e2e3] cursor-text hover:bg-[#26272b] rounded px-2 -mx-2 py-1 transition-colors"
                  onClick={() => {
                    setTitle(task.name);
                    setEditingTitle(true);
                  }}
                >
                  {task.name}
                </h2>
              )}
            </div>

            {/* Properties */}
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center">
                <span className="text-[13px] text-[#6b6b6f] w-28">상태</span>
                <div className="relative" data-dropdown="status">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#333438] transition-colors"
                  >
                    {STATUS_ICONS[task.status]}
                    <span className="text-[13px] text-[#e2e2e3]">{STATUS_LABELS[task.status]}</span>
                    <ChevronRight className="h-3 w-3 text-[#6b6b6f]" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-[#26272b] border border-[#333438] rounded-lg shadow-xl z-50 py-1">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#333438] transition-colors',
                            task.status === status ? 'text-[#e2e2e3]' : 'text-[#8b8b8f]'
                          )}
                        >
                          {STATUS_ICONS[status]}
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center">
                <span className="text-[13px] text-[#6b6b6f] w-28">우선순위</span>
                <div className="relative" data-dropdown="priority">
                  <button
                    onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#333438] transition-colors"
                  >
                    {PRIORITY_ICONS[task.priority]}
                    <span className="text-[13px] text-[#e2e2e3]">{PRIORITY_LABELS[task.priority]}</span>
                    <ChevronRight className="h-3 w-3 text-[#6b6b6f]" />
                  </button>
                  {showPriorityMenu && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-[#26272b] border border-[#333438] rounded-lg shadow-xl z-50 py-1">
                      {PRIORITIES.map((priority) => (
                        <button
                          key={priority}
                          onClick={() => handlePriorityChange(priority)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#333438] transition-colors',
                            task.priority === priority ? 'text-[#e2e2e3]' : 'text-[#8b8b8f]'
                          )}
                        >
                          {PRIORITY_ICONS[priority]}
                          {PRIORITY_LABELS[priority]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-center">
                <span className="text-[13px] text-[#6b6b6f] w-28">담당자</span>
                <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#333438] transition-colors">
                  {task.assignee ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#5e6ad2] to-[#8b5cf6] flex items-center justify-center">
                        <span className="text-[9px] font-medium text-white">
                          {task.assignee.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[13px] text-[#e2e2e3]">{task.assignee}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full border border-dashed border-[#4b4b4f] flex items-center justify-center">
                        <User className="h-3 w-3 text-[#6b6b6f]" />
                      </div>
                      <span className="text-[13px] text-[#6b6b6f]">담당자 없음</span>
                    </>
                  )}
                </button>
              </div>

              {/* Due Date */}
              <div className="flex items-center">
                <span className="text-[13px] text-[#6b6b6f] w-28">마감일</span>
                <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#333438] transition-colors">
                  <Calendar className="h-4 w-4 text-[#8b8b8f]" />
                  <span className="text-[13px] text-[#e2e2e3]">
                    {format(task.endDate, 'M월 d일', { locale: ko })}
                  </span>
                </button>
              </div>

              {/* Story Points */}
              {task.storyPoints !== undefined && task.storyPoints > 0 && (
                <div className="flex items-center">
                  <span className="text-[13px] text-[#6b6b6f] w-28">스토리 포인트</span>
                  <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#333438] transition-colors">
                    <Hash className="h-4 w-4 text-[#8b8b8f]" />
                    <span className="text-[13px] text-[#e2e2e3]">{task.storyPoints}</span>
                  </button>
                </div>
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div className="flex items-start">
                  <span className="text-[13px] text-[#6b6b6f] w-28 pt-1">라벨</span>
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels.map((label, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[12px] bg-[#333438] text-[#8b8b8f]"
                      >
                        {typeof label === 'object' ? label.name : label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#333438]" />

            {/* Description */}
            <div>
              <h3 className="text-[13px] font-medium text-[#8b8b8f] mb-2">설명</h3>
              {editingDescription ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  className="min-h-[100px] resize-none bg-[#26272b] border-[#333438] text-[13px] text-[#e2e2e3] placeholder:text-[#6b6b6f] focus:border-[#5e6ad2]"
                  placeholder="설명을 입력하세요..."
                  autoFocus
                />
              ) : (
                <div
                  className={cn(
                    'min-h-[60px] p-3 rounded-lg cursor-text hover:bg-[#26272b] text-[13px] whitespace-pre-wrap transition-colors',
                    task.description ? 'text-[#e2e2e3]' : 'text-[#6b6b6f]'
                  )}
                  onClick={() => {
                    setDescription(task.description || '');
                    setEditingDescription(true);
                  }}
                >
                  {task.description || '설명 추가...'}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#333438]" />

            {/* Tabs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      'flex items-center gap-2 pb-2 text-[13px] font-medium border-b-2 transition-colors',
                      activeTab === 'comments'
                        ? 'text-[#e2e2e3] border-[#5e6ad2]'
                        : 'text-[#6b6b6f] border-transparent hover:text-[#8b8b8f]'
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    댓글 {comments.length > 0 && `(${comments.length})`}
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      'flex items-center gap-2 pb-2 text-[13px] font-medium border-b-2 transition-colors',
                      activeTab === 'activity'
                        ? 'text-[#e2e2e3] border-[#5e6ad2]'
                        : 'text-[#6b6b6f] border-transparent hover:text-[#8b8b8f]'
                    )}
                  >
                    <Activity className="h-4 w-4" />
                    활동
                  </button>
                </div>
                {isLinearLinked && (
                  <button
                    onClick={loadLinearData}
                    disabled={isLoadingComments || isLoadingActivities}
                    className="p-1.5 rounded hover:bg-[#333438] transition-colors"
                  >
                    <RefreshCw className={cn('h-4 w-4 text-[#8b8b8f]', (isLoadingComments || isLoadingActivities) && 'animate-spin')} />
                  </button>
                )}
              </div>

              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* New Comment Input */}
                  {isLinearLinked ? (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5e6ad2] to-[#8b5cf6] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-medium text-white">나</span>
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder="댓글을 입력하세요... (Linear에 동기화됩니다)"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[80px] resize-none bg-[#26272b] border-[#333438] text-[13px] text-[#e2e2e3] placeholder:text-[#6b6b6f] focus:border-[#5e6ad2]"
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              handleSubmitComment();
                            }
                          }}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[11px] text-[#6b6b6f]">⌘+Enter로 전송</span>
                          <button
                            disabled={!newComment.trim() || isSubmittingComment}
                            onClick={handleSubmitComment}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                              newComment.trim()
                                ? 'bg-[#5e6ad2] hover:bg-[#6872d9] text-white'
                                : 'bg-[#333438] text-[#6b6b6f] cursor-not-allowed'
                            )}
                          >
                            {isSubmittingComment ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                댓글 작성
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 rounded-lg bg-[#26272b] border border-[#333438]">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-[#6b6b6f]" />
                      <p className="text-[13px] text-[#6b6b6f]">Linear와 연결된 이슈만 댓글을 작성할 수 있습니다</p>
                    </div>
                  )}

                  {/* Comments List */}
                  {isLoadingComments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#6b6b6f]" />
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#333438] flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-medium text-[#8b8b8f]">
                              {comment.user?.name?.slice(0, 2) || '?'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-[#e2e2e3]">
                                {comment.user?.displayName || comment.user?.name || '알 수 없음'}
                              </span>
                              <span className="text-[11px] text-[#6b6b6f]">
                                {formatRelativeTime(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#8b8b8f] mt-1 whitespace-pre-wrap">{comment.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isLinearLinked ? (
                    <div className="text-center py-8 text-[#6b6b6f]">
                      <p className="text-[13px]">아직 댓글이 없습니다</p>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'activity' && (
                <div>
                  {isLoadingActivities ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#6b6b6f]" />
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="w-8 flex justify-center pt-1">
                            <div className="w-2 h-2 rounded-full bg-[#333438]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px]">
                              <span className="font-medium text-[#e2e2e3]">{activity.actor?.name || '시스템'}</span>
                              <span className="text-[#8b8b8f]"> {getActivityDescription(activity)}</span>
                            </p>
                            <span className="text-[11px] text-[#6b6b6f]">
                              {formatRelativeTime(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isLinearLinked ? (
                    <div className="text-center py-8 text-[#6b6b6f]">
                      <p className="text-[13px]">활동 기록이 없습니다</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 rounded-lg bg-[#26272b] border border-[#333438]">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-[#6b6b6f]" />
                      <p className="text-[13px] text-[#6b6b6f]">Linear와 연결된 이슈만 활동 기록을 볼 수 있습니다</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#333438]">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-[#8b8b8f] hover:bg-[#333438] transition-colors">
              <Link2 className="h-3.5 w-3.5" />
              링크 연결
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-[#8b8b8f] hover:bg-[#333438] transition-colors">
              <GitBranch className="h-3.5 w-3.5" />
              브랜치 생성
            </button>
          </div>
          <button
            onClick={() => {
              onDelete(task.id);
              onOpenChange(false);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
