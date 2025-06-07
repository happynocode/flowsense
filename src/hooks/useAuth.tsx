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
  const { toast } = useToast();

  const refreshUser = async () => {
    try {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth error:', error);
        setUser(null);
        return;
      }
      
      if (supabaseUser) {
        // Get user data from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', supabaseUser.email)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user data:', userError);
          setUser(null);
          return;
        }

        if (userData) {
          setUser({
            id: userData.id.toString(),
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar_url || '',
            createdAt: userData.created_at,
            updatedAt: userData.updated_at
          });
        } else {
          // Create user record if it doesn't exist
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              email: supabaseUser.email || '',
              name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
              avatar_url: supabaseUser.user_metadata?.avatar_url || null
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating user:', createError);
            setUser(null);
            return;
          }

          if (newUser) {
            setUser({
              id: newUser.id.toString(),
              name: newUser.name,
              email: newUser.email,
              avatar: newUser.avatar_url || '',
              createdAt: newUser.created_at,
              updatedAt: newUser.updated_at
            });
          }
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
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

      if (data.user && !data.session) {
        toast({
          title: "注册成功",
          description: "请检查您的邮箱并点击确认链接来激活账户。",
        });
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
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

      if (data.user) {
        toast({
          title: "登录成功",
          description: "欢迎回到 Neural Hub！",
        });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "登出失败",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUser(null);
        toast({
          title: "已成功登出",
          description: "您已安全退出账户。",
        });
      }
    } catch (error) {
      toast({
        title: "登出失败",
        description: "退出时发生错误，请重试。",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('开始初始化认证...');
        
        // 检查 Supabase 是否正确配置
        if (!supabase || typeof supabase.auth?.getSession !== 'function') {
          console.error('Supabase 未正确配置');
          setLoading(false);
          return;
        }
        
        // 设置超时以防止无限加载
        const timeoutId = setTimeout(() => {
          console.warn('认证初始化超时 - 设置 loading 为 false');
          setLoading(false);
        }, 3000); // 3秒超时
        
        // 获取初始会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // 清除超时，因为我们得到了响应
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('会话错误:', error);
          // 不抛出错误，只是记录并继续
        }
        
        if (session) {
          console.log('找到现有会话，刷新用户数据');
          await refreshUser();
        } else {
          console.log('未找到会话');
        }
        
        setLoading(false);
        console.log('认证初始化完成');
        
      } catch (error) {
        console.error('认证初始化错误:', error);
        setLoading(false);
      }
    };

    initAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('认证状态变化:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('用户已登录，刷新用户数据');
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        console.log('用户已登出');
        setUser(null);
      }
    });

    return () => {
      console.log('清理认证监听器');
      subscription.unsubscribe();
    };
  }, []);

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