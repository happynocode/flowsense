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
  const { user, signIn, signUp, loading } = useAuth();
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
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <Brain className="w-8 h-8 text-starlight" />
          </div>
          <p className="text-center text-lunar-grey">正在初始化神经接口...</p>
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
        title: "请填写完整信息",
        description: "邮箱和密码都是必填项。",
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
        title: "请填写完整信息",
        description: "所有字段都是必填项。",
        variant: "destructive",
      });
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "请确保两次输入的密码相同。",
        variant: "destructive",
      });
      return;
    }

    if (signUpForm.password.length < 6) {
      toast({
        title: "密码太短",
        description: "密码至少需要6个字符。",
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
          <p className="text-lunar-grey">连接您的个性化内容摘要</p>
        </div>

        {/* Supabase 配置警告 */}
        {showSupabaseWarning && (
          <Alert className="mb-6 border-nebula-pink/50 bg-nebula-pink/10">
            <AlertCircle className="h-4 w-4 text-nebula-pink" />
            <AlertDescription className="text-starlight">
              <strong>配置提醒：</strong> 需要配置 Supabase 环境变量才能使用登录功能。
              请检查 .env 文件中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。
            </AlertDescription>
          </Alert>
        )}

        {/* StackBlitz 环境提示 */}
        <Alert className="mb-6 border-electric-blue/50 bg-electric-blue/10">
          <AlertCircle className="h-4 w-4 text-electric-blue" />
          <AlertDescription className="text-starlight">
            <strong>StackBlitz 环境提示：</strong> 请确保在 Supabase 控制台中设置了正确的重定向 URL。
            建议使用密码登录而非第三方登录以获得最佳体验。
          </AlertDescription>
        </Alert>

        <Card className="glass-card border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-starlight">欢迎使用</CardTitle>
            <CardDescription className="text-lunar-grey">
              登录或注册以访问您的个性化每日摘要
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-midnight/60">
                <TabsTrigger value="signin" className="text-starlight data-[state=active]:bg-cosmic-gradient">
                  登录
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-starlight data-[state=active]:bg-cosmic-gradient">
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-starlight">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-starlight">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lunar-grey" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="btn-cosmic w-full h-12 text-base"
                    disabled={isSubmitting || showSupabaseWarning}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-starlight border-t-transparent mr-2" />
                        登录中...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        连接神经接口
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
                        disabled={showSupabaseWarning}
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
                        disabled={showSupabaseWarning}
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
                        placeholder="至少6个字符"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                        disabled={showSupabaseWarning}
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
                        placeholder="再次输入密码"
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 input-futuristic"
                        required
                        disabled={showSupabaseWarning}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="btn-cosmic w-full h-12 text-base"
                    disabled={isSubmitting || showSupabaseWarning}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-starlight border-t-transparent mr-2" />
                        注册中...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        创建神经接口
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="text-xs text-lunar-grey text-center leading-relaxed mt-6">
              注册即表示您同意我们的服务条款和隐私政策
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