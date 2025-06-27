import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Landing from './Landing';
import LoadingIndicator from '../components/common/LoadingIndicator';
import EnvCheck from '../components/debug/EnvCheck';

const Index = () => {
  const { user, loading } = useAuth();

  console.log('📄 Index 页面状态:', { 
    hasUser: !!user, 
    loading, 
    userEmail: user?.email,
    userId: user?.id 
  });

  // 在开发环境中显示环境变量检查
  const isDevelopment = import.meta.env.DEV;
  const showEnvCheck = isDevelopment && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (loading) {
    console.log('⏳ Index 页面显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="modern-card p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-full flex items-center justify-center shadow-sm">
            <div className="loading-spinner" />
          </div>
          <LoadingIndicator size="lg" text="正在初始化神经接口..." />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('👤 未登录用户，显示 Landing 页面');
    return (
      <div>
        {showEnvCheck && (
          <div className="container mx-auto px-4 py-8">
            <EnvCheck />
          </div>
        )}
        <Landing />
      </div>
    );
  }

  console.log('✅ 已登录用户，重定向到信息源页面，用户信息:', {
    id: user.id,
    email: user.email,
    name: user.name
  });
  
  return <Navigate to="/sources" replace />;
};

export default Index;