
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
        <LoadingIndicator size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <Home />;
};

export default Index;
