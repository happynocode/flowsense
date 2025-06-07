import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useToast } from './use-toast';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  const refreshUser = async () => {
    console.log('🔄 refreshUser 开始执行...');
    
    try {
      // Check if supabase is properly configured
      if (!supabase || typeof supabase.auth?.getUser !== 'function') {
        console.error('❌ Supabase 客户端未正确配置');
        setUser(null);
        return;
      }

      console.log('📞 调用 supabase.auth.getUser() 前...');
      
      // Use a more robust timeout implementation
      const { data: { user: supabaseUser }, error } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('getUser 超时')), 10000) // Increased timeout to 10 seconds
        )
      ]);
      
      console.log('✅ supabase.auth.getUser() 调用完成', { 
        hasUser: !!supabaseUser, 
        userEmail: supabaseUser?.email,
        error: error?.message 
      });
      
      if (error) {
        console.error('❌ Auth getUser error:', error);
        setUser(null);
        return;
      }
      
      if (supabaseUser) {
        console.log('✅ 找到 Supabase 用户:', supabaseUser.email);
        
        const userData = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email || '',
          avatar: supabaseUser.user_metadata?.avatar_url || '',
          createdAt: supabaseUser.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('🎯 设置用户数据:', userData);
        setUser(userData);
        console.log('✅ setUser 调用完成');
        
        // Sync to database in background without blocking
        syncUserToDatabase(supabaseUser).catch(error => {
          console.warn('⚠️ 后台数据库同步失败（不影响用户体验）:', error);
        });
      } else {
        console.log('ℹ️ 未找到用户会话，设置 user = null');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ refreshUser 异常:', error);
      // Set user to null even on error to prevent infinite loading
      setUser(null);
      
      // Show user-friendly error message for timeout
      if (error instanceof Error && error.message.includes('超时')) {
        console.warn('⚠️ Supabase 连接超时，可能是网络问题或配置错误');
        toast({
          title: "连接超时",
          description: "无法连接到服务器，请检查网络连接或稍后重试。",
          variant: "destructive",
        });
      }
    }
    
    console.log('🏁 refreshUser 执行完成');
  };

  const syncUserToDatabase = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('🔄 后台同步用户到数据库...');
      
      // Check if database operations are available
      if (!supabase.from) {
        console.warn('⚠️ 数据库操作不可用，跳过同步');
        return;
      }
      
      const { data: existingUser, error: queryError } = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('email', supabaseUser.email)
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('数据库查询超时')), 5000)
        )
      ]);

      if (queryError && queryError.code !== 'PGRST116') {
        console.warn('⚠️ 数据库查询失败:', queryError);
        return;
      }

      if (!existingUser) {
        const newUserData = {
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
          avatar_url: supabaseUser.user_metadata?.avatar_url || null
        };
        
        const { error: createError } = await Promise.race([
          supabase
            .from('users')
            .insert(newUserData),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('创建用户超时')), 5000)
          )
        ]);

        if (createError) {
          console.warn('⚠️ 创建用户记录失败:', createError);
        } else {
          console.log('✅ 用户记录创建成功');
        }
      } else {
        console.log('✅ 用户记录已存在');
      }
    } catch (error) {
      console.warn('⚠️ 数据库同步异常（不影响用户体验）:', error);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('📝 开始注册用户:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        console.error('❌ 注册错误:', error);
        let errorMessage = error.message;
        
        if (error.message.includes('User already registered')) {
          errorMessage = '该邮箱已被注册，请尝试登录或使用其他邮箱。';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '邮箱格式不正确，请检查后重试。';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = '密码至少需要6个字符。';
        }
        
        toast({
          title: "注册失败",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }

      console.log('✅ 注册成功:', data);
      
      if (data.user && !data.session) {
        toast({
          title: "注册成功",
          description: "请检查您的邮箱并点击确认链接来激活账户。",
        });
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 开始登录用户:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ 登录错误:', error);
        let errorMessage = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '邮箱或密码错误，请检查后重试。';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '请先确认您的邮箱地址。';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '请求过于频繁，请稍后再试。';
        }
        
        toast({
          title: "登录失败",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }

      console.log('✅ 登录成功:', data.user?.email);
      
      if (data.user) {
        toast({
          title: "登录成功",
          description: "欢迎回到 Neural Hub！",
        });
      }
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 开始登出...');
      
      setUser(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ 登出错误:', error);
        toast({
          title: "登出失败",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ 登出成功');
        toast({
          title: "已成功登出",
          description: "您已安全退出账户。",
        });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast({
        title: "登出失败",
        description: "退出时发生错误，请重试。",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (initialized) {
      console.log('⚠️ 认证已初始化，跳过重复初始化');
      return;
    }

    const initAuth = async () => {
      try {
        console.log('🚀 开始初始化认证系统...');
        
        // Check environment variables
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        console.log('🔧 环境变量检查:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          urlLength: supabaseUrl?.length || 0,
          keyLength: supabaseKey?.length || 0
        });
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('❌ Supabase 环境变量未配置');
          setLoading(false);
          setInitialized(true);
          toast({
            title: "配置错误",
            description: "Supabase 配置缺失，请检查环境变量设置。",
            variant: "destructive",
          });
          return;
        }
        
        // Check Supabase client
        if (!supabase || typeof supabase.auth?.getSession !== 'function') {
          console.error('❌ Supabase 客户端未正确配置');
          setLoading(false);
          setInitialized(true);
          toast({
            title: "连接错误",
            description: "无法连接到认证服务，请检查配置。",
            variant: "destructive",
          });
          return;
        }
        
        console.log('✅ Supabase 客户端检查通过');
        
        try {
          console.log('📡 获取当前会话...');
          
          const { data: { session }, error } = await Promise.race([
            supabase.auth.getSession(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('会话获取超时')), 8000)
            )
          ]);
          
          console.log('✅ 会话获取完成:', { 
            hasSession: !!session, 
            userEmail: session?.user?.email,
            error: error?.message 
          });
          
          if (error) {
            console.error('❌ 会话获取错误:', error);
          } else if (session) {
            console.log('✅ 找到现有会话，刷新用户数据...');
            await refreshUser();
          } else {
            console.log('ℹ️ 未找到现有会话');
          }
        } catch (sessionError) {
          console.warn('⚠️ 获取会话时出错，但继续加载应用:', sessionError);
          if (sessionError instanceof Error && sessionError.message.includes('超时')) {
            toast({
              title: "连接超时",
              description: "初始化时连接超时，您可能需要重新登录。",
              variant: "destructive",
            });
          }
        }
        
      } catch (error) {
        console.error('❌ 认证初始化错误:', error);
        toast({
          title: "初始化失败",
          description: "认证系统初始化失败，请刷新页面重试。",
          variant: "destructive",
        });
      } finally {
        console.log('🏁 认证初始化完成，设置 loading = false');
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    console.log('👂 设置认证状态监听器...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 认证状态变化:', event, session?.user?.email || 'no user');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ 用户已登录，刷新用户数据');
        try {
          await refreshUser();
        } catch (refreshError) {
          console.error('❌ 状态变化时刷新用户失败:', refreshError);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 用户已登出');
        setUser(null);
        setLoading(false);
      }
    });

    // Maximum initialization timeout
    const maxInitTimeout = setTimeout(() => {
      console.warn('⏰ 认证初始化最大超时，强制完成加载');
      setLoading(false);
      setInitialized(true);
    }, 12000); // Increased to 12 seconds

    return () => {
      console.log('🧹 清理认证监听器');
      clearTimeout(maxInitTimeout);
      subscription.unsubscribe();
    };
  }, [initialized]);

  const value = {
    user,
    loading,
    signUp,
    signIn,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};