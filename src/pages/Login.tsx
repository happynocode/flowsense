
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Navigate } from 'react-router-dom';
import { Sparkles, Zap, Brain, Shield } from 'lucide-react';

const Login = () => {
  const { user, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-gray-300 mt-4">Initializing Neural Interface...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="particles">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 float">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <Sparkles className="text-white h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Daily Digest AI</h1>
          <p className="text-gray-300">Neural-Powered Content Intelligence Platform</p>
        </div>

        <Card className="glass-card p-8 float-delayed">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl font-bold text-white mb-2">Neural Access Portal</CardTitle>
            <CardDescription className="text-gray-300 text-base">
              Connect to your personalized AI consciousness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <button 
              onClick={login} 
              className="glow-button w-full h-12 text-base font-semibold flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Initialize Neural Link
            </button>
            
            <div className="text-xs text-gray-400 text-center leading-relaxed">
              By connecting to our neural network, you agree to our Quantum Terms of Service and AI Privacy Protocol
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 float-delayed-2">
          <Card className="glass-card p-6">
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                  <Brain className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-white">AI Neural Engine</div>
                <div className="text-xs text-gray-400">Quantum processing</div>
              </div>
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-white">Real-time Sync</div>
                <div className="text-xs text-gray-400">Instant analysis</div>
              </div>
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-white">Quantum Security</div>
                <div className="text-xs text-gray-400">Neural encryption</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
