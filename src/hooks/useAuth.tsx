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

  // 🛠️ 针对 StackBlitz 环境优化的 refreshUser 函数
  const refreshUser = async () => {
    console.log('🔄 refreshUser 开始执行（StackBlitz 优化版本）...');
    
    try {
      // 🎯 针对 StackBlitz 环境，使用更短的超时时间
      const createTimeout = (name: string, ms: number = 1500) => 
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${name} 超时`)), ms)
        );

      // 1. 首先尝试获取 session（1.5秒超时）
      console.log('📡 检查当前 session（StackBlitz 环境）...');
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([
          supabase.auth.getSession(),
          createTimeout("getSession", 1500)
        ]);
      } catch (timeoutError) {
        console.warn('⚠️ getSession 超时，尝试从 localStorage 恢复 session...');
        
        // 🔧 StackBlitz 环境 fallback：尝试从 localStorage 直接读取
        const storedSession = localStorage.getItem('sb-auth-token');
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            console.log('✅ 从 localStorage 恢复 session 成功');
            
            // 构建用户数据
            if (parsedSession.user) {
              const fallbackUserData = {
                id: parsedSession.user.id,
                name: parsedSession.user.user_metadata?.full_name || parsedSession.user.email?.split('@')[0] || 'User',
                email: parsedSession.user.email || '',
                avatar: parsedSession.user.user_metadata?.avatar_url || '',
                createdAt: parsedSession.user.created_at || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              setUser(fallbackUserData);
              console.log('✅ 用户状态已从 localStorage 恢复');
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ localStorage session 解析失败:', parseError);
          }
        }
        
        // 如果 localStorage 也没有，设置为未登录
        setUser(null);
        return;
      }

      const session = sessionResult.data?.session;
      console.log('✅ session 检查完成:', { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        error: sessionResult.error?.message 
      });

      if (sessionResult.error) {
        console.error('❌ Session error:', sessionResult.error);
        throw sessionResult.error;
      }

      if (!session) {
        console.log('ℹ️ 未找到有效 session，用户未登录');
        setUser(null);
        return;
      }

      // 2. 如果有 session，构建用户数据（不再调用 getUser，避免额外超时）
      console.log('✅ 找到有效 session，构建用户数据...');
      const supabaseUser = session.user;
      
      const authUserData = {
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        avatar: supabaseUser.user_metadata?.avatar_url || '',
        createdAt: supabaseUser.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('🎯 设置用户数据（来自 session）:', authUserData);
      setUser(authUserData);
      console.log('✅ setUser 调用完成');
      
      // 🔧 可选：后台同步到数据库（不阻塞主流程，有错误保护）
      syncUserToDatabase(supabaseUser).catch(error => {
        console.warn('⚠️ 后台数据库同步失败（不影响用户体验）:', error);
      });

    } catch (error) {
      console.warn('⚠️ refreshUser 异常:', error);
      
      // 如果是超时错误，自动清除可能损坏的 session
      if (error instanceof Error && error.message.includes('超时')) {
        console.warn('⚠️ Auth 操作超时，清除 session 防止死循环');
        try {
          await supabase.auth.signOut();
          localStorage.removeItem('sb-auth-token');
        } catch (signOutError) {
          console.error('❌ 清除 session 失败:', signOutError);
        }
      }
      
      setUser(null);
    }
    
    console.log('🏁 refreshUser 执行完成');
  };

  const syncUserToDatabase = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('🔄 后台同步用户到数据库...');
      
      // 检查数据库操作是否可用
      if (!supabase.from) {
        console.warn('⚠️ 数据库操作不可用，跳过同步');
        return;
      }
      
      // 🔧 可选：数据库同步（仅当你有这个表时）
      try {
        await supabase
          .from('users')
          .upsert([{ 
            id: supabaseUser.id, 
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            avatar_url: supabaseUser.user_metadata?.avatar_url || null
          }]);
        console.log('✅ 用户数据库同步成功');
      } catch (dbError: any) {
        if (dbError?.message?.includes("relation") || dbError?.code === '42P01') {
          console.warn("🔧 users 表不存在，跳过同步");
        } else {
          throw dbError;
        }
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
          },
          emailRedirectTo: undefined // 👈 避免重定向问题
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
      } else if (data.session) {
        // 如果注册后直接有 session，说明邮箱确认被禁用，用户已登录
        console.log('✅ 注册后直接登录成功');
        toast({
          title: "注册成功",
          description: "欢迎加入 Neural Hub！",
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
        
        // 🎯 登录成功后，直接设置用户状态，避免额外的 refreshUser 调用
        console.log('🔄 登录成功，直接设置用户状态...');
        const authUserData = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar_url || '',
          createdAt: data.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUser(authUserData);
        
        // 后台同步数据库
        syncUserToDatabase(data.user).catch(error => {
          console.warn('⚠️ 登录后数据库同步失败（不影响用户体验）:', error);
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
        // 清理 localStorage
        localStorage.removeItem('sb-auth-token');
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
        console.log('🚀 开始初始化认证系统（StackBlitz 优化版本）...');
        
        // 检查环境变量
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
        
        // 检查 Supabase 客户端
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
          console.log('📡 初始化时刷新用户状态...');
          await refreshUser();
        } catch (refreshError) {
          console.warn('⚠️ 初始化时刷新用户失败，但继续加载应用:', refreshError);
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
        console.log('✅ 用户已登录，设置用户数据');
        const authUserData = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          createdAt: session.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUser(authUserData);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 用户已登出');
        setUser(null);
        setLoading(false);
        localStorage.removeItem('sb-auth-token');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 Token 已刷新，更新用户数据');
        const authUserData = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          createdAt: session.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUser(authUserData);
      }
    });

    // 最大初始化超时（防止无限加载）
    const maxInitTimeout = setTimeout(() => {
      console.warn('⏰ 认证初始化最大超时，强制完成加载');
      setLoading(false);
      setInitialized(true);
    }, 5000); // 减少到 5 秒超时

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