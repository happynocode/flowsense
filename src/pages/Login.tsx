
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Navigate } from 'react-router-dom';
import { Brain, Zap, Shield, Globe } from 'lucide-react';

const Login = () => {
  const { user, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <Brain className="w-8 h-8 text-starlight" />
          </div>
          <p className="text-center text-lunar-grey">Setting up your personalized dashboard...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/10 via-transparent to-electric-blue/10"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-cosmic-gradient rounded-2xl flex items-center justify-center mb-6 glow-purple">
            <Brain className="w-10 h-10 text-starlight" />
          </div>
          <h1 className="text-4xl font-space-grotesk font-bold mb-2">
            <span className="text-cosmic-gradient">Daily</span>{" "}
            <span className="text-starlight">Digest</span>
          </h1>
          <p className="text-lunar-grey">Your personalized content summary awaits</p>
        </div>

        <Card className="glass-card border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-starlight">Welcome Back</CardTitle>
            <CardDescription className="text-lunar-grey">
              Sign in to access your personalized daily digest and never miss what matters most
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={login} 
              className="btn-cosmic w-full h-12 text-base"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
              Continue with Google
            </Button>
            
            <div className="text-xs text-lunar-grey text-center leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="glass-card p-4">
              <Zap className="w-6 h-6 text-electric-blue mx-auto mb-2" />
              <div className="text-xs text-starlight font-medium">Lightning Fast</div>
              <div className="text-xs text-lunar-grey">Get insights in seconds</div>
            </div>
            <div className="glass-card p-4">
              <Shield className="w-6 h-6 text-astral-teal mx-auto mb-2" />
              <div className="text-xs text-starlight font-medium">Always Secure</div>
              <div className="text-xs text-lunar-grey">Your data stays private</div>
            </div>
            <div className="glass-card p-4">
              <Globe className="w-6 h-6 text-cosmic-purple mx-auto mb-2" />
              <div className="text-xs text-starlight font-medium">Works Everywhere</div>
              <div className="text-xs text-lunar-grey">Access from any device</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
