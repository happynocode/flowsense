import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { userApi } from '@/services/api';
import { 
  Zap, 
  Sparkles, 
  Eraser, 
  Clock, 
  Globe, 
  Crown, 
  Lock, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SubscriptionStatus from '../subscription/SubscriptionStatus';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: '美国东部时间 (EST/EDT)' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间 (PST/PDT)' },
  { value: 'Europe/London', label: '英国时间 (GMT/BST)' },
  { value: 'Europe/Paris', label: '欧洲中部时间 (CET/CEST)' },
  { value: 'Asia/Tokyo', label: '日本时间 (JST)' },
  { value: 'Asia/Shanghai', label: '中国时间 (CST)' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (HKT)' },
  { value: 'Australia/Sydney', label: '澳大利亚东部时间 (AEST/AEDT)' },
];

interface CombinedControlPanelProps {
  sourcesArray: any[];
  globalProcessing: boolean;
  onProcessToday: () => void;
  onProcessWeek: () => void;
  onClearContent: () => void;
}

const CombinedControlPanel: React.FC<CombinedControlPanelProps> = ({
  sourcesArray,
  globalProcessing,
  onProcessToday,
  onProcessWeek,
  onClearContent
}) => {
  const { canUseFeature, isPremium } = useSubscription();
  const { toast } = useToast();
  
  // Auto digest settings state
  const [autoSettings, setAutoSettings] = useState({
    autoDigestEnabled: false,
    autoDigestTime: '09:00',
    autoDigestTimezone: 'UTC',
    lastAutoDigestRun: undefined as string | undefined
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Load auto digest settings
  useEffect(() => {
    loadAutoSettings();
  }, []);

  const loadAutoSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getAutoDigestSettings();
      setAutoSettings({
        autoDigestEnabled: data.autoDigestEnabled || false,
        autoDigestTime: data.autoDigestTime ? data.autoDigestTime.substring(0, 5) : '09:00',
        autoDigestTimezone: data.autoDigestTimezone || 'UTC',
        lastAutoDigestRun: data.lastAutoDigestRun
      });
    } catch (err) {
      console.error('Failed to load auto digest settings:', err);
      setError(`Failed to load settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAutoSettings({
        autoDigestEnabled: false,
        autoDigestTime: '09:00',
        autoDigestTimezone: 'UTC',
        lastAutoDigestRun: undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAutoSettings = async () => {
    if (!canUseFeature('auto')) {
      toast({
        title: "升级到高级版",
        description: "自动摘要功能仅限高级版用户使用。",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/subscription'}
            className="ml-2"
          >
            <Crown className="w-4 h-4 mr-1" />
            升级
          </Button>
        ),
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const settingsToSave = {
        autoDigestEnabled: autoSettings.autoDigestEnabled,
        autoDigestTime: autoSettings.autoDigestTime + ':00',
        autoDigestTimezone: autoSettings.autoDigestTimezone
      };
      await userApi.updateAutoDigestSettings(settingsToSave);
      toast({
        title: "✅ 设置已保存",
        description: autoSettings.autoDigestEnabled 
          ? `自动摘要将在每日 ${autoSettings.autoDigestTime} 运行` 
          : "自动摘要已禁用。",
      });
    } catch (err) {
      console.error('Failed to save auto digest settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save settings: ${errorMessage}`);
      toast({
        title: "❌ 保存失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatLastRun = (dateString?: string) => {
    if (!dateString) return '从未运行';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* 订阅状态 */}
      <SubscriptionStatus />
      
      {/* 手动处理控制 */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            内容处理控制
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 手动处理按钮 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">手动处理</Label>
            <div className="flex flex-col gap-2">
              {sourcesArray.length > 0 ? (
                <>
                  <Button
                    onClick={onProcessToday}
                    disabled={globalProcessing}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full justify-start"
                  >
                    {globalProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        处理今日内容
                      </>
                    )}
                  </Button>
                  
                  {isPremium ? (
                    <Button
                      onClick={onProcessWeek}
                      disabled={globalProcessing}
                      size="sm"
                      variant="outline"
                      className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 w-full justify-start"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      处理本周内容
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        toast({
                          title: "升级到高级版",
                          description: "免费用户只能处理今日内容。升级到高级版可处理整周内容。",
                          action: (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.location.href = '/subscription'}
                              className="ml-2"
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              升级
                            </Button>
                          ),
                        });
                      }}
                      disabled
                      size="sm"
                      variant="outline"
                      className="opacity-50 w-full justify-start"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      处理本周内容 (高级版)
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                  请先添加信息源再进行处理
                </p>
              )}
            </div>
          </div>

          {/* 清理内容按钮 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">内容管理</Label>
            <Button
              onClick={onClearContent}
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 w-full justify-start"
            >
              <Eraser className="h-4 w-4 mr-2" />
              清理已抓取内容
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 高级功能设置 */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-purple-800 flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              高级版功能
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              {showAdvancedSettings ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        {showAdvancedSettings && (
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">加载设置中...</span>
              </div>
            ) : (
              <>
                {/* 自动摘要开关 */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-900 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      自动每日摘要
                      {!isPremium && <Lock className="h-3 w-3 ml-1 text-gray-400" />}
                    </Label>
                    <p className="text-xs text-gray-600">
                      每日自动处理今日内容并生成摘要
                    </p>
                  </div>
                  <Switch
                    checked={autoSettings.autoDigestEnabled}
                    onCheckedChange={(checked) => {
                      if (!isPremium && checked) {
                        toast({
                          title: "升级到高级版",
                          description: "自动摘要功能仅限高级版用户使用。",
                          action: (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.location.href = '/subscription'}
                              className="ml-2"
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              升级
                            </Button>
                          ),
                        });
                        return;
                      }
                      setAutoSettings(prev => ({ ...prev, autoDigestEnabled: checked }));
                    }}
                    disabled={!isPremium}
                  />
                </div>

                {/* 时间和时区设置 */}
                {autoSettings.autoDigestEnabled && isPremium && (
                  <div className="space-y-3 p-3 bg-white rounded-lg border border-purple-100">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900">运行时间</Label>
                      <Input
                        type="time"
                        value={autoSettings.autoDigestTime}
                        onChange={(e) => setAutoSettings(prev => ({ ...prev, autoDigestTime: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900">时区</Label>
                      <Select
                        value={autoSettings.autoDigestTimezone}
                        onValueChange={(value) => setAutoSettings(prev => ({ ...prev, autoDigestTimezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map(tz => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {autoSettings.lastAutoDigestRun && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        上次运行: {formatLastRun(autoSettings.lastAutoDigestRun)}
                      </div>
                    )}
                  </div>
                )}

                {/* 保存按钮 */}
                {isPremium && (
                  <Button
                    onClick={saveAutoSettings}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Settings2 className="h-4 w-4 mr-2" />
                        保存设置
                      </>
                    )}
                  </Button>
                )}

                {!isPremium && (
                  <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-sm text-yellow-800 mb-2">
                      <Crown className="h-4 w-4 mr-2" />
                      升级到高级版解锁自动摘要功能
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => window.location.href = '/subscription'}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      立即升级
                    </Button>
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {error}
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default CombinedControlPanel;