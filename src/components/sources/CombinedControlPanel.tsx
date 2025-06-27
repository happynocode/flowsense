import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/services/api';
import { navigateTo } from '@/utils/navigation';
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
  Settings2,
  AlertCircle,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SubscriptionStatus from '../subscription/SubscriptionStatus';
import { supabase } from '../../lib/supabase';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'US Eastern Time (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Time (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern Time (AEST/AEDT)' },
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
  const { user, updateAutoDigestSettings, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // 🔧 本地状态管理 - 用于编辑，点击Save时才保存到数据库
  const [autoSettings, setAutoSettings] = useState<{
    autoDigestEnabled: boolean;
    autoDigestTime: string;
    autoDigestTimezone: string;
    lastAutoDigestRun?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loading = !user; // 如果没有用户数据，则显示加载状态
  
  // 🔧 当用户数据加载时，初始化本地状态
  useEffect(() => {
    console.log('🔍 [CombinedControlPanel] useEffect triggered, user:', user);
    if (user) {
      console.log('🔍 [CombinedControlPanel] 用户数据详细信息:');
      console.log('  - user.autoDigestEnabled:', user.autoDigestEnabled, typeof user.autoDigestEnabled);
      console.log('  - user.autoDigestTime:', user.autoDigestTime, typeof user.autoDigestTime);
      console.log('  - user.autoDigestTimezone:', user.autoDigestTimezone, typeof user.autoDigestTimezone);
      console.log('  - user.lastAutoDigestRun:', user.lastAutoDigestRun);
      
      const newAutoSettings = {
        autoDigestEnabled: user.autoDigestEnabled ?? false,
        autoDigestTime: user.autoDigestTime ?? '09:00',
        autoDigestTimezone: user.autoDigestTimezone ?? 'UTC',
        lastAutoDigestRun: user.lastAutoDigestRun
      };
      
      console.log('🔍 [CombinedControlPanel] 设置本地状态:', newAutoSettings);
      setAutoSettings(newAutoSettings);
      
      // 验证设置是否成功
      setTimeout(() => {
        console.log('🔍 [CombinedControlPanel] 本地状态设置后验证 - 将在下次渲染时显示');
      }, 100);
    } else {
      console.log('🔍 [CombinedControlPanel] 用户数据为空，清除本地状态');
      setAutoSettings(null);
    }
  }, [user]);
  
  // 🔧 监控用户状态和auto digest设置
  useEffect(() => {
    console.log('🔍 User state in CombinedControlPanel:', user);
    if (user) {
      console.log('🔍 Auto digest settings from user:');
      console.log('  - Enabled:', user.autoDigestEnabled);
      console.log('  - Time:', user.autoDigestTime);
      console.log('  - Timezone:', user.autoDigestTimezone);
    }
  }, [user]);

  // 🔧 不再需要loadAutoSettings函数，直接从用户状态读取

  // 🔧 手动保存设置到数据库
  const saveAutoSettings = async () => {
    if (!autoSettings) return;
    
    if (!canUseFeature('auto')) {
      toast({
        title: "Upgrade to Premium",
        description: "Automatic digest feature is only available for premium users.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateTo('/subscription')}
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
      console.log('💾 CombinedControlPanel: Saving settings via useAuth:', autoSettings);
      
      // 使用useAuth的updateAutoDigestSettings函数
      await updateAutoDigestSettings({
        autoDigestEnabled: autoSettings.autoDigestEnabled,
        autoDigestTime: autoSettings.autoDigestTime,
        autoDigestTimezone: autoSettings.autoDigestTimezone
      });
      
      toast({
        title: "✅ Settings Saved",
        description: autoSettings.autoDigestEnabled 
          ? `Automatic digest will run daily at ${autoSettings.autoDigestTime}` 
          : "Automatic digest is disabled.",
      });
    } catch (err) {
      console.error('❌ CombinedControlPanel: Failed to save settings:', err);
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

  // 🔧 切换启用状态（只更新本地状态）
  const handleToggleEnabled = (enabled: boolean) => {
    if (!autoSettings) return;
    
    setAutoSettings(prev => prev ? {
      ...prev,
      autoDigestEnabled: enabled
    } : null);
  };

  const formatLastRun = (dateString?: string) => {
    if (!dateString) return 'Never run';
    return new Date(dateString).toLocaleString();
  };

  // 🔧 调试函数：直接查询数据库
  const debugDatabaseState = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('❌ No user for debug query');
        return;
      }

      console.log('🔍 DEBUG: Direct database query for user:', authUser.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('🔍 DEBUG: Full user record:', data);
      console.log('🔍 DEBUG: Query error:', error);
      
      if (data) {
        console.log('🔍 DEBUG: Auto digest fields specifically:');
        console.log('  - auto_digest_enabled:', data.auto_digest_enabled, typeof data.auto_digest_enabled);
        console.log('  - auto_digest_time:', data.auto_digest_time, typeof data.auto_digest_time);
        console.log('  - auto_digest_timezone:', data.auto_digest_timezone, typeof data.auto_digest_timezone);
        console.log('  - last_auto_digest_run:', data.last_auto_digest_run);
        console.log('  - updated_at:', data.updated_at);
        
        // 对比当前用户状态
        console.log('🔍 DEBUG: 对比当前用户状态:');
        console.log('  - user.autoDigestEnabled:', user?.autoDigestEnabled, typeof user?.autoDigestEnabled);
        console.log('  - user.autoDigestTime:', user?.autoDigestTime, typeof user?.autoDigestTime);
        console.log('  - user.autoDigestTimezone:', user?.autoDigestTimezone, typeof user?.autoDigestTimezone);
        
        // 对比本地状态
        console.log('🔍 DEBUG: 对比本地autoSettings状态:');
        console.log('  - autoSettings?.autoDigestEnabled:', autoSettings?.autoDigestEnabled, typeof autoSettings?.autoDigestEnabled);
        console.log('  - autoSettings?.autoDigestTime:', autoSettings?.autoDigestTime, typeof autoSettings?.autoDigestTime);
        console.log('  - autoSettings?.autoDigestTimezone:', autoSettings?.autoDigestTimezone, typeof autoSettings?.autoDigestTimezone);
        
        // 检查数据一致性
        const dbEnabled = data.auto_digest_enabled;
        const userEnabled = user?.autoDigestEnabled;
        const localEnabled = autoSettings?.autoDigestEnabled;
        
        console.log('🔍 DEBUG: 数据一致性检查:');
        console.log(`  - 数据库 vs 用户状态: ${dbEnabled} vs ${userEnabled} ${dbEnabled === userEnabled ? '✅' : '❌'}`);
        console.log(`  - 用户状态 vs 本地状态: ${userEnabled} vs ${localEnabled} ${userEnabled === localEnabled ? '✅' : '❌'}`);
        console.log(`  - 数据库 vs 本地状态: ${dbEnabled} vs ${localEnabled} ${dbEnabled === localEnabled ? '✅' : '❌'}`);
        
        // 🔧 检测到不一致时自动修复
        let hasInconsistency = false;
        
        if (dbEnabled !== userEnabled) {
          console.error('❌ 数据库和用户状态不一致！这表明useAuth的数据获取有问题');
          hasInconsistency = true;
        }
        if (userEnabled !== localEnabled) {
          console.error('❌ 用户状态和本地状态不一致！这表明组件的状态同步有问题');
          hasInconsistency = true;
        }

        // 🚀 自动修复不一致的数据
        if (hasInconsistency) {
          console.log('🔧 检测到数据不一致，开始自动修复...');
          
          try {
                         // 1. 强制刷新用户数据
             console.log('🔄 Step 1: 强制刷新用户数据...');
             await refreshUser();
             
             // 2. 重新加载组件设置 (refreshUser会触发useEffect重新设置autoSettings)
             console.log('🔄 Step 2: 等待组件状态更新...');
             // refreshUser会触发useEffect，无需额外操作
            
            // 3. 显示修复成功的提示
            toast({
              title: "✅ 数据同步成功",
              description: "检测到数据不一致并已自动修复。如问题持续，请刷新页面。",
            });
            
            console.log('✅ 自动修复完成');
            
          } catch (fixError) {
            console.error('❌ 自动修复失败:', fixError);
            toast({
              title: "❌ 自动修复失败",
              description: "请手动刷新页面或重新登录。",
              variant: "destructive",
            });
          }
        } else {
          console.log('✅ 所有数据状态一致，无需修复');
        }
      }
    } catch (error) {
      console.error('❌ Debug query failed:', error);
    }
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
                              onClick={() => navigateTo('/subscription')}
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
                      className="bg-gray-100 border-gray-300 text-gray-500 w-full justify-start cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Process This Week's Content (Premium)
                    </Button>
                  )}
                </>
              ) : (
                                  <p className="text-sm text-gray-600 italic p-2 bg-white border border-gray-200 rounded">
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
      <Card className="bg-white border-purple-300 shadow-sm">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-purple-900 flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              Premium Features
            </CardTitle>
            <div className="flex gap-2">
              {/* 🔧 数据同步按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    console.log('🔄 手动触发数据同步...');
                    await refreshUser();
                    toast({
                      title: "✅ 数据已同步",
                      description: "用户状态已从数据库刷新",
                    });
                  } catch (error) {
                    console.error('❌ 手动同步失败:', error);
                    toast({
                      title: "❌ 同步失败",
                      description: "请尝试重新登录",
                      variant: "destructive",
                    });
                  }
                }}
                className="border-blue-400 text-blue-700 hover:bg-blue-100 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                同步数据
              </Button>
              {/* 🔧 调试按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={debugDatabaseState}
                className="border-red-400 text-red-700 hover:bg-red-100 text-xs"
              >
                Debug DB
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 🔧 Premium Features内容始终显示 */}
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Loading settings...</span>
              </div>
            ) : !autoSettings ? (
              // 🔧 加载失败状态
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">Failed to load settings</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reload Page
                </Button>
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
                      {/* 🔧 状态指示器 */}
                      {!saving && (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs">Synced</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {autoSettings.autoDigestEnabled 
                        ? `Scheduled to run daily at ${autoSettings.autoDigestTime}` 
                        : 'Currently disabled - Click to enable automatic digest generation'}
                    </p>
                  </div>
                  
                  {isPremium ? (
                    <div className="ml-4">
                      <button
                        onClick={() => handleToggleEnabled(!autoSettings.autoDigestEnabled)}
                        disabled={saving}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          autoSettings.autoDigestEnabled 
                            ? 'bg-purple-600' 
                            : 'bg-gray-200'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="sr-only">Enable auto digest</span>
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                            autoSettings.autoDigestEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                        {saving && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                          </div>
                        )}
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
                        className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300 cursor-not-allowed"
                        disabled
                      >
                        <span className="sr-only">Enable auto digest (Premium required)</span>
                        <span className="inline-block h-6 w-6 transform rounded-full bg-gray-100 shadow-lg translate-x-1" />
                        <Lock className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 时间和时区设置 */}
                {autoSettings.autoDigestEnabled && isPremium && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-purple-200 shadow-sm">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900">Run Time</Label>
                                                                    <Input
                      type="time"
                      value={autoSettings.autoDigestTime}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        // 只更新本地状态，不自动保存
                        setAutoSettings(prev => prev ? {
                          ...prev,
                          autoDigestTime: newTime
                        } : null);
                      }}
                      className="w-full bg-white border-gray-300 text-gray-900"
                    />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900">Timezone</Label>
                                            <Select
                      value={autoSettings.autoDigestTimezone}
                      onValueChange={(value) => {
                        // 只更新本地状态，不自动保存
                        setAutoSettings(prev => prev ? {
                          ...prev,
                          autoDigestTimezone: value
                        } : null);
                      }}
                    >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
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
                      <div className="text-xs text-gray-600 bg-white border border-gray-200 p-2 rounded">
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
      </Card>
    </div>
  );
};

export default CombinedControlPanel;