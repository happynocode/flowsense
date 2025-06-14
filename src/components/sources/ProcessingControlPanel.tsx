import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ChevronUp
} from 'lucide-react';

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

interface ProcessingControlPanelProps {
  sourcesArray: any[];
  globalProcessing: boolean;
  onProcessToday: () => void;
  onProcessWeek: () => void;
  onClearContent: () => void;
}

const ProcessingControlPanel: React.FC<ProcessingControlPanelProps> = ({
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
    autoDigestTimezone: 'UTC'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAutoSettings, setShowAutoSettings] = useState(false);

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
        autoDigestTime: data.autoDigestTime || '09:00',
        autoDigestTimezone: data.autoDigestTimezone || 'UTC'
      });
    } catch (err) {
      console.error('Failed to load auto digest settings:', err);
      setError(`Failed to load settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAutoSettings({
        autoDigestEnabled: false,
        autoDigestTime: '09:00',
        autoDigestTimezone: 'UTC'
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
      await userApi.updateAutoDigestSettings(autoSettings);
      toast({
        title: "✅ 设置已保存",
        description: "自动摘要设置已成功更新。",
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

  return (
    <div className="bg-white rounded-lg border border-indigo-200 shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            内容处理控制
          </h3>
        </div>

        {/* Manual Processing Buttons */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">手动处理</h4>
          <div className="flex flex-wrap gap-2 mb-2">
            {sourcesArray.length > 0 ? (
              <>
                <Button
                  onClick={onProcessToday}
                  disabled={globalProcessing}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {globalProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      处理今日
                    </>
                  )}
                </Button>
                
                {isPremium ? (
                  <Button
                    onClick={onProcessWeek}
                    disabled={globalProcessing}
                    size="sm"
                    variant="outline"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    处理本周
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
                    className="opacity-50 cursor-not-allowed"
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    处理本周
                    <Crown className="w-4 h-4 ml-1 text-yellow-500" />
                  </Button>
                )}
                
                <Button
                  onClick={onClearContent}
                  disabled={globalProcessing}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  清除内容
                </Button>
              </>
            ) : (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                添加信息源后即可开始处理内容
              </div>
            )}
          </div>
        </div>

        {/* Auto Digest Settings */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              自动摘要
              {!canUseFeature('auto') && (
                <div className="ml-2 flex items-center">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-500 ml-1">高级版</span>
                </div>
              )}
            </h4>
            <Button
              onClick={() => setShowAutoSettings(!showAutoSettings)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              {showAutoSettings ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 mb-2">
            <Label htmlFor="auto-digest-enabled" className="text-sm font-medium text-gray-900">
              启用自动摘要
            </Label>
            {canUseFeature('auto') ? (
              <input
                type="checkbox"
                id="auto-digest-enabled"
                checked={autoSettings.autoDigestEnabled}
                onChange={(e) => {
                  setAutoSettings(prev => ({ ...prev, autoDigestEnabled: e.target.checked }));
                }}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            ) : (
              <div className="relative">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="h-4 w-4 opacity-50 cursor-not-allowed border-gray-300 rounded"
                  onClick={() => {
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
                  }}
                />
                <Lock className="absolute -top-1 -right-1 h-3 w-3 text-gray-400" />
              </div>
            )}
          </div>

          {/* Expandable Settings */}
          {showAutoSettings && (
            <div className={`space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200 ${!canUseFeature('auto') ? 'opacity-50' : ''}`}>
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-800">❌ {error}</p>
                  <Button 
                    onClick={loadAutoSettings} 
                    size="sm" 
                    variant="outline" 
                    className="mt-1 h-6 text-xs"
                  >
                    重试
                  </Button>
                </div>
              )}

              {/* Timezone Selection */}
              <div className="space-y-1">
                <Label htmlFor="digest-timezone" className="text-xs font-medium text-gray-900 flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  时区
                </Label>
                <select
                  id="digest-timezone"
                  value={autoSettings.autoDigestTimezone}
                  onChange={(e) => {
                    if (!canUseFeature('auto')) {
                      toast({
                        title: "升级到高级版",
                        description: "自动摘要功能仅限高级版用户使用。",
                      });
                      return;
                    }
                    setAutoSettings(prev => ({ ...prev, autoDigestTimezone: e.target.value }));
                  }}
                  disabled={!canUseFeature('auto')}
                  className={`w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!canUseFeature('auto') ? 'cursor-not-allowed bg-gray-100' : ''}`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Selection */}
              <div className="space-y-1">
                <Label htmlFor="digest-time" className="text-xs font-medium text-gray-900">
                  执行时间
                </Label>
                <Input
                  id="digest-time"
                  type="time"
                  value={autoSettings.autoDigestTime}
                  onChange={(e) => {
                    if (!canUseFeature('auto')) {
                      toast({
                        title: "升级到高级版",
                        description: "自动摘要功能仅限高级版用户使用。",
                      });
                      return;
                    }
                    setAutoSettings(prev => ({ ...prev, autoDigestTime: e.target.value }));
                  }}
                  disabled={!canUseFeature('auto')}
                  className={`w-full h-8 text-xs ${!canUseFeature('auto') ? 'cursor-not-allowed bg-gray-100' : ''}`}
                />
              </div>

              {/* Save Button */}
              {canUseFeature('auto') ? (
                <Button 
                  onClick={saveAutoSettings}
                  disabled={saving}
                  size="sm"
                  className="w-full h-8 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {saving ? '保存中...' : '💾 保存设置'}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
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
                  }}
                  disabled
                  size="sm"
                  className="w-full h-8 text-xs opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 flex items-center justify-center"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  💾 保存设置
                  <Crown className="w-3 h-3 ml-1 text-yellow-500" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-600 bg-indigo-50 rounded-lg p-2 border border-indigo-100 mt-3">
          <p className="mb-1"><strong>处理今日:</strong> 抓取并摘要今天发布的新内容</p>
          <p className="mb-1"><strong>处理本周:</strong> 抓取并摘要过去7天的内容</p>
          <p><strong>自动摘要:</strong> 每天定时自动处理今日内容并生成摘要</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingControlPanel; 