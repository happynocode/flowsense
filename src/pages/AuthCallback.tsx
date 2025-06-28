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
        console.log('📍 当前 URL:', window.location.href);
        console.log('🔍 URL 参数:', window.location.search);
        console.log('🔍 URL Hash:', window.location.hash);
        
        // 检查 URL 参数中是否有认证相关的信息
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // 检查是否有错误
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        const code = urlParams.get('code') || hashParams.get('code');
        
        console.log('🔍 认证信息:', { error, errorDescription, code });
        
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

        // 如果有认证代码，说明这是 OAuth 回调
        if (code) {
          console.log('✅ 检测到认证代码，处理 OAuth 会话...');
          
          // 对于 Supabase OAuth，我们通常让它自动处理
          // 等待一小段时间让 Supabase 处理认证
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 备用方案：检查当前会话
        console.log('🔄 检查当前会话...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
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

        if (sessionData.session) {
          console.log('✅ 找到现有会话:', sessionData.session.user.email);
          toast({
            title: "登录成功",
            description: `欢迎回到 FlowSense，${sessionData.session.user.email}！`,
          });
          
          // 跳转到主页
          navigate('/', { replace: true });
        } else {
          console.warn('⚠️ 没有找到有效会话或认证代码');
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

    // 添加一个小延迟确保 DOM 完全加载
    const timeoutId = setTimeout(handleAuthCallback, 100);
    
    return () => clearTimeout(timeoutId);
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