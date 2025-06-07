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
    try {
      console.log('🔄 开始刷新用户数据...');
      
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Auth error:', error);
        setUser(null);
        return;
      }
      
      if (supabaseUser) {
        console.log('✅ 找到 Supabase 用户:', supabaseUser.email);
        
        // 添加超时保护
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('数据库查询超时')), 10000);
        });
        
        try {
          // Get user data from our users table with timeout protection
          const queryPromise = supabase
            .from('users')
            .select('*')
            .eq('email', supabaseUser.email)
            .single();
          
          const { data: userData, error: userError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]) as any;

          if (userError && userError.code !== 'PGRST116') {
            console.error('❌ Error fetching user data:', userError);
            
            // 如果是权限错误，尝试创建用户
            if (userError.message?.includes('permission') || userError.code === '42501') {
              console.log('🔧 权限错误，尝试直接创建用户...');
              await createUserDirectly(supabaseUser);
              return;
            }
            
            setUser(null);
            return;
          }

          if (userData) {
            console.log('✅ 找到用户数据:', userData.name);
            setUser({
              id: userData.id.toString(),
              name: userData.name,
              email: userData.email,
              avatar: userData.avatar_url || '',
              createdAt: userData.created_at,
              updatedAt: userData.updated_at
            });
          } else {
            console.log('📝 用户数据不存在，创建新用户记录...');
            await createUserDirectly(supabaseUser);
          }
        } catch (dbError: any) {
          console.error('❌ 数据库操作失败:', dbError);
          
          if (dbError.message === '数据库查询超时') {
            console.log('⏰ 查询超时，使用基本用户信息');
            // 使用 Supabase 用户信息创建基本用户对象
            setUser({
              id: supabaseUser.id,
              name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
              email: supabaseUser.email || '',
              avatar: supabaseUser.user_metadata?.avatar_url || '',
              createdAt: supabaseUser.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } else {
            // 其他错误，也使用基本信息
            console.log('🔄 使用 Supabase 用户基本信息');
            setUser({
              id: supabaseUser.id,
              name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
              email: supabaseUser.email || '',
              avatar: supabaseUser.user_metadata?.avatar_url || '',
              createdAt: supabaseUser.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      } else {
        console.log('ℹ️ 未找到用户会话');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Failed to refresh user:', error);
      setUser(null);
    }
  };

  const createUserDirectly = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('📝 创建新用户记录...');
      
      const newUserData = {
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        avatar_url: supabaseUser.user_metadata?.avatar_url || null
      };
      
      console.log('📋 用户数据:', newUserData);
      
      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('创建用户超时')), 8000);
      });
      
      const insertPromise = supabase
        .from('users')
        .insert(newUserData)
        .select()
        .single();
      
      const { data: newUser, error: createError } = await Promise.race([
        insertPromise,
        timeoutPromise
      ]) as any;

      if (createError) {
        console.error('❌ Error creating user:', createError);
        
        // 如果创建失败，使用基本用户信息
        console.log('🔄 创建失败，使用基本用户信息');
        setUser({
          id: supabaseUser.id,
          name: newUserData.name,
          email: newUserData.email,
          avatar: newUserData.avatar_url || '',
          createdAt: supabaseUser.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return;
      }

      if (newUser) {
        console.log('✅ 新用户创建成功:', newUser.name);
        setUser({
          id: newUser.id.toString(),
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar_url || '',
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at
        });
      }
    } catch (error: any) {
      console.error('❌ 创建用户失败:', error);
      
      // 即使创建失败，也设置基本用户信息
      console.log('🔄 使用 Supabase 基本信息作为后备');
      setUser({
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        avatar: supabaseUser.user_metadata?.avatar_url || '',
        createdAt: supabaseUser.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
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
        
        // 翻译常见错误信息
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
        
        // 翻译常见错误信息
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
        setUser(null);
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
    // 防止重复初始化
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
          return;
        }
        
        // 检查 Supabase 客户端
        if (!supabase || typeof supabase.auth?.getSession !== 'function') {
          console.error('❌ Supabase 客户端未正确配置');
          setLoading(false);
          setInitialized(true);
          return;
        }
        
        console.log('✅ Supabase 客户端检查通过');
        
        // 尝试获取会话，但不设置严格超时
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ 会话获取错误:', error);
            // 即使有错误也继续，不阻止应用加载
          } else if (session) {
            console.log('✅ 找到现有会话，用户:', session.user?.email);
            await refreshUser();
          } else {
            console.log('ℹ️ 未找到现有会话');
          }
        } catch (sessionError) {
          console.warn('⚠️ 获取会话时出错，但继续加载应用:', sessionError);
          // 不抛出错误，让应用继续加载
        }
        
      } catch (error) {
        console.error('❌ 认证初始化错误:', error);
        // 不阻止应用加载，即使认证初始化失败
      } finally {
        console.log('🏁 认证初始化完成，设置 loading = false');
        setLoading(false);
        setInitialized(true);
      }
    };

    // 立即开始初始化
    initAuth();

    // 监听认证状态变化
    console.log('👂 设置认证状态监听器...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 认证状态变化:', event, session?.user?.email || 'no user');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ 用户已登录，刷新用户数据');
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 用户已登出');
        setUser(null);
      }
    });

    return () => {
      console.log('🧹 清理认证监听器');
      subscription.unsubscribe();
    };
  }, [initialized]); // 依赖 initialized 防止重复执行

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