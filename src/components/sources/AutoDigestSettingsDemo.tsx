import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Clock, Settings, TestTube } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const AutoDigestSettingsDemo: React.FC = () => {
  const [settings, setSettings] = useState({
    autoDigestEnabled: false,
    autoDigestTime: '09:00',
    autoDigestTimezone: 'UTC',
    lastAutoDigestRun: undefined as string | undefined
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const saveSettings = async () => {
    setSaving(true);
    
    // 模拟保存延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Settings saved (Demo)",
      description: settings.autoDigestEnabled 
        ? `Auto digest will run daily at ${settings.autoDigestTime}` 
        : "Auto digest has been disabled.",
    });
    setSaving(false);
  };

  const handleTestDigest = async () => {
    setTesting(true);
    
    // 模拟测试延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "🧪 Test digest started (Demo)",
      description: "Manual digest processing has been triggered for testing.",
    });
    setTesting(false);
  };

  const formatLastRun = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-indigo-800">
          <Clock className="h-5 w-5 mr-2" />
          Auto Daily Digest (Demo Mode)
        </CardTitle>
        <p className="text-sm text-indigo-600">
          Automatically process your sources and generate digests every day at your chosen time.
        </p>
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ Demo Mode: Settings are not persisted to database. This is for UI testing only.
        </div>
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
                Save Settings (Demo)
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
                  Test Now (Demo)
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

        {/* Database Status */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-800 mb-2">🔧 Database Setup Required:</h4>
          <p className="text-xs text-amber-700 mb-2">
            To enable the full functionality, please run the database migration:
          </p>
          <code className="text-xs bg-amber-100 p-2 rounded block">
            npx supabase migration up
          </code>
          <p className="text-xs text-amber-600 mt-2">
            Or manually execute the SQL commands in AUTO_DIGEST_SETUP.md
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoDigestSettingsDemo; 