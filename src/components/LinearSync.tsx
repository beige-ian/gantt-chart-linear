import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { RefreshCw, Link2, Check, Loader2 } from 'lucide-react';
import {
  fetchLinearTeams,
  fetchLinearProjects,
  fetchLinearIssues,
  convertLinearToTasks,
  validateLinearApiKey,
  LinearTeam,
  LinearProject,
  LinearIssue,
} from '../services/linear';

interface LinearSyncProps {
  onImport: (tasks: ReturnType<typeof convertLinearToTasks>) => void;
  importedProjectIds?: string[];
}

export function LinearSync({ onImport, importedProjectIds = [] }: LinearSyncProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [projects, setProjects] = useState<LinearProject[]>([]);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [step, setStep] = useState<'api-key' | 'select-team' | 'select-projects'>('api-key');

  // Load saved API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('linear-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) return;

    setIsValidating(true);
    try {
      const valid = await validateLinearApiKey(apiKey);
      setIsValid(valid);

      if (valid) {
        localStorage.setItem('linear-api-key', apiKey);
        const fetchedTeams = await fetchLinearTeams(apiKey);
        setTeams(fetchedTeams);
        setStep('select-team');
      }
    } catch (error) {
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSelectTeam = async (teamId: string) => {
    setSelectedTeam(teamId);
    setIsLoading(true);

    const actualTeamId = teamId === 'all' ? undefined : teamId;

    try {
      const [fetchedProjects, fetchedIssues] = await Promise.all([
        fetchLinearProjects(apiKey, actualTeamId),
        fetchLinearIssues(apiKey, undefined, actualTeamId),
      ]);

      // Filter to only show active projects (started, backlog)
      const activeProjects = fetchedProjects.filter(p =>
        p.state === 'started' || p.state === 'backlog' || p.state === 'planned'
      );

      setProjects(activeProjects);
      setIssues(fetchedIssues);
      setStep('select-projects');
    } catch (error) {
      console.error('Failed to fetch Linear data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const handleImport = () => {
    const tasks = convertLinearToTasks(projects, issues, Array.from(selectedProjects));
    onImport(tasks);
    setIsOpen(false);
    setStep('api-key');
    setSelectedProjects(new Set());
  };

  const getProjectIssueCount = (projectId: string) => {
    return issues.filter(i => i.project?.id === projectId).length;
  };

  const getProjectStateLabel = (state: string) => {
    switch (state) {
      case 'started': return 'In Progress';
      case 'backlog': return 'Backlog';
      case 'planned': return 'Planned';
      case 'completed': return 'Completed';
      case 'canceled': return 'Canceled';
      default: return state;
    }
  };

  const resetDialog = () => {
    setStep('api-key');
    setIsValid(null);
    setSelectedTeam('');
    setProjects([]);
    setIssues([]);
    setSelectedProjects(new Set());
  };

  // Refresh from Linear - re-import currently imported projects
  const handleRefresh = async () => {
    if (!apiKey || importedProjectIds.length === 0) return;

    setIsRefreshing(true);
    try {
      const [fetchedProjects, fetchedIssues] = await Promise.all([
        fetchLinearProjects(apiKey),
        fetchLinearIssues(apiKey),
      ]);

      const tasks = convertLinearToTasks(fetchedProjects, fetchedIssues, importedProjectIds);
      onImport(tasks);
    } catch (error) {
      console.error('Failed to refresh from Linear:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasImportedProjects = importedProjectIds.length > 0;

  return (
    <div className="flex gap-1">
      {/* Refresh button - only show if there are imported projects */}
      {hasImportedProjects && apiKey && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh from Linear"
          className="h-10 w-10"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetDialog();
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2.5 h-10 text-[15px] font-semibold">
            <Link2 className="h-5 w-5" />
            Linear
          </Button>
        </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Linear Import</DialogTitle>
        </DialogHeader>

        {step === 'api-key' && (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="apiKey" className="text-[15px] font-semibold">Linear API Key</Label>
              <div className="flex gap-2.5">
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsValid(null);
                  }}
                  placeholder="lin_api_..."
                  className="flex-1 h-11 text-[15px]"
                />
                <Button
                  onClick={handleValidateKey}
                  disabled={!apiKey.trim() || isValidating}
                  className="h-11 px-5 text-[15px] font-semibold"
                >
                  {isValidating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isValid ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
              {isValid === false && (
                <p className="text-[14px] text-destructive font-medium">Invalid API key</p>
              )}
              <p className="text-[13px] text-muted-foreground">
                Settings &rarr; API &rarr; Personal API keys
              </p>
            </div>
          </div>
        )}

        {step === 'select-team' && (
          <div className="flex flex-col gap-5 min-h-0">
            <div className="space-y-2.5">
              <Label className="text-[15px] font-semibold">Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[15px]">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-[15px]">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button variant="outline" onClick={() => setStep('api-key')} className="h-11 text-[15px]">
                Back
              </Button>
              <Button
                onClick={() => handleSelectTeam(selectedTeam || 'all')}
                disabled={!selectedTeam}
                className="flex-1 h-11 text-[15px] font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Load Projects'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'select-projects' && (
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-[15px] font-semibold">Projects ({projects.length})</Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-[14px]">
                    {selectedProjects.size === projects.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto border border-border/50 rounded-xl p-3 bg-muted/20">
                  {projects.length === 0 ? (
                    <p className="text-[14px] text-muted-foreground text-center py-4">
                      No active projects found
                    </p>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleToggleProject(project.id)}
                      >
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          onCheckedChange={() => handleToggleProject(project.id)}
                          className="h-5 w-5 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[15px] truncate leading-snug">{project.name}</div>
                          <div className="text-[13px] text-muted-foreground flex gap-2 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 bg-muted rounded-md font-medium">
                              {getProjectStateLabel(project.state)}
                            </span>
                            <span>{getProjectIssueCount(project.id)} issues</span>
                            {project.startDate && (
                              <span>
                                {new Date(project.startDate).toLocaleDateString('ko-KR')}
                                {project.targetDate && ` ~ ${new Date(project.targetDate).toLocaleDateString('ko-KR')}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2.5 justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep('select-team')} className="h-11 text-[15px]">
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedProjects.size === 0}
                    className="gap-2.5 h-11 text-[15px] font-semibold"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Import {selectedProjects.size} Projects
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </div>
  );
}
