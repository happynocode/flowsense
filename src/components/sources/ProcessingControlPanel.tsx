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
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
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
      await userApi.updateAutoDigestSettings(autoSettings);
      toast({
        title: "✅ Settings Saved",
        description: "Automatic digest settings have been successfully updated.",
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

  return (
    <div className="bg-white rounded-lg border border-indigo-200 shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Content Processing Control
          </h3>
        </div>

        {/* Manual Processing Buttons */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Manual Processing</h4>
          <div className="flex flex-col gap-3 mb-2">
            {sourcesArray.length > 0 ? (
              <>
                <Button
                  onClick={onProcessToday}
                  disabled={globalProcessing}
                  size="default"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center py-3"
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
                    size="default"
                    variant="outline"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 shadow-sm hover:shadow-md transition-all duration-200 py-3"
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
                    size="default"
                    variant="outline"
                    className="opacity-60 cursor-not-allowed bg-gray-50 border-gray-300 text-gray-500 py-3 relative"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Process This Week
                    <Crown className="w-4 h-4 ml-2 text-yellow-500" />
                  </Button>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                Add sources to start processing content
              </div>
            )}
          </div>

          {/* Content Management Section */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Content Management</h4>
            <Button
              onClick={onClearContent}
              disabled={globalProcessing}
              size="default"
              variant="outline"
              className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 shadow-sm hover:shadow-md transition-all duration-200 py-3"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Clear Fetched Content
            </Button>
          </div>
        </div>

        {/* Auto Digest Settings */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Auto Digest Settings
              {!canUseFeature('auto') && (
                <div className="ml-2 flex items-center">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-500 ml-1">Premium</span>
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
              Auto Digest Enabled
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
                    Retry
                  </Button>
                </div>
              )}

              {/* Timezone Selection */}
              <div className="space-y-1">
                <Label htmlFor="digest-timezone" className="text-xs font-medium text-gray-900 flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  Timezone
                </Label>
                <select
                  id="digest-timezone"
                  value={autoSettings.autoDigestTimezone}
                  onChange={(e) => {
                    if (!canUseFeature('auto')) {
                      toast({
                        title: "Upgrade to Premium",
                        description: "Automatic digest feature is only available for premium users.",
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
                  Execution Time
                </Label>
                <Input
                  id="digest-time"
                  type="time"
                  value={autoSettings.autoDigestTime}
                  onChange={(e) => {
                    if (!canUseFeature('auto')) {
                      toast({
                        title: "Upgrade to Premium",
                        description: "Automatic digest feature is only available for premium users.",
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
                  {saving ? 'Saving...' : '💾 Save Settings'}
                </Button>
              ) : (
                <Button 
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
                  disabled
                  size="sm"
                  className="w-full h-8 text-xs opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 flex items-center justify-center"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  💾 Save Settings
                  <Crown className="w-3 h-3 ml-1 text-yellow-500" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-600 bg-indigo-50 rounded-lg p-2 border border-indigo-100 mt-3">
          <p className="mb-1"><strong>Process Today:</strong> Fetch and summarize new content published today</p>
          <p className="mb-1"><strong>Process This Week:</strong> Fetch and summarize content from the past 7 days</p>
          <p><strong>Auto Digest:</strong> Automatically process today's content and generate summaries daily</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingControlPanel; 