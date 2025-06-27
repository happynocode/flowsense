import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Navigate, useNavigate } from 'react-router-dom';
import { Brain, Zap, Shield, Globe, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Alert, AlertDescription } from '../components/ui/alert';

const Login = () => {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: ''
  });
  
  const [signUpForm, setSignUpForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupabaseWarning, setShowSupabaseWarning] = useState(false);

  // 检查 Supabase 配置
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      setShowSupabaseWarning(true);
    }
  }, []);

  // 🎯 监听用户状态变化，登录成功后自动跳转
  useEffect(() => {
    if (user && !loading) {
      console.log('🎯 用户已登录，准备跳转到首页:', user.email);
      // 使用 navigate 而不是 Navigate 组件，确保跳转
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mx-auto mb-2" />
                          <p className="text-center text-gray-600">Initializing FlowSense...</p>
        </div>
      </div>
    );
  }

  // 如果用户已登录，直接跳转（备用保护）
  if (user) {
    console.log('🔄 用户已登录，使用 Navigate 组件跳转');
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInForm.email || !signInForm.password) {
      toast({
        title: "Please fill in all fields",
        description: "Email and password are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔐 开始登录流程...');
      await signIn(signInForm.email, signInForm.password);
      console.log('✅ 登录流程完成');
      // 登录成功后，useEffect 会自动处理跳转
    } catch (error) {
      console.error('❌ 登录失败:', error);
      // Error is handled in the signIn function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpForm.name || !signUpForm.email || !signUpForm.password || !signUpForm.confirmPassword) {
      toast({
        title: "Please fill in all fields",
        description: "All fields are required.",
        variant: "destructive",
      });
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (signUpForm.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('📝 开始注册流程...');
      await signUp(signUpForm.email, signUpForm.password, signUpForm.name);
      console.log('✅ 注册流程完成');
      // Reset form on success
      setSignUpForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      // 注册成功后，如果直接登录，useEffect 会自动处理跳转
    } catch (error) {
      console.error('❌ 注册失败:', error);
      // Error is handled in the signUp function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (showSupabaseWarning) {
      toast({
        title: "Configuration Required",
        description: "Please configure Supabase environment variables first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔐 开始 Google 登录流程...');
      await signInWithGoogle();
      console.log('✅ Google 登录流程完成');
      // Google OAuth 会自动重定向，不需要在这里处理
    } catch (error) {
      console.error('❌ Google 登录失败:', error);
      // Error is handled in the signInWithGoogle function
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Brain className="w-10 h-10 text-white" />
          </div>
                      <h1 className="text-4xl font-space-grotesk font-bold mb-2">
              <span className="text-gradient-primary">Flow</span>
              <span className="text-gray-800">Sense</span>
            </h1>
          <p className="text-gray-600">Connect to your personalized content digest</p>
        </div>

        {/* Supabase Configuration Warning */}
        {showSupabaseWarning && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Configuration Required:</strong> Supabase environment variables need to be configured for login functionality.
              Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-white border shadow-lg">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-800">Welcome</CardTitle>
            <CardDescription className="text-gray-600">
              Sign in or register to access your personalized daily digest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="signin" className="text-gray-700 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-gray-700 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="btn-primary w-full h-12 text-base"
                    disabled={isSubmitting || showSupabaseWarning}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Connect to FlowSense
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting || showSupabaseWarning}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-700">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={signUpForm.name}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signUpForm.email}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-gray-700">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Re-enter password"
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="btn-primary w-full h-12 text-base"
                    disabled={isSubmitting || showSupabaseWarning}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Create FlowSense Account
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting || showSupabaseWarning}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="text-xs text-gray-500 text-center leading-relaxed mt-6">
              By registering, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <Zap className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-xs text-gray-800 font-medium">Lightning Fast</div>
              <div className="text-xs text-gray-500">Get insights in seconds</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <Shield className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-xs text-gray-800 font-medium">Always Secure</div>
              <div className="text-xs text-gray-500">Your data stays private</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <Globe className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <div className="text-xs text-gray-800 font-medium">Available Anywhere</div>
              <div className="text-xs text-gray-500">Access from any device</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;