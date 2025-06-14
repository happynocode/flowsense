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
        title: "Upgrade to Premium",
        description: "Automatic digest feature is only available for premium users.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/subscription'}
            className="ml-2"
          >
            <Crown className="w-4 h-4 mr-1" />
            Upgrade
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
        title: "✅ Settings Saved",
        description: autoSettings.autoDigestEnabled 
          ? `Automatic digest will run daily at ${autoSettings.autoDigestTime}` 
          : "Automatic digest is disabled.",
      });
    } catch (err) {
      console.error('Failed to save auto digest settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save settings: ${errorMessage}`);
      toast({
        title: "❌ Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatLastRun = (dateString?: string) => {
    if (!dateString) return 'Never run';
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
              Content Processing Control
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 手动处理按钮 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Manual Processing</Label>
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
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Process Today's Content
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
                      Process This Week's Content
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        toast({
                          title: "Upgrade to Premium",
                          description: "Free users can only process today's content. Upgrade to Premium to process weekly content.",
                          action: (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.location.href = '/subscription'}
                              className="ml-2"
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              Upgrade
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
                      Process This Week's Content (Premium)
                    </Button>
                  )}
                </>
              ) : (
                                  <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                  Please add sources first before processing
                </p>
              )}
            </div>
          </div>

          {/* 清理内容按钮 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Content Management</Label>
            <Button
              onClick={onClearContent}
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 w-full justify-start"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Clear Fetched Content
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
              Premium Features
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
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
                <span className="text-sm text-gray-600">Loading settings...</span>
              </div>
            ) : (
              <>
                {/* Auto Daily Digest Toggle */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-purple-100 hover:border-purple-200 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <Label className="text-base font-semibold text-gray-900">
                        Auto Daily Digest
                      </Label>
                      {!isPremium && (
                        <div className="flex items-center space-x-1">
                          <Lock className="h-4 w-4 text-amber-500" />
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                            Premium
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Automatically process today's content and generate digest daily
                    </p>
                  </div>
                  
                  {isPremium ? (
                    <div className="ml-4">
                      <button
                        onClick={() => setAutoSettings(prev => ({ ...prev, autoDigestEnabled: !prev.autoDigestEnabled }))}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          autoSettings.autoDigestEnabled 
                            ? 'bg-purple-600' 
                            : 'bg-gray-200'
                        }`}
                      >
                        <span className="sr-only">Enable auto digest</span>
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                            autoSettings.autoDigestEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          toast({
                            title: "Upgrade to Premium",
                            description: "Automatic digest feature is only available for premium users.",
                            action: (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.location.href = '/subscription'}
                                className="ml-2"
                              >
                                <Crown className="w-4 h-4 mr-1" />
                                Upgrade
                              </Button>
                            ),
                          });
                        }}
                        className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <span className="sr-only">Enable auto digest (Premium required)</span>
                        <span className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg translate-x-1" />
                        <Lock className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 时间和时区设置 */}
                {autoSettings.autoDigestEnabled && isPremium && (
                  <div className="space-y-3 p-3 bg-white rounded-lg border border-purple-100">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900">Run Time</Label>
                      <Input
                        type="time"
                        value={autoSettings.autoDigestTime}
                        onChange={(e) => setAutoSettings(prev => ({ ...prev, autoDigestTime: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900">Timezone</Label>
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
                        Last Run: {formatLastRun(autoSettings.lastAutoDigestRun)}
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
                        Saving...
                      </>
                    ) : (
                      <>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                )}

                {!isPremium && (
                  <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-sm text-yellow-800 mb-2">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Premium to unlock automatic digest features
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => window.location.href = '/subscription'}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
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