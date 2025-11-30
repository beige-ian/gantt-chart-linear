import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RefreshCw, Link2, Check, Loader2 } from 'lucide-react';
import {
  fetchLinearTeams,
  fetchLinearProjects,
  fetchLinearIssues,
  convertLinearToTasks,
  validateLinearApiKey,
  LinearTeam,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [step, setStep] = useState<'api-key' | 'select-team'>('api-key');

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

  // Import all projects and issues for the selected team
  const handleImportAll = async (teamId: string) => {
    setSelectedTeam(teamId);
    setIsLoading(true);

    const actualTeamId = teamId === 'all' ? undefined : teamId;

    // Save selected team ID for later use
    if (teamId !== 'all') {
      localStorage.setItem('linear-selected-team-id', teamId);
    }

    try {
      const [fetchedProjects, fetchedIssues] = await Promise.all([
        fetchLinearProjects(apiKey, actualTeamId),
        fetchLinearIssues(apiKey, undefined, actualTeamId),
      ]);

      // Import ALL projects (no filtering by selection)
      const allProjectIds = fetchedProjects.map(p => p.id);
      const tasks = convertLinearToTasks(fetchedProjects, fetchedIssues, allProjectIds);
      onImport(tasks);
      setIsOpen(false);
      resetDialog();
    } catch (error) {
      console.error('Failed to fetch Linear data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setStep('api-key');
    setIsValid(null);
    setSelectedTeam('all');
  };

  // Refresh from Linear - re-import all projects
  const handleRefresh = async () => {
    if (!apiKey) return;

    setIsRefreshing(true);
    try {
      const savedTeamId = localStorage.getItem('linear-selected-team-id');
      const teamId = savedTeamId || undefined;

      const [fetchedProjects, fetchedIssues] = await Promise.all([
        fetchLinearProjects(apiKey, teamId),
        fetchLinearIssues(apiKey, undefined, teamId),
      ]);

      const allProjectIds = fetchedProjects.map(p => p.id);
      const tasks = convertLinearToTasks(fetchedProjects, fetchedIssues, allProjectIds);
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
            <div className="flex flex-col gap-5">
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
                        {team.icon ? `${team.icon} ` : ''}{team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[13px] text-muted-foreground">
                  선택한 팀의 모든 프로젝트와 이슈를 불러옵니다. 필터로 원하는 항목만 볼 수 있습니다.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button variant="outline" onClick={() => setStep('api-key')} className="h-11 text-[15px]">
                  Back
                </Button>
                <Button
                  onClick={() => handleImportAll(selectedTeam)}
                  disabled={!selectedTeam || isLoading}
                  className="flex-1 h-11 text-[15px] font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Import All'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
