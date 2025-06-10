import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Crown, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { subscriptionService } from '../services/subscription';
import { useToast } from '../hooks/use-toast';

const SubscriptionSuccess = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (user && sessionId) {
      handleSubscriptionSuccess();
    } else if (!authLoading && !user) {
      // 如果用户未登录，重定向到登录页面
      setLoading(false);
    } else if (!sessionId) {
      // 如果没有session_id，重定向到订阅页面
      setLoading(false);
    }
  }, [user, sessionId, authLoading]);

  const handleSubscriptionSuccess = async () => {
    try {
      setLoading(true);
      
      // 同步订阅状态
      await subscriptionService.syncSubscriptionStatus();
      
      // 刷新用户信息以获取最新的订阅状态
      await refreshUser();
      
      setSuccess(true);
      
      toast({
        title: "🎉 订阅成功！",
        description: "您的高级版订阅已激活，现在可以享受所有高级功能。",
      });
      
    } catch (error) {
      console.error('Failed to sync subscription:', error);
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

  if (!sessionId) {
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