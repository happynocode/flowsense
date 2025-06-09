import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Clock, Settings, TestTube } from 'lucide-react';
import { userApi } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

interface AutoDigestSettingsProps {
  onTriggerTest?: () => void;
}

const AutoDigestSettings: React.FC<AutoDigestSettingsProps> = ({ onTriggerTest }) => {
  const [settings, setSettings] = useState({
    autoDigestEnabled: false,
    autoDigestTime: '09:00',
    autoDigestTimezone: 'UTC',
    lastAutoDigestRun: undefined as string | undefined
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  // 添加一个跳过loading的选项，以防API调用有问题
  const skipLoading = () => {
    console.log('⏭️ Skipping loading, using default settings');
    setSettings({
      autoDigestEnabled: false,
      autoDigestTime: '09:00',
      autoDigestTimezone: 'UTC',
      lastAutoDigestRun: undefined
    });
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading auto digest settings...');
      const data = await userApi.getAutoDigestSettings();
      console.log('✅ Auto digest settings loaded:', data);
      setSettings({
        autoDigestEnabled: data.autoDigestEnabled,
        autoDigestTime: data.autoDigestTime.substring(0, 5), // Extract HH:MM from HH:MM:SS
        autoDigestTimezone: data.autoDigestTimezone,
        lastAutoDigestRun: data.lastAutoDigestRun
      });
    } catch (error) {
      console.error('❌ Failed to load auto digest settings:', error);
      // 如果API调用失败，设置默认值以便用户可以使用界面
      setSettings({
        autoDigestEnabled: false,
        autoDigestTime: '09:00',
        autoDigestTimezone: 'UTC',
        lastAutoDigestRun: undefined
      });
      toast({
        title: "Using default settings",
        description: "Could not load your current settings, using defaults. You can still configure and save new settings.",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await userApi.updateAutoDigestSettings({
        autoDigestEnabled: settings.autoDigestEnabled,
        autoDigestTime: settings.autoDigestTime + ':00', // Add seconds
        autoDigestTimezone: settings.autoDigestTimezone
      });
      
      toast({
        title: "Settings saved",
        description: settings.autoDigestEnabled 
          ? `Auto digest will run daily at ${settings.autoDigestTime}` 
          : "Auto digest has been disabled.",
      });
    } catch (error) {
      console.error('Failed to save auto digest settings:', error);
      toast({
        title: "Failed to save settings",
        description: "There was an error saving your auto digest settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestDigest = async () => {
    try {
      setTesting(true);
      const result = await userApi.triggerAutoDigest();
      
      if (result.success) {
        toast({
          title: "🧪 Test digest started",
          description: "Manual digest processing has been triggered for testing.",
        });
        if (onTriggerTest) {
          onTriggerTest();
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to trigger test digest:', error);
      toast({
        title: "Test failed",
        description: "There was an error triggering the test digest.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const formatLastRun = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center flex-col space-y-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-indigo-700">Loading settings...</span>
            </div>
            <button 
              onClick={skipLoading}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              Use default settings if loading takes too long
            </button>
          </div>
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
        <p className="text-sm text-indigo-600">
          Automatically process your sources and generate digests every day at your chosen time.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-indigo-100">
          <div className="space-y-1">
            <Label htmlFor="auto-digest-enabled" className="text-sm font-medium text-gray-900">
              Enable Auto Digest
            </Label>
            <p className="text-xs text-gray-600">
              Automatically run "Process Today" at your scheduled time
            </p>
          </div>
          <Switch
            id="auto-digest-enabled"
            checked={settings.autoDigestEnabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoDigestEnabled: checked }))}
          />
        </div>

        {/* Time Selection */}
        {settings.autoDigestEnabled && (
          <div className="p-4 bg-white rounded-lg border border-indigo-100 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="digest-time" className="text-sm font-medium text-gray-900">
                Daily Run Time
              </Label>
              <Input
                id="digest-time"
                type="time"
                value={settings.autoDigestTime}
                onChange={(e) => setSettings(prev => ({ ...prev, autoDigestTime: e.target.value }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Your sources will be processed and digest generated at this time daily (UTC timezone)
              </p>
            </div>

            {/* Last Run Info */}
            {settings.lastAutoDigestRun && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                <strong>Last run:</strong> {formatLastRun(settings.lastAutoDigestRun)}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {saving ? (
              <>
                <Settings className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>

          {settings.autoDigestEnabled && (
            <Button 
              variant="outline"
              onClick={handleTestDigest}
              disabled={testing}
              className="text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:border-indigo-300"
            >
              {testing ? (
                <>
                  <TestTube className="h-4 w-4 mr-2 animate-pulse" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Now
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 How it works:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Your sources will be automatically processed every day at the selected time</li>
            <li>• The system runs "Process Today" to get the latest content</li>
            <li>• A new digest will be generated and available in your Digests page</li>
            <li>• Use "Test Now" to manually trigger the process and verify it's working</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoDigestSettings; 