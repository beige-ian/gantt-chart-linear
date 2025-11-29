import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  X,
  MoreHorizontal,
  Calendar,
  User,
  Hash,
  MessageSquare,
  Activity,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Flag,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react';
import { SprintTask, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types/sprint';
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
  backlog: <Circle className="h-4 w-4" style={{ color: '#9b9a97' }} />,
  todo: <Circle className="h-4 w-4" style={{ color: '#787774' }} strokeWidth={2.5} />,
  in_progress: <Timer className="h-4 w-4" style={{ color: '#5e6ad2' }} />,
  in_review: <AlertCircle className="h-4 w-4" style={{ color: '#f2994a' }} />,
  done: <CheckCircle2 className="h-4 w-4" style={{ color: '#0f783c' }} />,
};

const STATUSES: SprintTask['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES: SprintTask['priority'][] = ['none', 'low', 'medium', 'high', 'urgent'];

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
  const [activeTab, setActiveTab] = useState('details');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Linear data states
  const [comments, setComments] = useState<LinearComment[]>([]);
  const [activities, setActivities] = useState<LinearIssueHistory[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Load API key
  useEffect(() => {
    const savedKey = localStorage.getItem('linear-api-key');
    setApiKey(savedKey);
  }, []);

  // Sync title and description when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.name);
      setDescription(task.description || '');
    }
  }, [task]);

  // Fetch Linear comments and activities when panel opens
  useEffect(() => {
    if (open && task?.linearIssueId && apiKey) {
      loadLinearData();
    } else {
      // Clear data when no Linear connection
      setComments([]);
      setActivities([]);
    }
  }, [open, task?.linearIssueId, apiKey]);

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
  };

  const handlePriorityChange = (priority: SprintTask['priority']) => {
    onUpdate({ ...task, priority });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !task.linearIssueId || !apiKey) return;

    setIsSubmittingComment(true);
    try {
      const success = await createLinearComment(apiKey, task.linearIssueId, newComment.trim());
      if (success) {
        toast.success('댓글이 작성되었습니다');
        setNewComment('');
        // Reload comments
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
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {STATUS_ICONS[task.status]}
            <SheetTitle className="text-sm font-medium">
              {task.linearIssueId || `TASK-${task.id.slice(0, 4).toUpperCase()}`}
            </SheetTitle>
            {isLinearLinked && (
              <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-300">
                Linear
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {task.linearIssueId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(`https://linear.app/issue/${task.linearIssueId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Copy className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  링크 복사
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    onDelete(task.id);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
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
                  className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-semibold cursor-text hover:bg-accent/50 rounded px-1 -mx-1 py-1"
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
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24">상태</span>
                <Select value={task.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 w-auto border-0 bg-transparent hover:bg-accent px-2 -ml-2">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {STATUS_ICONS[task.status]}
                        <span>{STATUS_LABELS[task.status]}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          {STATUS_ICONS[status]}
                          {STATUS_LABELS[status]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24">우선순위</span>
                <Select value={task.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 w-auto border-0 bg-transparent hover:bg-accent px-2 -ml-2">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Flag
                          className="h-4 w-4"
                          style={{ color: PRIORITY_COLORS[task.priority] }}
                        />
                        <span>{PRIORITY_LABELS[task.priority]}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        <div className="flex items-center gap-2">
                          <Flag
                            className="h-4 w-4"
                            style={{ color: PRIORITY_COLORS[priority] }}
                          />
                          {PRIORITY_LABELS[priority]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24">담당자</span>
                <div className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-accent cursor-pointer">
                  {task.assignee ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.assignee.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee}</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">담당자 없음</span>
                    </>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24">마감일</span>
                <div className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-accent cursor-pointer">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(task.endDate, 'M월 d일', { locale: ko })}
                  </span>
                </div>
              </div>

              {/* Story Points */}
              {task.storyPoints !== undefined && task.storyPoints > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-24">스토리 포인트</span>
                  <div className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-accent cursor-pointer">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.storyPoints}</span>
                  </div>
                </div>
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="text-sm text-muted-foreground w-24 pt-1">라벨</span>
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels.map((label, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium mb-2">설명</h3>
              {editingDescription ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  className="min-h-[100px] resize-none"
                  placeholder="설명을 입력하세요..."
                  autoFocus
                />
              ) : (
                <div
                  className={cn(
                    'min-h-[60px] p-2 -mx-2 rounded cursor-text hover:bg-accent/50 text-sm whitespace-pre-wrap',
                    !task.description && 'text-muted-foreground'
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

            <Separator />

            {/* Tabs for Comments/Activity */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList className="h-9 bg-transparent p-0 border-b rounded-none">
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    댓글 {comments.length > 0 && `(${comments.length})`}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    활동
                  </TabsTrigger>
                </TabsList>
                {isLinearLinked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={loadLinearData}
                    disabled={isLoadingComments || isLoadingActivities}
                  >
                    <RefreshCw className={cn('h-4 w-4', (isLoadingComments || isLoadingActivities) && 'animate-spin')} />
                  </Button>
                )}
              </div>

              <TabsContent value="details" className="mt-4 space-y-4">
                {/* New Comment Input - Only show if Linear linked */}
                {isLinearLinked ? (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">나</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="댓글을 입력하세요... (Linear에 동기화됩니다)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            handleSubmitComment();
                          }
                        }}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">⌘+Enter로 전송</span>
                        <Button
                          size="sm"
                          disabled={!newComment.trim() || isSubmittingComment}
                          onClick={handleSubmitComment}
                        >
                          {isSubmittingComment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              댓글 작성
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Linear와 연결된 이슈만 댓글을 작성할 수 있습니다</p>
                  </div>
                )}

                {/* Comments List */}
                {isLoadingComments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {comment.user?.name?.slice(0, 2) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {comment.user?.displayName || comment.user?.name || '알 수 없음'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isLinearLinked ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">아직 댓글이 없습니다</p>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                {isLoadingActivities ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-8 flex justify-center">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-2" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.actor?.name || '시스템'}</span>
                            <span className="text-muted-foreground"> {getActivityDescription(activity)}</span>
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isLinearLinked ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">활동 기록이 없습니다</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Linear와 연결된 이슈만 활동 기록을 볼 수 있습니다</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
