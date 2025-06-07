import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Home from './Home';
import Landing from './Landing';
import LoadingIndicator from '../components/common/LoadingIndicator';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <div className="w-8 h-8 bg-starlight rounded-full animate-pulse" />
          </div>
          <LoadingIndicator size="lg" text="正在连接神经网络..." />
        </div>
      </div>
    );
  }

  // If user is authenticated, show the Home component
  if (user) {
    return <Home />;
  }

  // If not authenticated, show the Landing page
  return <Landing />;
};

export default Index;