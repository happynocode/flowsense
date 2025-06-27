import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { Brain } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 处理 OAuth 回调...');
        
        // 获取当前 URL 的 hash 或 search 参数
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // 检查是否有错误
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.error('❌ OAuth 回调错误:', error, errorDescription);
          let errorMessage = 'Google 登录失败，请重试。';
          
          if (error === 'access_denied') {
            errorMessage = '您取消了 Google 登录授权。';
          } else if (error === 'server_error') {
            errorMessage = '服务器错误，请稍后重试。';
          }
          
          toast({
            title: "登录失败",
            description: errorMessage,
            variant: "destructive",
          });
          
          navigate('/login', { replace: true });
          return;
        }

        // 处理 OAuth 会话
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ 获取会话失败:', sessionError);
          toast({
            title: "登录失败",
            description: "无法获取认证会话，请重试。",
            variant: "destructive",
          });
          navigate('/login', { replace: true });
          return;
        }

        if (data.session) {
          console.log('✅ OAuth 登录成功:', data.session.user.email);
          toast({
            title: "登录成功",
            description: `欢迎回到 FlowSense，${data.session.user.email}！`,
          });
          
          // 跳转到主页
          navigate('/', { replace: true });
        } else {
          console.warn('⚠️ 没有找到有效会话');
          toast({
            title: "登录失败",
            description: "认证过程中出现问题，请重试。",
            variant: "destructive",
          });
          navigate('/login', { replace: true });
        }
        
      } catch (error) {
        console.error('❌ 处理 OAuth 回调时发生错误:', error);
        toast({
          title: "登录失败",
          description: "处理登录回调时发生错误，请重试。",
          variant: "destructive",
        });
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-space-grotesk font-bold mb-4">
          <span className="text-gradient-primary">Flow</span>
          <span className="text-gray-800">Sense</span>
        </h1>
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent mr-3" />
          <p className="text-gray-600">Processing your login...</p>
        </div>
        <p className="text-sm text-gray-500">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
};

export default AuthCallback; 