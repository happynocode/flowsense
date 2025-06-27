import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import { userApi } from '../services/api';
import { subscriptionService } from '../services/subscription';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { AlertCircle, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';

const DebugSubscription = () => {
  const { user, loading, refreshUser } = useAuth();
  const { isPremium, isFree, limits } = useSubscription();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [rawDbData, setRawDbData] = useState<any>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  // 完整的诊断流程
  const runCompleteDiagnostics = async () => {
    if (!user) return;

    try {
      setIsProcessing(true);
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
      setIsProcessing(false);
    }
  };

  // 修复数据不一致问题
  const fixDataInconsistency = async () => {
    if (!user || !diagnosticsResult) return;

    try {
      setIsProcessing(true);

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
        setIsProcessing(false);
      }
  };

  // 🔍 深度调试函数 - 检查所有可能的数据源
  const runFullDiagnostic = async () => {
    setIsDebugging(true);
    console.log('🔍 开始全面诊断...');
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('❌ 未找到认证用户');
        setDebugInfo({ error: '未找到认证用户' });
        return;
      }

      console.log('✅ 认证用户:', authUser.id);

      // 1. 直接查询数据库中的完整用户记录
      console.log('🔍 Step 1: 查询完整用户记录...');
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('📋 数据库查询结果:', { dbUser, dbError });

      // 2. 使用API方法获取订阅信息
      console.log('🔍 Step 2: 使用API获取订阅信息...');
      let apiSubInfo = null;
      let apiError = null;
      try {
        apiSubInfo = await userApi.getUserSubscriptionInfo();
        console.log('✅ API订阅信息:', apiSubInfo);
      } catch (err) {
        apiError = err;
        console.error('❌ API订阅信息获取失败:', err);
      }

      // 3. 使用API方法获取auto digest设置
      console.log('🔍 Step 3: 使用API获取auto digest设置...');
      let apiAutoDigest = null;
      let autoDigestError = null;
      try {
        apiAutoDigest = await userApi.getAutoDigestSettings();
        console.log('✅ API Auto Digest设置:', apiAutoDigest);
      } catch (err) {
        autoDigestError = err;
        console.error('❌ API Auto Digest设置获取失败:', err);
      }

      // 4. 检查subscriptions表
      console.log('🔍 Step 4: 查询subscriptions表...');
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', authUser.id);

      console.log('📋 Subscriptions表查询结果:', { subscriptions, subsError });

      // 5. 数据一致性分析
      const diagnostic = {
        timestamp: new Date().toISOString(),
        authUser: {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at
        },
        database: {
          user: dbUser,
          error: dbError?.message,
          subscriptions: subscriptions,
          subscriptionError: subsError?.message
        },
        api: {
          subscriptionInfo: apiSubInfo,
          subscriptionError: apiError?.message,
          autoDigestSettings: apiAutoDigest,
          autoDigestError: autoDigestError?.message
        },
                 userObject: {
           hasUser: !!user,
           fullUserObject: user, // 完整的用户对象
           subscriptionTier: user?.subscriptionTier,
           maxSources: user?.maxSources,
           canScheduleDigest: user?.canScheduleDigest,
           canProcessWeekly: user?.canProcessWeekly,
           autoDigestEnabled: user?.autoDigestEnabled,
           autoDigestTime: user?.autoDigestTime,
           autoDigestTimezone: user?.autoDigestTimezone,
           userObjectKeys: user ? Object.keys(user) : [] // 显示用户对象包含的所有键
         },
        consistency: {
          dbVsApi: {
            subscriptionTier: dbUser?.subscription_tier === apiSubInfo?.subscriptionTier,
            maxSources: dbUser?.max_sources === apiSubInfo?.maxSources,
            canScheduleDigest: dbUser?.can_schedule_digest === apiSubInfo?.canScheduleDigest,
            canProcessWeekly: dbUser?.can_process_weekly === apiSubInfo?.canProcessWeekly
          },
          dbVsUser: {
            subscriptionTier: dbUser?.subscription_tier === user?.subscriptionTier,
            maxSources: dbUser?.max_sources === user?.maxSources,
            canScheduleDigest: dbUser?.can_schedule_digest === user?.canScheduleDigest,
            canProcessWeekly: dbUser?.can_process_weekly === user?.canProcessWeekly,
            autoDigestEnabled: dbUser?.auto_digest_enabled === user?.autoDigestEnabled
          },
          apiVsUser: {
            subscriptionTier: apiSubInfo?.subscriptionTier === user?.subscriptionTier,
            maxSources: apiSubInfo?.maxSources === user?.maxSources,
            canScheduleDigest: apiSubInfo?.canScheduleDigest === user?.canScheduleDigest,
            canProcessWeekly: apiSubInfo?.canProcessWeekly === user?.canProcessWeekly
          }
        }
      };

      console.log('📊 完整诊断报告:', diagnostic);
      setDebugInfo(diagnostic);
      setRawDbData(dbUser);
      setApiData(apiSubInfo);

    } catch (error) {
      console.error('❌ 诊断过程发生错误:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setIsDebugging(false);
    }
  };

  // 🔧 强制修复函数
  const forceFixUserState = async () => {
    try {
      console.log('🔧 开始强制修复用户状态...');
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('未找到认证用户');

      // 直接查询数据库获取最新数据
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      console.log('📋 强制修复 - 数据库用户数据:', dbUser);

      // 如果数据库中确实是premium用户，但字段缺失，则补充字段
      if (dbUser && !dbUser.subscription_tier) {
        console.log('🔧 检测到缺失的subscription_tier字段，尝试修复...');
        
        // 检查subscriptions表确定用户的实际订阅状态
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'active');

        const isPremium = subscriptions && subscriptions.length > 0;
        
        // 更新用户记录
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: isPremium ? 'premium' : 'free',
            max_sources: isPremium ? 20 : 3,
            can_schedule_digest: isPremium,
            can_process_weekly: isPremium,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id);

        if (updateError) {
          console.error('❌ 用户记录更新失败:', updateError);
        } else {
          console.log('✅ 用户记录已更新');
        }
      }

      // 强制刷新用户状态
      await refreshUser();
      
      console.log('✅ 强制修复完成');
      
      // 重新运行诊断
      setTimeout(() => runFullDiagnostic(), 1000);
      
    } catch (error) {
      console.error('❌ 强制修复失败:', error);
    }
  };

  if (!user) {
    return <div>Please login first</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">
              🔍 Premium用户状态调试
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                         <div className="flex gap-4 flex-wrap">
               <Button 
                 onClick={runFullDiagnostic}
                 disabled={isDebugging}
                 variant="outline"
               >
                 {isDebugging ? '诊断中...' : '🔍 全面诊断'}
               </Button>
               
               <Button 
                 onClick={async () => {
                   try {
                     setIsDebugging(true);
                     console.log('🔍 开始数据库访问测试...');
                     const result = await userApi.debugDatabaseAccess();
                     console.log('📊 数据库访问测试结果:', result);
                     setDebugInfo({ databaseTest: result });
                   } catch (error) {
                     console.error('❌ 数据库访问测试失败:', error);
                     setDebugInfo({ error: error.message });
                   } finally {
                     setIsDebugging(false);
                   }
                 }}
                 disabled={isDebugging}
                 variant="outline"
               >
                 🔧 数据库测试
               </Button>
               
               <Button 
                 onClick={forceFixUserState}
                 disabled={isDebugging}
                 variant="destructive"
               >
                 🔧 强制修复
               </Button>
               
               <Button 
                 onClick={refreshUser}
                 disabled={loading || isProcessing}
                 variant="secondary"
               >
                 🔄 刷新用户状态
               </Button>
             </div>

            {/* 当前用户状态 */}
            <Card>
              <CardHeader>
                <CardTitle>当前用户状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Loading:</strong> {loading ? '是' : '否'}</div>
                  <div><strong>User存在:</strong> {user ? '是' : '否'}</div>
                  <div><strong>订阅等级:</strong> <Badge variant={user?.subscriptionTier === 'premium' ? 'default' : 'secondary'}>{user?.subscriptionTier || '未知'}</Badge></div>
                  <div><strong>最大Sources:</strong> {user?.maxSources || '未知'}</div>
                  <div><strong>可预定Digest:</strong> {user?.canScheduleDigest ? '是' : '否'}</div>
                  <div><strong>可处理周内容:</strong> {user?.canProcessWeekly ? '是' : '否'}</div>
                  <div><strong>Auto Digest启用:</strong> {user?.autoDigestEnabled ? '是' : '否'}</div>
                  <div><strong>Auto Digest时间:</strong> {user?.autoDigestTime || '未知'}</div>
                </div>
              </CardContent>
            </Card>

            {/* 诊断结果 */}
            {debugInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>📊 诊断结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugSubscription; 