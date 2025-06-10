import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Clock, Globe } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { userApi } from '../../services/api';

// 常用时区列表
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (协调世界时)', offset: '+00:00' },
  { value: 'Asia/Shanghai', label: '中国标准时间 (CST)', offset: '+08:00' },
  { value: 'America/New_York', label: '美国东部时间 (EST/EDT)', offset: '-05:00/-04:00' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间 (PST/PDT)', offset: '-08:00/-07:00' },
  { value: 'Europe/London', label: '英国时间 (GMT/BST)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: '中欧时间 (CET/CEST)', offset: '+01:00/+02:00' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (JST)', offset: '+09:00' },
  { value: 'Asia/Seoul', label: '韩国标准时间 (KST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: '澳大利亚东部时间 (AEST/AEDT)', offset: '+10:00/+11:00' },
];

const AutoDigestSettingsSimple: React.FC = () => {
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
          <p className="text-sm text-gray-600">加载自动摘要设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-indigo-200 shadow-sm">
      <div className="p-4">
        <h4 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          自动摘要
        </h4>
        
        <div className="space-y-4">
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
                重试
              </Button>
            </div>
          )}

          {/* Enable/Disable Checkbox */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Label htmlFor="auto-digest-enabled-simple" className="text-sm font-medium text-gray-900">
              启用自动摘要
            </Label>
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
          </div>

          {/* Time and Timezone Selection */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            {/* Timezone Selection */}
            <div className="space-y-2">
              <Label htmlFor="digest-timezone" className="text-sm font-medium text-gray-900 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                时区
              </Label>
              <select
                id="digest-timezone"
                value={settings.autoDigestTimezone}
                onChange={(e) => {
                  console.log('Timezone changed:', e.target.value);
                  setSettings(prev => ({ ...prev, autoDigestTimezone: e.target.value }));
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
              <Label htmlFor="digest-time-simple" className="text-sm font-medium text-gray-900">
                执行时间
              </Label>
              <Input
                id="digest-time-simple"
                type="time"
                value={settings.autoDigestTime}
                onChange={(e) => {
                  console.log('Time changed:', e.target.value);
                  setSettings(prev => ({ ...prev, autoDigestTime: e.target.value }));
                }}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {saving ? '保存中...' : '💾 保存设置'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoDigestSettingsSimple; 