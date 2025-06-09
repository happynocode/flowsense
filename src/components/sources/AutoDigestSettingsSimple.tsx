import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Clock, Settings, TestTube, Globe } from 'lucide-react';
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
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading auto digest settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-indigo-800">
          <Clock className="h-5 w-5 mr-2" />
          Auto Daily Digest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-indigo-100">
          <Label htmlFor="auto-digest-enabled-simple" className="text-sm font-medium text-gray-900">
            Enable Auto Digest
          </Label>
          <input
            type="checkbox"
            id="auto-digest-enabled-simple"
            checked={settings.autoDigestEnabled}
            onChange={(e) => {
              console.log('Checkbox changed:', e.target.checked);
              setSettings(prev => ({ ...prev, autoDigestEnabled: e.target.checked }));
            }}
            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
        </div>

        {/* Time and Timezone Selection */}
        <div className="p-4 bg-white rounded-lg border border-green-200 space-y-4">
          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label htmlFor="digest-timezone" className="text-sm font-medium text-gray-900 flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Time Zone
            </Label>
            <select
              id="digest-timezone"
              value={settings.autoDigestTimezone}
              onChange={(e) => {
                console.log('Timezone changed:', e.target.value);
                setSettings(prev => ({ ...prev, autoDigestTimezone: e.target.value }));
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Current time in {settings.autoDigestTimezone}: {getCurrentTimeInTimezone(settings.autoDigestTimezone)}
            </p>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="digest-time-simple" className="text-sm font-medium text-gray-900">
              Daily Run Time
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
            <p className="text-xs text-gray-500">
              This time will be used in the {TIMEZONES.find(tz => tz.value === settings.autoDigestTimezone)?.label || settings.autoDigestTimezone} timezone
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          Debug: autoDigestEnabled = {settings.autoDigestEnabled ? 'true' : 'false'} | time = {settings.autoDigestTime} | timezone = {settings.autoDigestTimezone}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </Button>
          
          <Button 
            onClick={testTrigger}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            🧪 Test Auto Digest Now
          </Button>
        </div>

        {/* Manual Test Buttons */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">🔧 Manual Controls:</h4>
          <div className="flex space-x-2 flex-wrap">
            <button 
              onClick={() => setSettings(prev => ({ ...prev, autoDigestEnabled: true }))}
              className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200"
            >
              Force Enable
            </button>
            <button 
              onClick={() => setSettings(prev => ({ ...prev, autoDigestEnabled: false }))}
              className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
            >
              Force Disable
            </button>
            <button 
              onClick={loadSettings}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
            >
              Reload from DB
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoDigestSettingsSimple; 