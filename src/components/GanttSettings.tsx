import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Settings, RotateCcw } from 'lucide-react';
import { Separator } from './ui/separator';

export interface GanttSettingsData {
  showGridLines: boolean;
  showDependencyLines: boolean;
  showProgress: boolean;
  showTooltips: boolean;
  rowHeight: 'compact' | 'default' | 'comfortable';
  barStyle: 'rounded' | 'square' | 'pill';
  todayHighlight: boolean;
  weekendHighlight: boolean;
  customDateRange: boolean;
  customStartDate: string;
  customEndDate: string;
}

interface GanttSettingsProps {
  settings: GanttSettingsData;
  onSettingsChange: (settings: GanttSettingsData) => void;
}

const defaultSettings: GanttSettingsData = {
  showGridLines: true,
  showDependencyLines: true,
  showProgress: true,
  showTooltips: true,
  rowHeight: 'default',
  barStyle: 'rounded',
  todayHighlight: true,
  weekendHighlight: false,
  customDateRange: false,
  customStartDate: '',
  customEndDate: '',
};

export function GanttSettings({ settings, onSettingsChange }: GanttSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <K extends keyof GanttSettingsData>(
    key: K,
    value: GanttSettingsData[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-lg font-bold">
            <span>간트 차트 설정</span>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 gap-2 text-[14px]">
              <RotateCcw className="h-4 w-4" />
              초기화
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-7 mt-7">
          {/* Display Options */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
              표시 옵션
            </h3>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="showGridLines" className="cursor-pointer text-[15px]">그리드 라인</Label>
              <Switch
                id="showGridLines"
                checked={localSettings.showGridLines}
                onCheckedChange={(checked) => handleChange('showGridLines', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="showDependencyLines" className="cursor-pointer text-[15px]">의존성 화살표</Label>
              <Switch
                id="showDependencyLines"
                checked={localSettings.showDependencyLines}
                onCheckedChange={(checked) => handleChange('showDependencyLines', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="showProgress" className="cursor-pointer text-[15px]">진행률 표시</Label>
              <Switch
                id="showProgress"
                checked={localSettings.showProgress}
                onCheckedChange={(checked) => handleChange('showProgress', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="showTooltips" className="cursor-pointer text-[15px]">툴팁 표시</Label>
              <Switch
                id="showTooltips"
                checked={localSettings.showTooltips}
                onCheckedChange={(checked) => handleChange('showTooltips', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="todayHighlight" className="cursor-pointer text-[15px]">오늘 하이라이트</Label>
              <Switch
                id="todayHighlight"
                checked={localSettings.todayHighlight}
                onCheckedChange={(checked) => handleChange('todayHighlight', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="weekendHighlight" className="cursor-pointer text-[15px]">주말 하이라이트</Label>
              <Switch
                id="weekendHighlight"
                checked={localSettings.weekendHighlight}
                onCheckedChange={(checked) => handleChange('weekendHighlight', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Style Options */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
              스타일 옵션
            </h3>

            <div className="space-y-2.5">
              <Label className="text-[15px]">행 높이</Label>
              <Select
                value={localSettings.rowHeight}
                onValueChange={(value) => handleChange('rowHeight', value as GanttSettingsData['rowHeight'])}
              >
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact" className="text-[15px]">컴팩트</SelectItem>
                  <SelectItem value="default" className="text-[15px]">기본</SelectItem>
                  <SelectItem value="comfortable" className="text-[15px]">넓게</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[15px]">바 스타일</Label>
              <Select
                value={localSettings.barStyle}
                onValueChange={(value) => handleChange('barStyle', value as GanttSettingsData['barStyle'])}
              >
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded" className="text-[15px]">둥근 모서리</SelectItem>
                  <SelectItem value="square" className="text-[15px]">각진 모서리</SelectItem>
                  <SelectItem value="pill" className="text-[15px]">알약형</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Custom Date Range */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
              날짜 범위
            </h3>

            <div className="flex items-center justify-between py-1">
              <Label htmlFor="customDateRange" className="cursor-pointer text-[15px]">커스텀 날짜 범위</Label>
              <Switch
                id="customDateRange"
                checked={localSettings.customDateRange}
                onCheckedChange={(checked) => handleChange('customDateRange', checked)}
              />
            </div>

            {localSettings.customDateRange && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                <div className="space-y-2.5">
                  <Label htmlFor="customStartDate" className="text-[15px]">시작일</Label>
                  <Input
                    id="customStartDate"
                    type="date"
                    value={localSettings.customStartDate}
                    onChange={(e) => handleChange('customStartDate', e.target.value)}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="customEndDate" className="text-[15px]">종료일</Label>
                  <Input
                    id="customEndDate"
                    type="date"
                    value={localSettings.customEndDate}
                    onChange={(e) => handleChange('customEndDate', e.target.value)}
                    className="h-11 text-[15px]"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Keyboard Shortcuts Info */}
          <div className="space-y-3.5">
            <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
              키보드 단축키
            </h3>
            <div className="text-[13px] space-y-2 text-muted-foreground">
              <div className="flex justify-between py-1">
                <span>줌 인/아웃</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">+ / -</span>
              </div>
              <div className="flex justify-between py-1">
                <span>오늘로 이동</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">0</span>
              </div>
              <div className="flex justify-between py-1">
                <span>실행 취소</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">⌘+Z</span>
              </div>
              <div className="flex justify-between py-1">
                <span>다시 실행</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">⌘+⇧+Z</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { defaultSettings };
