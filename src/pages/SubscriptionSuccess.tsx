import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Crown, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { subscriptionService } from '../services/subscription';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';

const SubscriptionSuccess = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false); // 防止重复处理

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // 防止重复处理
    if (hasProcessed) return;
    
    if (user && sessionId) {
      setHasProcessed(true);
      handleSubscriptionSuccess();
    } else if (!authLoading && !user) {
      // 如果用户未登录，重定向到登录页面
      setLoading(false);
    } else if (!sessionId && user && !hasProcessed) {
      // 如果没有session_id但用户已登录，检查是否有新的订阅
      setHasProcessed(true);
      handleSubscriptionSuccessWithoutSessionId();
    } else if (!sessionId && !user) {
      // 如果没有session_id且没有用户，重定向到订阅页面
      setLoading(false);
    }
  }, [user, sessionId, authLoading, hasProcessed]);

  const handleSubscriptionSuccessWithoutSessionId = async () => {
    try {
      setLoading(true);
      
      // 检查用户是否有活跃订阅
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch subscription:', error);
        setLoading(false);
        return;
      }

      if (subscription) {
        // 用户有活跃订阅，进行权限同步
        await handleSubscriptionSuccess();
      } else {
        // 没有活跃订阅，重定向到订阅页面
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setLoading(false);
    }
  };

  const handleSubscriptionSuccess = async () => {
    try {
      setLoading(true);
      
      // 直接查询数据库获取最新的订阅状态，而不是调用不存在的Edge Function
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch subscription:', error);
        // 即使查询失败，也要显示页面，避免无限循环
        setSuccess(true);
        setLoading(false);
        return;
      }

      // 如果有活跃订阅，检查用户权限是否已更新
      if (subscription && subscription.status === 'active') {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('subscription_tier, max_sources, can_schedule_digest, can_process_weekly')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Failed to fetch user data:', userError);
        }

        // 如果用户权限还没有更新为premium，手动更新
        if (userData && userData.subscription_tier !== 'premium') {
          console.log('Updating user to premium tier...');
          
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_tier: 'premium',
              max_sources: 20,
              can_schedule_digest: true,
              can_process_weekly: true,
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update user tier:', updateError);
          } else {
            console.log('User tier updated to premium');
            // 只在成功更新后才刷新用户信息
            await refreshUser();
          }
        }
      }
      
      setSuccess(true);
      
      toast({
        title: "🎉 订阅成功！",
        description: "您的高级版订阅已激活，现在可以享受所有高级功能。",
      });
      
    } catch (error) {
      console.error('Failed to sync subscription:', error);
      // 即使出错也要显示成功页面，避免卡住
      setSuccess(true);
      toast({
        title: "订阅激活中",
        description: "您的订阅正在处理中，请稍后刷新页面查看状态。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // 如果没有 sessionId，但用户已登录，检查是否有活跃订阅
  if (!sessionId && user && !hasProcessed) {
    // 触发检查，但不重定向，避免循环
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">检查订阅状态...</h2>
          <p className="text-gray-600">正在验证您的订阅信息</p>
        </div>
      </div>
    );
  }

  // 如果没有 sessionId 且已经处理过，重定向到订阅页面
  if (!sessionId && hasProcessed && !success) {
    return <Navigate to="/subscription" replace />;
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">正在激活您的订阅...</h2>
          <p className="text-gray-600">请稍候，我们正在处理您的订阅信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-gray-800">
            🎉 订阅成功！
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            恭喜您！您的高级版订阅已成功激活。现在您可以享受所有高级功能，包括无限信息源、
            自动摘要和本周内容处理。
          </p>

          {/* Premium Features */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center justify-center mb-6">
              <Crown className="w-8 h-8 text-yellow-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-800">您现在拥有的功能</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800">20个信息源</h3>
                    <p className="text-sm text-gray-600">添加更多您关注的内容源</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800">自动定时摘要</h3>
                    <p className="text-sm text-gray-600">设置自动发送时间</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800">本周内容处理</h3>
                    <p className="text-sm text-gray-600">处理过去7天的内容</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800">7天免费试用</h3>
                    <p className="text-sm text-gray-600">试用期内随时可以取消</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/sources">
              <Button className="btn-primary">
                <Crown className="w-4 h-4 mr-2" />
                开始管理信息源
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <Link to="/subscription">
              <Button variant="outline">
                查看订阅详情
              </Button>
            </Link>
          </div>

          {/* Trial Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>提醒：</strong> 您的7天免费试用已开始。如果您在试用期内取消订阅，将不会产生任何费用。
              您可以在订阅管理页面随时查看或取消订阅。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess; 