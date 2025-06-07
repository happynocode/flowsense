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
      // 1. 首先检查 session 是否存在
      console.log('📡 检查当前 session...');
      const { data: sessionData, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("getSession 超时")), 5000)
        )
      ]);

      console.log('✅ session 检查完成:', { 
        hasSession: !!sessionData.session, 
        userEmail: sessionData.session?.user?.email,
        error: sessionError?.message 
      });

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        setUser(null);
        return;
      }

      if (!sessionData.session) {
        console.log('ℹ️ 未找到有效 session，用户未登录');
        setUser(null);
        return;
      }

      // 2. 如果有 session，再调用 getUser() 获取最新用户信息
      console.log('📞 调用 supabase.auth.getUser()...');
      
      const { data: userData, error: userError } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("getUser 超时")), 5000)
        )
      ]);
      
      console.log('✅ supabase.auth.getUser() 调用完成', { 
        hasUser: !!userData?.user, 
        userEmail: userData?.user?.email,
        error: userError?.message 
      });
      
      if (userError) {
        console.error('❌ Auth getUser error:', userError);
        // 如果 getUser 失败但有 session，使用 session 中的用户信息
        if (sessionData.session?.user) {
          console.log('🔄 getUser 失败，使用 session 中的用户信息');
          const supabaseUser = sessionData.session.user;
          const fallbackUserData = {
            id: supabaseUser.id,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            email: supabaseUser.email || '',
            avatar: supabaseUser.user_metadata?.avatar_url || '',
            createdAt: supabaseUser.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUser(fallbackUserData);
        } else {
          setUser(null);
        }
        return;
      }
      
      if (userData?.user) {
        console.log('✅ 找到 Supabase 用户:', userData.user.email);
        
        // 🎯 直接从 Auth 用户信息构建用户对象，不访问数据库
        const authUserData = {
          id: userData.user.id,
          name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'User',
          email: userData.user.email || '',
          avatar: userData.user.user_metadata?.avatar_url || '',
          createdAt: userData.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('🎯 设置用户数据（仅来自 Auth）:', authUserData);
        setUser(authUserData);
        console.log('✅ setUser 调用完成');
        
        // 🔧 可选：后台同步到数据库（不阻塞主流程，有错误保护）
        syncUserToDatabase(userData.user).catch(error => {
          console.warn('⚠️ 后台数据库同步失败（不影响用户体验）:', error);
        });
      } else {
        console.log('ℹ️ 未找到用户，设置 user = null');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ refreshUser 异常:', error);
      
      // 如果是超时错误，自动清除可能损坏的 session
      if (error instanceof Error && error.message.includes('超时')) {
        console.warn('⚠️ Auth 操作超时，清除 session 防止死循环');
        try {
          await supabase.auth.signOut();
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

    // 最大初始化超时
    const maxInitTimeout = setTimeout(() => {
      console.warn('⏰ 认证初始化最大超时，强制完成加载');
      setLoading(false);
      setInitialized(true);
    }, 10000); // 10秒超时

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