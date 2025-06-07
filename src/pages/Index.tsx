import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Home from './Home';
import Landing from './Landing';
import LoadingIndicator from '../components/common/LoadingIndicator';

const Index = () => {
  const { user, loading } = useAuth();

  console.log('📄 Index 页面状态:', { 
    hasUser: !!user, 
    loading, 
    userEmail: user?.email 
  });

  if (loading) {
    console.log('⏳ Index 页面显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-starlight border-t-transparent" />
          </div>
          <LoadingIndicator size="lg" text="正在初始化神经接口..." />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('👤 未登录用户，显示 Landing 页面');
    return <Landing />;
  }

  console.log('✅ 已登录用户，显示 Home 页面');
  return <Home />;
};

export default Index;