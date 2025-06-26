import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useToast } from './use-toast';
import { supabase } from '../lib/supabase';
import { userApi } from '../services/api';
import { navigateTo } from '../utils/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAutoDigestSettings: (settings: {
    autoDigestEnabled: boolean;
    autoDigestTime: string;
    autoDigestTimezone: string;
  }) => Promise<void>;
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
      
      // 先设置基础用户数据
      const baseUserData = {
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        avatar: supabaseUser.user_metadata?.avatar_url || '',
        createdAt: supabaseUser.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('🎯 设置基础用户数据（来自 session）:', baseUserData);
      setUser(baseUserData);
      console.log('✅ setUser 调用完成');
      
      // 后台获取订阅信息和auto digest设置
      try {
        console.log('🔄 获取用户完整信息（订阅 + auto digest）...');
        
        // 并行获取订阅信息和auto digest设置
        const [subscriptionInfo, autoDigestSettings] = await Promise.all([
          userApi.getUserSubscriptionInfo(),
          userApi.getAutoDigestSettings().catch(err => {
            console.warn('⚠️ 获取auto digest设置失败，使用默认值:', err);
            return {
              autoDigestEnabled: false,
              autoDigestTime: '09:00:00',
              autoDigestTimezone: 'UTC',
              lastAutoDigestRun: undefined
            };
          })
        ]);
        
        console.log('🔍 [DEBUG] 获取到的订阅信息:', subscriptionInfo);
        console.log('🔍 [DEBUG] 获取到的auto digest设置:', autoDigestSettings);
        console.log('🔍 [DEBUG] autoDigestSettings详细信息:');
        console.log('  - autoDigestEnabled:', autoDigestSettings.autoDigestEnabled, typeof autoDigestSettings.autoDigestEnabled);
        console.log('  - autoDigestTime:', autoDigestSettings.autoDigestTime, typeof autoDigestSettings.autoDigestTime);
        console.log('  - autoDigestTimezone:', autoDigestSettings.autoDigestTimezone, typeof autoDigestSettings.autoDigestTimezone);
        
        const userWithFullInfo = {
          ...baseUserData,
          // 订阅信息
          maxSources: subscriptionInfo.maxSources,
          canScheduleDigest: subscriptionInfo.canScheduleDigest,
          canProcessWeekly: subscriptionInfo.canProcessWeekly,
          subscriptionTier: subscriptionInfo.subscriptionTier,
          // Auto digest设置
          autoDigestEnabled: autoDigestSettings.autoDigestEnabled,
          autoDigestTime: autoDigestSettings.autoDigestTime ? autoDigestSettings.autoDigestTime.substring(0, 5) : '09:00',
          autoDigestTimezone: autoDigestSettings.autoDigestTimezone,
          lastAutoDigestRun: autoDigestSettings.lastAutoDigestRun
        };
        
        console.log('🔍 [DEBUG] 最终用户对象:', userWithFullInfo);
        console.log('🔍 [DEBUG] 最终用户对象的auto digest字段:');
        console.log('  - autoDigestEnabled:', userWithFullInfo.autoDigestEnabled, typeof userWithFullInfo.autoDigestEnabled);
        console.log('  - autoDigestTime:', userWithFullInfo.autoDigestTime, typeof userWithFullInfo.autoDigestTime);
        console.log('  - autoDigestTimezone:', userWithFullInfo.autoDigestTimezone, typeof userWithFullInfo.autoDigestTimezone);
        
        console.log('🔄 更新用户数据（包含订阅信息 + auto digest）:', userWithFullInfo);
        setUser(userWithFullInfo);
        
        // 🔍 验证setUser是否成功
        setTimeout(() => {
          console.log('🔍 [DEBUG] setUser调用后验证 - 这将在下次渲染时显示实际的用户状态');
        }, 100);
      } catch (subscriptionError) {
        console.warn('⚠️ 获取用户信息失败，使用默认值:', subscriptionError);
        // 使用默认的免费用户限制和auto digest设置
        const userWithDefaults = {
          ...baseUserData,
          maxSources: 3,
          canScheduleDigest: false,
          canProcessWeekly: false,
          subscriptionTier: 'free' as const,
          autoDigestEnabled: false,
          autoDigestTime: '09:00',
          autoDigestTimezone: 'UTC',
          lastAutoDigestRun: undefined
        };
        setUser(userWithDefaults);
      }
      
      // 🔧 立即同步到数据库（这对RLS策略很重要）
      try {
        await syncUserToDatabase(supabaseUser);
        console.log('✅ 用户数据库同步完成');
      } catch (syncError) {
        console.error('❌ 用户数据库同步失败，这可能导致后续API调用失败:', syncError);
        // 不阻塞用户体验，但记录错误
      }

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

  // 指数退避重试函数
  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 3, baseDelay: number = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        return result;
      } catch (error: any) {
        console.log(`🔄 [重试] 第 ${i + 1} 次尝试失败:`, error.message);
        
        // 如果是最后一次重试，直接抛出错误
        if (i === maxRetries - 1) {
          console.error(`❌ [重试] 达到最大重试次数 (${maxRetries})，停止重试`);
          throw error;
        }
        
        // 检查是否是可重试的错误类型
        const isRetryableError = 
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch') ||
          error.code === 'NETWORK_ERROR' ||
          error.status === 408 || // Request Timeout
          error.status === 429 || // Too Many Requests
          error.status === 502 || // Bad Gateway
          error.status === 503 || // Service Unavailable
          error.status === 504;   // Gateway Timeout
        
        if (!isRetryableError) {
          console.log(`⚠️ [重试] 检测到不可重试错误，停止重试:`, error.code || error.status);
          throw error;
        }
        
        // 计算延迟时间（指数退避 + 随机抖动）
        const delay = Math.min(baseDelay * Math.pow(2, i), 8000) + Math.random() * 1000;
        console.log(`⏳ [重试] ${delay.toFixed(0)}ms 后进行第 ${i + 2} 次重试...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const syncUserToDatabase = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('🔄 后台同步用户到数据库...');
      console.log('🔍 [诊断] Supabase用户数据:', {
        id: supabaseUser.id,
        email: supabaseUser.email,
        created_at: supabaseUser.created_at,
        user_metadata: supabaseUser.user_metadata
      });
      
      // 检查数据库操作是否可用
      if (!supabase.from) {
        console.warn('⚠️ 数据库操作不可用，跳过同步');
        return;
      }
      
      // 准备基础用户数据（用于更新）
      const baseUserData = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name || 
              supabaseUser.email?.split('@')[0] || 'User',
        avatar_url: supabaseUser.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString()
      };
      
      // 准备新用户插入数据（包含auto digest默认值）
      const newUserData = {
        ...baseUserData,
        // 🔧 只在新用户创建时设置auto digest默认值
        auto_digest_enabled: false,
        auto_digest_time: '09:00:00',
        auto_digest_timezone: 'UTC',
        last_auto_digest_run: null
      };
      
      console.log('🔍 [诊断] 准备基础用户数据:', baseUserData);
      console.log('🔍 [诊断] 准备新用户数据:', newUserData);
      console.log('🔍 [诊断] 使用的Supabase客户端库版本: @supabase/supabase-js ^2.50.0');
      
      // 使用重试机制执行数据库同步
      const result = await retryWithBackoff(async () => {
        console.log('🔍 [诊断] 开始执行数据库同步操作...');
        console.log('🔍 [诊断] 场景：可能是database reset后的重新登录');
        
        // 首先检查用户是否已存在于public.users表中
        let existingUser = null;
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', baseUserData.id)
            .maybeSingle(); // 使用maybeSingle()避免"no rows"错误
          
          if (!error) {
            existingUser = data;
          }
          console.log('🔍 [诊断] 按ID查询现有用户结果:', existingUser);
        } catch (idError) {
          console.log('🔍 [诊断] 按ID查询失败，尝试按email查询:', idError);
        }
        
        // 如果按ID没找到，再尝试按email查询（处理potential email冲突）
        if (!existingUser) {
          try {
            const { data, error } = await supabase
              .from('users')
                          .select('id, email')
            .eq('email', baseUserData.email)
            .maybeSingle();
            
            if (!error && data) {
              existingUser = data;
              console.log('🔍 [诊断] 按email查询找到现有用户:', existingUser);
              console.log('⚠️ [诊断] 检测到ID不匹配但email相同的情况 - 可能是database reset后的残留数据');
            }
          } catch (emailError) {
            console.log('🔍 [诊断] 按email查询也失败:', emailError);
          }
        }
        
        let result;
        if (existingUser) {
          if (existingUser.id === baseUserData.id) {
            // 正常情况：用户已存在，执行更新
            console.log('🔄 [诊断] 用户已存在，执行更新操作');
            console.log('🔧 [修复] 不覆盖auto digest设置，保留用户的真实设置');
            const { data, error } = await supabase
              .from('users')
              .update({
                name: baseUserData.name,
                avatar_url: baseUserData.avatar_url,
                updated_at: baseUserData.updated_at
                // 🔧 移除auto digest字段，不覆盖用户已保存的设置
              })
              .eq('id', baseUserData.id)
              .select()
              .single();
            
            result = { data, error };
          } else {
            // 特殊情况：email相同但ID不同（database reset残留）
            console.log('🔧 [诊断] 检测到database reset后的残留数据，先删除旧记录');
            await supabase
              .from('users')
              .delete()
              .eq('email', baseUserData.email);
            
            console.log('➕ [诊断] 删除残留数据后，插入新用户记录');
            const { data, error } = await supabase
              .from('users')
              .insert(newUserData)
              .select()
              .single();
            
            result = { data, error };
          }
        } else {
          // 用户不存在，执行插入操作
          console.log('➕ [诊断] 用户不存在，执行插入操作');
          const { data, error } = await supabase
            .from('users')
            .insert(newUserData)
          .select()
          .single();
          
          result = { data, error };
        }
        
        const { data, error } = result;
        
        if (error) {
          console.error('❌ 用户数据库同步失败:', error);
          console.error('🔍 [诊断] 错误详情:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // 针对database reset后重新注册的特殊错误处理
          if (error.code === '23505' && error.message.includes('users_email_key')) {
            console.log('🔧 [诊断] 检测到email唯一约束冲突 - 尝试清理残留数据');
            try {
              // 删除可能的残留记录
              await supabase
                .from('users')
                .delete()
                .eq('email', baseUserData.email);
              
              console.log('🔄 [诊断] 清理完成，重新尝试插入');
              const { data: retryData, error: retryError } = await supabase
                .from('users')
                .insert(newUserData)
                .select()
                .single();
              
              if (!retryError) {
                console.log('✅ [诊断] 清理后重新插入成功');
                return retryData;
              }
            } catch (cleanupError) {
              console.error('❌ [诊断] 清理残留数据失败:', cleanupError);
            }
          }
          
          // 详细分析其他错误类型
          if (error.code === '42501') {
            console.error('🔍 [诊断] 检测到权限不足错误 (42501) - 可能是RLS策略问题');
          } else if (error.message.includes('conflict')) {
            console.error('🔍 [诊断] 检测到其他冲突相关错误');
          }
          
          throw error;
        }
        
        console.log('✅ 用户数据库同步成功:', data);
        console.log('🔍 [诊断] 成功返回的数据:', data);
        return data;
      }, 3, 1000);
      
    } catch (error) {
      console.warn('⚠️ 数据库同步异常（不影响用户体验）:', error);
      console.error('🔍 [诊断] 最外层catch捕获的错误:', error);
      // 重新抛出错误，因为这可能导致后续API调用失败
      throw error;
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
          errorMessage = 'This email is already registered. Please try logging in or use a different email.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Invalid email format. Please check and try again.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
        
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }

      console.log('✅ 注册成功:', data);
      
      if (data.user && !data.session) {
        toast({
          title: "Registration Successful",
          description: "Please check your email and click the confirmation link to activate your account.",
        });
      } else if (data.session) {
        // If there's a session directly after registration, email confirmation is disabled and user is logged in
        console.log('✅ Registration and login successful');
        toast({
          title: "Registration Successful",
          description: "Welcome to FlowSense!",
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
          description: "欢迎回到 FlowSense！",
        });
        
        // 🔧 登录成功后，调用refreshUser获取完整用户信息（包括auto digest设置）
        console.log('🔄 登录成功，获取完整用户信息...');
        try {
          await refreshUser();
          console.log('✅ 登录后用户信息获取完成');
        } catch (refreshError) {
          console.warn('⚠️ 登录后获取用户信息失败，设置基础用户数据:', refreshError);
          // 如果refreshUser失败，至少设置基础用户数据
          const authUserData = {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || '',
            avatar: data.user.user_metadata?.avatar_url || '',
            createdAt: data.user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUser(authUserData);
        }
        
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
          title: "Logout Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ 登出成功');
        // 清理 localStorage
        localStorage.removeItem('sb-auth-token');
        toast({
          title: "Successfully Logged Out",
          description: "You have been safely logged out.",
        });
        
        // 跳转到landing page (GitHub Pages 兼容)
        // 使用最直接的方法：检查当前URL并构建正确的跳转路径
        const currentUrl = window.location.href;
        console.log('🔍 Current URL:', currentUrl);
        
        if (currentUrl.includes('happynocode.github.io/digest-flow-daily')) {
          const targetUrl = 'https://happynocode.github.io/digest-flow-daily/';
          console.log('✅ GitHub Pages detected, redirecting to:', targetUrl);
          window.location.href = targetUrl;
        } else if (currentUrl.includes('github.io')) {
          // 通用GitHub Pages处理
          const targetUrl = window.location.origin + '/digest-flow-daily/';
          console.log('✅ Generic GitHub Pages, redirecting to:', targetUrl);
          window.location.href = targetUrl;
        } else {
          console.log('✅ Not GitHub Pages, redirecting to root');
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 🔧 更新auto digest设置并同步到用户状态
  const updateAutoDigestSettings = async (settings: {
    autoDigestEnabled: boolean;
    autoDigestTime: string;
    autoDigestTimezone: string;
  }) => {
    if (!user) throw new Error('User not authenticated');
    
    console.log('💾 更新auto digest设置:', settings);
    
    try {
      // 调用API更新数据库
      await userApi.updateAutoDigestSettings({
        autoDigestEnabled: settings.autoDigestEnabled,
        autoDigestTime: settings.autoDigestTime + ':00', // 添加秒数
        autoDigestTimezone: settings.autoDigestTimezone
      });
      
      // 立即更新本地用户状态
      const updatedUser = {
        ...user,
        autoDigestEnabled: settings.autoDigestEnabled,
        autoDigestTime: settings.autoDigestTime,
        autoDigestTimezone: settings.autoDigestTimezone
      };
      
      console.log('✅ 本地用户状态已更新:', updatedUser);
      setUser(updatedUser);
      
    } catch (error) {
      console.error('❌ 更新auto digest设置失败:', error);
      throw error;
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
        console.log('✅ 用户已登录，获取完整用户信息');
        try {
          // 🔧 调用refreshUser获取完整用户信息（包括auto digest设置）
          await refreshUser();
          console.log('✅ 认证状态变化后用户信息获取完成');
        } catch (refreshError) {
          console.warn('⚠️ 认证状态变化后获取用户信息失败，设置基础用户数据:', refreshError);
          // 如果refreshUser失败，至少设置基础用户数据
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
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 用户已登出');
        setUser(null);
        setLoading(false);
        localStorage.removeItem('sb-auth-token');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 Token 已刷新，获取完整用户数据');
        try {
          // 🔧 Token刷新时也获取完整用户信息
          await refreshUser();
          console.log('✅ Token刷新后用户信息获取完成');
        } catch (refreshError) {
          console.warn('⚠️ Token刷新后获取用户信息失败:', refreshError);
          // 如果失败，保持当前用户状态不变
        }
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
    updateAutoDigestSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};