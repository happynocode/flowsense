import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import { userApi } from '../services/api';
import { subscriptionService } from '../services/subscription';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { AlertCircle, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const DebugSubscription = () => {
  const { user, refreshUser } = useAuth();
  const { isPremium, isFree, limits } = useSubscription();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  // 完整的诊断流程
  const runCompleteDiagnostics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const diagnostics: any = {
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        frontend_state: {},
        auth_state: {},
        db_direct_query: {},
        api_call_result: {},
        inconsistencies: [],
        recommendations: []
      };

      // 1. 前端状态
      diagnostics.frontend_state = {
        isPremium,
        isFree,
        limits,
        user_object_subscription_fields: {
          subscriptionTier: user.subscriptionTier,
          maxSources: user.maxSources,
          canScheduleDigest: user.canScheduleDigest,
          canProcessWeekly: user.canProcessWeekly
        }
      };

      // 2. 认证状态检查
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      diagnostics.auth_state = {
        has_session: !!session,
        session_user_id: session?.user?.id,
        auth_user_id: authUser?.id,
        session_error: sessionError?.message,
        user_error: userError?.message,
        session_matches_frontend: session?.user?.id === user.id,
        auth_user_matches_frontend: authUser?.id === user.id
      };

      // 3. 直接查询数据库
      const { data: dbUserData, error: dbUserError } = await supabase
        .from('users')
        .select('*')  
        .eq('id', user.id)
        .single();

      const { data: dbSubscriptionData, error: dbSubError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      diagnostics.db_direct_query = {
        user_data: dbUserData,
        user_error: dbUserError?.message,
        subscription_data: dbSubscriptionData,
        subscription_error: dbSubError?.message
      };

      // 4. API调用结果
      try {
        const apiSubInfo = await userApi.getUserSubscriptionInfo();
        diagnostics.api_call_result = {
          success: true,
          data: apiSubInfo
        };
      } catch (apiError: any) {
        diagnostics.api_call_result = {
          success: false,
          error: apiError.message
        };
      }

      // 5. 数据一致性检查
      if (dbUserData && diagnostics.api_call_result.success) {
        const dbTier = dbUserData.subscription_tier;
        const apiTier = diagnostics.api_call_result.data.subscriptionTier;
        const frontendTier = user.subscriptionTier;

        if (dbTier !== apiTier) {
          diagnostics.inconsistencies.push({
            type: 'db_api_mismatch',
            message: `Database subscription_tier (${dbTier}) != API result (${apiTier})`
          });
        }

        if (dbTier !== frontendTier) {
          diagnostics.inconsistencies.push({
            type: 'db_frontend_mismatch', 
            message: `Database subscription_tier (${dbTier}) != Frontend user object (${frontendTier})`
          });
        }

        if (dbTier === 'premium' && !isPremium) {
          diagnostics.inconsistencies.push({
            type: 'premium_not_recognized',
            message: 'User is premium in database but frontend shows as non-premium'
          });
        }

        if (dbSubscriptionData?.status === 'active' && dbTier !== 'premium') {
          diagnostics.inconsistencies.push({
            type: 'active_subscription_not_premium',
            message: 'User has active subscription but not marked as premium in users table'
          });
        }
      }

      // 6. 生成建议
      if (diagnostics.inconsistencies.length > 0) {
        if (diagnostics.inconsistencies.some((i: any) => i.type === 'db_frontend_mismatch')) {
          diagnostics.recommendations.push({
            action: 'refresh_user_data',
            description: 'Frontend user data is stale, try refreshing user data',
            priority: 'high'
          });
        }

        if (diagnostics.inconsistencies.some((i: any) => i.type === 'active_subscription_not_premium')) {
          diagnostics.recommendations.push({
            action: 'sync_subscription_status',
            description: 'Subscription status needs to be synced to users table',
            priority: 'critical'
          });
        }
      } else {
        diagnostics.recommendations.push({
          action: 'check_browser_cache',
          description: 'Data appears consistent, issue might be browser cache or session related',
          priority: 'medium'
        });
      }

      setDiagnosticsResult(diagnostics);
      setUserData(dbUserData);
      setSubscriptionData(dbSubscriptionData);

    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: "Unable to run complete diagnostics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 修复数据不一致问题
  const fixDataInconsistency = async () => {
    if (!user || !diagnosticsResult) return;

    try {
      setLoading(true);

      // 如果有活跃订阅但用户不是premium，则同步状态
      if (subscriptionData?.status === 'active' && userData?.subscription_tier !== 'premium') {
        const { error } = await supabase
          .from('users')
          .update({
            subscription_tier: 'premium',
            max_sources: 20,
            can_schedule_digest: true,
            can_process_weekly: true,
          })
          .eq('id', user.id);

        if (error) throw error;

        await refreshUser();
        await runCompleteDiagnostics();

        toast({
          title: "✅ Fixed Successfully",
          description: "User permissions have been synced with subscription status",
        });
      } else {
        // 尝试刷新用户数据
        await refreshUser();
        await runCompleteDiagnostics();
        
        toast({
          title: "🔄 Refreshed",
          description: "User data has been refreshed",
        });
      }

    } catch (error) {
      console.error('Fix failed:', error);
      toast({
        title: "Fix Failed",
        description: "Unable to fix the inconsistency",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please login first</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Premium Status Diagnostics</h1>
          <p className="text-gray-600 mt-2">Debug tool for premium user display issues</p>
        </div>
        <Button 
          onClick={runCompleteDiagnostics}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-2" />}
          Run Complete Diagnostics
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 当前状态概览 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-blue-500" />
            Current Frontend Status
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Is Premium:</span>
              <span className={`font-semibold ${isPremium ? 'text-green-600' : 'text-red-600'}`}>
                {isPremium ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Subscription Tier:</span>
              <span className={`px-2 py-1 rounded text-xs ${user.subscriptionTier === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                {user.subscriptionTier || 'unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Max Sources:</span>
              <span>{limits.maxSources}</span>
            </div>
            <div className="flex justify-between">
              <span>Can Schedule Digest:</span>
              <span>{limits.canScheduleDigest ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Can Process Weekly:</span>
              <span>{limits.canProcessWeekly ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </Card>

        {/* 诊断结果 */}
        {diagnosticsResult && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              {diagnosticsResult.inconsistencies.length > 0 ? (
                <XCircle className="w-5 h-5 mr-2 text-red-500" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              )}
              Diagnostics Result
            </h2>
            
            {diagnosticsResult.inconsistencies.length > 0 ? (
              <div className="space-y-3">
                <div className="text-red-600 font-semibold">
                  Found {diagnosticsResult.inconsistencies.length} issue(s):
                </div>
                {diagnosticsResult.inconsistencies.map((issue: any, idx: number) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="text-sm text-red-800">
                      <span className="font-semibold">{issue.type}:</span> {issue.message}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4">
                  <h3 className="font-semibold text-blue-600 mb-2">Recommended Actions:</h3>
                  {diagnosticsResult.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                      <span className={`font-semibold ${rec.priority === 'critical' ? 'text-red-600' : rec.priority === 'high' ? 'text-orange-600' : 'text-blue-600'}`}>
                        [{rec.priority.toUpperCase()}]:
                      </span> {rec.description}
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={fixDataInconsistency}
                  disabled={loading}
                  className="w-full mt-4 bg-red-600 hover:bg-red-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Fix Data Inconsistency
                </Button>
              </div>
            ) : (
              <div className="text-green-600">
                ✅ All data appears consistent. No issues detected.
              </div>
            )}
          </Card>
        )}
      </div>

      {/* 详细数据展示 */}
      {diagnosticsResult && (
        <div className="mt-8 space-y-6">
          {/* 数据库用户数据 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Database User Data</h2>
            {userData ? (
              <div className="bg-gray-50 rounded p-4 text-sm font-mono">
                <pre>{JSON.stringify(userData, null, 2)}</pre>
              </div>
            ) : (
              <p className="text-gray-500">No user data</p>
            )}
          </Card>

          {/* 数据库订阅数据 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Database Subscription Data</h2>
            {subscriptionData ? (
              <div className="bg-gray-50 rounded p-4 text-sm font-mono">
                <pre>{JSON.stringify(subscriptionData, null, 2)}</pre>
              </div>
            ) : (
              <p className="text-gray-500">No subscription data</p>
            )}
          </Card>

          {/* 完整诊断数据 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Complete Diagnostics Data</h2>
            <div className="bg-gray-50 rounded p-4 text-sm font-mono">
              <pre>{JSON.stringify(diagnosticsResult, null, 2)}</pre>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DebugSubscription; 