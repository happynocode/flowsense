import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Clock, Globe, Crown, Lock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { userApi } from '../../services/api';

// Common timezone list
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: '+08:00' },
  { value: 'America/New_York', label: 'US Eastern Time (EST/EDT)', offset: '-05:00/-04:00' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PST/PDT)', offset: '-08:00/-07:00' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)', offset: '+01:00/+02:00' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Australia Eastern Time (AEST/AEDT)', offset: '+10:00/+11:00' },
];

const AutoDigestSettingsSimple: React.FC = () => {
  const { canUseFeature, isPremium } = useSubscription();
  const [settings, setSettings] = useState({
    autoDigestEnabled: false,
    autoDigestTime: '09:00',
    autoDigestTimezone: 'UTC'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getAutoDigestSettings();
      setSettings({
        autoDigestEnabled: data.autoDigestEnabled || false,
        autoDigestTime: data.autoDigestTime || '09:00',
        autoDigestTimezone: data.autoDigestTimezone || 'UTC'
      });
      console.log('Loaded settings:', data);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(`Failed to load settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Use defaults on error
      setSettings({
        autoDigestEnabled: false,
        autoDigestTime: '09:00',
        autoDigestTimezone: 'UTC'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('Saving settings:', settings);
      
      await userApi.updateAutoDigestSettings({
        autoDigestEnabled: settings.autoDigestEnabled,
        autoDigestTime: settings.autoDigestTime,
        autoDigestTimezone: settings.autoDigestTimezone
      });

      const selectedTimezone = TIMEZONES.find(tz => tz.value === settings.autoDigestTimezone);
      
      toast({
        title: "✅ Settings saved successfully!",
        description: settings.autoDigestEnabled 
          ? `Auto digest will run daily at ${settings.autoDigestTime} (${selectedTimezone?.label || settings.autoDigestTimezone})` 
          : "Auto digest has been disabled.",
      });
      
      console.log('Settings saved successfully');
    } catch (err) {
      console.error('Save failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Save failed: ${errorMessage}`);
      toast({
        title: "❌ Save failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testTrigger = async () => {
    try {
      setError(null);
      toast({ title: "🧪 Testing auto digest trigger..." });
      
      await userApi.triggerAutoDigest();
      
      toast({
        title: "✅ Test trigger successful!",
        description: "Auto digest processing has been triggered manually."
      });
    } catch (err) {
      console.error('Test trigger failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Test failed: ${errorMessage}`);
      toast({
        title: "❌ Test failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Helper function to show current time in different timezones
  const getCurrentTimeInTimezone = (timezone: string): string => {
    try {
      const now = new Date();
      const timeInTimezone = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      return timeInTimezone;
    } catch (error) {
      return '--:--';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-indigo-200 shadow-sm">
        <div className="p-4 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading auto digest settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-indigo-200 shadow-sm">
      <div className="p-3">
        <h4 className="text-base font-semibold text-indigo-800 mb-3 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Auto Digest Settings
        </h4>
        
        <div className="space-y-3">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">❌ {error}</p>
              <Button 
                onClick={loadSettings} 
                size="sm" 
                variant="outline" 
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Enable/Disable Checkbox */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Label htmlFor="auto-digest-enabled-simple" className="text-sm font-medium text-gray-900">
                Enable Auto Digest
              </Label>
              {!canUseFeature('auto') && (
                <div className="ml-2 flex items-center">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-500 ml-1">Premium</span>
                </div>
              )}
            </div>
            {canUseFeature('auto') ? (
              <input
                type="checkbox"
                id="auto-digest-enabled-simple"
                checked={settings.autoDigestEnabled}
                onChange={(e) => {
                  console.log('Checkbox changed:', e.target.checked);
                  setSettings(prev => ({ ...prev, autoDigestEnabled: e.target.checked }));
                }}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            ) : (
              <div className="relative">
                <input
                  type="checkbox"
                  id="auto-digest-enabled-simple"
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

          {/* Time and Timezone Selection */}
          <div className={`p-2 rounded-lg border border-gray-200 space-y-2 ${!canUseFeature('auto') ? 'bg-gray-100' : 'bg-gray-50'}`}>
            {/* Timezone Selection */}
            <div className="space-y-2">
              <Label htmlFor="digest-timezone" className="text-sm font-medium text-gray-900 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Timezone
                {!canUseFeature('auto') && <Crown className="h-4 w-4 ml-2 text-yellow-500" />}
              </Label>
              <select
                id="digest-timezone"
                value={settings.autoDigestTimezone}
                onChange={(e) => {
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
                  console.log('Timezone changed:', e.target.value);
                  setSettings(prev => ({ ...prev, autoDigestTimezone: e.target.value }));
                }}
                disabled={!canUseFeature('auto')}
                className={`w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!canUseFeature('auto') ? 'cursor-not-allowed bg-gray-100' : ''}`}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="digest-time-simple" className="text-sm font-medium text-gray-900 flex items-center">
                Execution Time
                {!canUseFeature('auto') && <Crown className="h-4 w-4 ml-2 text-yellow-500" />}
              </Label>
              <Input
                id="digest-time-simple"
                type="time"
                value={settings.autoDigestTime}
                onChange={(e) => {
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
                  console.log('Time changed:', e.target.value);
                  setSettings(prev => ({ ...prev, autoDigestTime: e.target.value }));
                }}
                disabled={!canUseFeature('auto')}
                className={`w-full ${!canUseFeature('auto') ? 'cursor-not-allowed bg-gray-100' : ''}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5">
            {canUseFeature('auto') ? (
              <Button 
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
                className="w-full cursor-not-allowed bg-gray-400 hover:bg-gray-400 flex items-center justify-center"
              >
                <Lock className="w-4 h-4 mr-2" />
                💾 Save Settings
                <Crown className="w-4 h-4 ml-2 text-yellow-500" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoDigestSettingsSimple; 