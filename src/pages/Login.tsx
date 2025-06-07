import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { Brain, Zap, Shield, Globe, Mail, Lock, User } from 'lucide-react';
import LoadingIndicator from '../components/common/LoadingIndicator';

const Login = () => {
  const { user, login, signUp, loading } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <Brain className="w-8 h-8 text-starlight" />
          </div>
          <LoadingIndicator size="lg" text="连接到神经接口..." />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await login(loginForm.email, loginForm.password);
    } catch (error) {
      // Error is handled in the login function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (signUpForm.password !== signUpForm.confirmPassword) {
      alert('密码不匹配');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(signUpForm.email, signUpForm.password, signUpForm.name);
    } catch (error) {
      // Error is handled in the signUp function
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/10 via-transparent to-electric-blue/10"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-cosmic-gradient rounded-2xl flex items-center justify-center mb-6 glow-purple">
            <Brain className="w-10 h-10 text-starlight" />
          </div>
          <h1 className="text-4xl font-space-grotesk font-bold mb-2">
            <span className="text-cosmic-gradient">Neural</span>{" "}
            <span className="text-starlight">Hub</span>
          </h1>
          <p className="text-lunar-grey">您的个性化内容摘要等待着您</p>
        </div>

        <Card className="glass-card border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-starlight">欢迎回来</CardTitle>
            <CardDescription className="text-lunar-grey">
              登录访问您的个性化每日摘要，永远不错过重要内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="signup">注册</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-starlight">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-starlight">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="btn-cosmic w-full h-12 text-base"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <LoadingIndicator size="sm" />
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        进入神经接口
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-starlight">姓名</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="您的姓名"
                        value={signUpForm.name}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-starlight">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signUpForm.email}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-starlight">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-starlight">确认密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="btn-cosmic w-full h-12 text-base"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <LoadingIndicator size="sm" />
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        创建神经账户
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="text-xs text-lunar-grey text-center leading-relaxed mt-6">
              登录即表示您同意我们的服务条款和隐私政策
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="glass-card p-4">
              <Zap className="w-6 h-6 text-electric-blue mx-auto mb-2" />
              <div className="text-xs text-starlight font-medium">闪电般快速</div>
              <div className="text-xs text-lunar-grey">秒级获取洞察</div>
            </div>
            <div className="glass-card p-4">
              <Shield className="w-6 h-6 text-astral-teal mx-auto mb-2" />
              <div className="text-xs text-starlight font-medium">始终安全</div>
              <div className="text-xs text-lunar-grey">数据保持私密</div>
            </div>
            <div className="glass-card p-4">
              <Globe className="w-6 h-6 text-cosmic-purple mx-auto mb-2" />
              <div className="text-xs text-starlight font-medium">随处可用</div>
              <div className="text-xs text-lunar-grey">任何设备访问</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;