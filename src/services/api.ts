import { supabase } from '../lib/supabase';
import type { 
  ContentSource, 
  PaginatedResponse, 
  Digest, 
  Subscription, 
  SubscriptionPlan 
} from '../types';

export const authApi = {
  signUp: async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
    });
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  signOut: async () => {
    return await supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    return await supabase.auth.getUser();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export const sourcesApi = {
  getSources: async (page = 1, limit = 1000, userId?: string): Promise<PaginatedResponse<ContentSource[]>> => {
    let user;
    
    // 如果传入了 userId，直接使用；否则尝试获取当前用户
    if (userId) {
      user = { id: userId };
      console.log('🔍 Using provided userId:', userId);
    } else {
      // 🔧 增强认证检查 - 获取用户和session
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      console.log('🔍 getSources 认证检查:', { 
        hasUser: !!authUser, 
        userId: authUser?.id,
        authError: authError?.message 
      });
      
      if (authError) {
        console.error('❌ Auth error in getSources:', authError);
        throw new Error('Authentication error: ' + authError.message);
      }
      
      if (!authUser) {
        console.error('❌ No user found in getSources');
        throw new Error('Not authenticated');
      }
      
      user = authUser;
    }

    const offset = (page - 1) * limit;

    console.log('📡 Fetching sources for user:', user.id);
    
    // 🔧 Debug: Log auth headers and session
    const session = await supabase.auth.getSession();
    console.log('🔍 Auth session debug:', {
      hasSession: !!session.data.session,
      sessionUserId: session.data.session?.user?.id,
      sessionError: session.error?.message
    });

    const { data, error, count } = await supabase
      .from('content_sources')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Database error in getSources:', error);
      throw error;
    }

    console.log('✅ Sources fetched successfully:', { count, dataLength: data?.length });

    const sources: ContentSource[] = (data || []).map(source => ({
      id: source.id.toString(),
      name: source.name,
      url: source.url,
      type: 'blog' as const, // Default type, since we removed type from database
      description: source.description || '',
      isActive: source.is_active,
      lastScraped: source.last_scraped_at,
      createdAt: source.created_at
    }));

    return {
      data: sources,
      success: true,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  },

  addSource: async (source: Omit<ContentSource, 'id' | 'lastScraped' | 'createdAt'>, userId?: string): Promise<ContentSource> => {
    console.log('➕ Preparing to add source. Provided userId:', userId);

    // 1. Get the most current session and user from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error during addSource:', sessionError);
      throw new Error('Could not get current session: ' + sessionError.message);
    }

    if (!session) {
      console.error('❌ No active session found during addSource.');
      throw new Error('Not authenticated. No session found.');
    }

    const authUser = session.user;
    console.log('🔍 Current authenticated user from session:', { 
      id: authUser.id, 
      email: authUser.email 
    });

    // 2. Determine the final user ID to use for the insert
    const finalUserId = userId || authUser.id;
    if (finalUserId !== authUser.id) {
        console.warn(`Mismatch warning: provided userId (${userId}) is different from session userId (${authUser.id}). Using session userId.`);
    }
    const userIdForInsert = authUser.id;

    console.log(`📡 Inserting source for user ID: ${userIdForInsert}`);
    
    // 3. Perform the insert operation
    const { data, error } = await supabase
      .from('content_sources')
      .insert({
        user_id: userIdForInsert, // Always use the ID from the active session
        name: source.name,
        url: source.url,
        description: source.description,
        is_active: source.isActive,
        has_rss: source.hasRss || false,
        rss_url: source.rssUrl || null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error in addSource:', error);
      throw error;
    }
    
    console.log('✅ Source added successfully to database:', data);

    return {
      id: data.id.toString(),
      name: data.name,
      url: data.url,
      type: 'blog' as const,
      description: data.description || '',
      isActive: data.is_active,
      lastScraped: data.last_scraped_at,
      createdAt: data.created_at
    };
  },

  updateSource: async (id: string, updates: Partial<Omit<ContentSource, 'id' | 'createdAt'>>): Promise<ContentSource> => {
    const { data, error } = await supabase
      .from('content_sources')
      .update({
        name: updates.name,
        url: updates.url,
        description: updates.description,
        is_active: updates.isActive,
        last_scraped_at: updates.lastScraped
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id.toString(),
      name: data.name,
      url: data.url,
      type: 'blog' as const,
      description: data.description || '',
      isActive: data.is_active,
      lastScraped: data.last_scraped_at,
      createdAt: data.created_at
    };
  },

  deleteSource: async (id: string): Promise<void> => {
    // 获取当前认证用户
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`🗑️ Deleting source ${id} for user ${user.id}`);

    // 删除时同时验证用户权限
    const { error } = await supabase
      .from('content_sources')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', user.id); // 确保只能删除自己的source

    if (error) {
      console.error('❌ Delete source error:', error);
      throw error;
    }

    console.log(`✅ Successfully deleted source ${id}`);
  },

  toggleSource: async (id: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
      .from('content_sources')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(id));

    if (error) throw error;
  },

  validateSource: async (url: string, userId?: string): Promise<{ valid: boolean; message: string }> => {
    try {
      let user;
      
      if (userId) {
        user = { id: userId };
        console.log('🔍 Using provided userId for validation:', userId);
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');
        user = authUser;
      }

      console.log('🔍 Validating source URL via Edge Function:', url);

      const { data, error } = await supabase.functions.invoke('validate-source', {
        body: { url }
      });

      if (error) {
        console.error('❌ Source validation failed:', error);
        throw error;
      }

      console.log('✅ Source validation result:', data);
      return {
        valid: data.valid,
        message: data.message
      };

    } catch (error) {
      console.error('❌ Source validation error:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  },

  // 🚀 启动异步处理任务 (新的异步架构) - 支持时间范围
  startProcessingTask: async (userId?: string, timeRange: 'today' | 'week' = 'week'): Promise<{ success: boolean; task_id?: string; message?: string; error?: string }> => {
    try {
      console.log('🚀 启动异步处理任务...', { timeRange });
      
      let user;
      if (userId) {
        user = { id: userId };
        console.log('🔍 Using provided userId for startProcessingTask:', userId);
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');
        user = authUser;
      }

      console.log('📡 调用 start-processing Edge Function...');

      const { data, error } = await supabase.functions.invoke('start-processing', {
        body: { time_range: timeRange }
      });

      if (error) {
        console.error('❌ Edge Function 调用失败:', error);
        throw error;
      }

      console.log('✅ 任务启动成功:', data);

      return {
        success: data.success,
        task_id: data.task_id,
        message: data.message,
        error: data.error
      };

    } catch (error) {
      console.error('❌ startProcessingTask 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // 📊 查询任务状态
  getTaskStatus: async (taskId: string, userId?: string): Promise<{ success: boolean; task?: any; error?: string }> => {
    try {
      let user;
      if (userId) {
        user = { id: userId };
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');
        user = authUser;
      }

      const { data, error } = await supabase
        .from('processing_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        task: data
      };

    } catch (error) {
      console.error('❌ getTaskStatus 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },



  // 🗑️ 清除已抓取内容的功能（使用 Edge Function）
  clearScrapedContent: async (userId?: string): Promise<void> => {
    try {
      let user;
      if (userId) {
        user = { id: userId };
        console.log('🔍 Using provided userId for clearScrapedContent:', userId);
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');
        user = authUser;
      }

      console.log('🗑️ 开始清除已抓取的内容 (通过 Edge Function)...');

      const { data, error } = await supabase.functions.invoke('clear-content', {
        body: {}
      });

      if (error) {
        console.error('❌ Edge Function 调用失败:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Clear content failed');
      }

      console.log('✅ 成功清除已抓取的内容:', data.message);

    } catch (error) {
      console.error('❌ 清除内容失败:', error);
      throw error;
    }
  },

  // 🔄 手动触发执行任务
  triggerTaskExecution: async (taskId: string, userId?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔄 Manually triggering task execution for task ID:', taskId);
      
      const { data, error } = await supabase.functions.invoke('execute-processing-task', {
        body: { task_id: parseInt(taskId) }
      });

      if (error) {
        console.error('❌ Failed to trigger task execution:', error);
        throw error;
      }

      console.log('✅ Task execution triggered successfully:', data);
      return { success: true };

    } catch (error) {
      console.error('❌ triggerTaskExecution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

// Digests API
export const digestsApi = {
  getDigests: async (page = 1, limit = 10, userId?: string): Promise<PaginatedResponse<Digest[]>> => {
    let user;
    
    if (userId) {
      user = { id: userId };
      console.log('🔍 Using provided userId for getDigests:', userId);
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      user = authUser;
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('digests')
      .select(`
        *,
        digest_items(
          order_position,
          summaries(
            id,
            summary_text,
            reading_time,
            content_items(
              title,
              content_url,
              published_date,
              content_sources(
                name
              )
            )
          )
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('generation_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const digests: Digest[] = (data || []).map(digest => ({
      id: digest.id.toString(),
      title: digest.title,
      date: digest.generation_date,
      summaries: digest.digest_items
        .sort((a: any, b: any) => a.order_position - b.order_position)
        .map((item: any) => ({
          id: item.summaries.id.toString(),
          title: item.summaries.content_items.title,
          content: item.summaries.summary_text,
          sourceUrl: item.summaries.content_items.content_url,
          sourceName: item.summaries.content_items.content_sources.name,
          publishedAt: item.summaries.content_items.published_date,
          readingTime: item.summaries.reading_time || 3
        })),
      audioUrl: digest.audio_url || undefined,
      duration: digest.audio_duration || undefined,
      isRead: digest.is_read,
      createdAt: digest.created_at
    }));

    return {
      data: digests,
      success: true,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  },
  
  getDigest: async (id: string, userId?: string): Promise<Digest> => {
    let user;
    
    if (userId) {
      user = { id: userId };
      console.log('🔍 Using provided userId for getDigest:', userId);
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      user = authUser;
    }

    const { data, error } = await supabase
      .from('digests')
      .select(`
        *,
        digest_items(
          order_position,
          summaries(
            id,
            summary_text,
            reading_time,
            content_items(
              title,
              content_url,
              published_date,
              content_sources(
                name
              )
            )
          )
        )
      `)
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    return {
      id: data.id.toString(),
      title: data.title,
      date: data.generation_date,
      summaries: data.digest_items
        .sort((a: any, b: any) => a.order_position - b.order_position)
        .map((item: any) => ({
          id: item.summaries.id.toString(),
          title: item.summaries.content_items.title,
          content: item.summaries.summary_text,
          sourceUrl: item.summaries.content_items.content_url,
          sourceName: item.summaries.content_items.content_sources.name,
          publishedAt: item.summaries.content_items.published_date,
          readingTime: item.summaries.reading_time || 3
        })),
      audioUrl: data.audio_url || undefined,
      duration: data.audio_duration || undefined,
      isRead: data.is_read,
      createdAt: data.created_at
    };
  },
  
  markDigestAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('digests')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(id));

    if (error) throw error;
  },

  // 🗑️ 清除digests数据的功能（保留sources）
  clearAllDigests: async (userId?: string): Promise<void> => {
    let user;
    
    if (userId) {
      user = { id: userId };
      console.log('🔍 Using provided userId for clearAllDigests:', userId);
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      user = authUser;
    }

    console.log('🗑️ 开始清除所有digests数据...');

    try {
      // 只删除用户的所有digests（级联删除会自动删除相关的digest_items）
      const { error: digestsError } = await supabase
        .from('digests')
        .delete()
        .eq('user_id', user.id);

      if (digestsError) {
        console.error('❌ 删除digests失败:', digestsError);
        throw digestsError;
      }

      // 删除所有content_items和summaries（但保留content_sources）
      const { data: sources } = await supabase
        .from('content_sources')
        .select('id')
        .eq('user_id', user.id);

      if (sources && sources.length > 0) {
        const sourceIds = sources.map(s => s.id);
        
        // 删除content_items（级联删除会自动删除相关的summaries）
        const { error: itemsError } = await supabase
          .from('content_items')
          .delete()
          .in('source_id', sourceIds);

        if (itemsError) {
          console.error('❌ 删除content_items失败:', itemsError);
          throw itemsError;
        }
      }

      console.log('✅ 成功清除所有digests数据（保留sources）');

    } catch (error) {
      console.error('❌ 清除digests数据失败:', error);
      throw error;
    }
  }
};

// Subscription API
export const subscriptionApi = {
  getSubscription: async (): Promise<Subscription | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id.toString(),
        planId: data.plan_type,
        planName: data.plan_type.charAt(0).toUpperCase() + data.plan_type.slice(1) + ' Plan',
        status: data.status as 'active' | 'canceled' | 'past_due',
        currentPeriodEnd: data.current_period_end || '',
        pricePerMonth: data.amount / 100 // Convert from cents
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  },
  
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    // Return static plans for now
    return [
      {
        id: 'starter',
        name: 'Neural Starter',
        price: 29.99,
        features: [
          'Up to 100 neural sources',
          'Daily AI digest synthesis',
          'Basic quantum analytics',
          'Neural email delivery',
          'Mobile interface access',
          'Standard processing speed'
        ],
        isPopular: false
      },
      {
        id: 'professional',
        name: 'Quantum Professional',
        price: 79.99,
        features: [
          'Unlimited neural sources',
          'Real-time AI processing',
          'Advanced quantum insights',
          'Custom delivery schedules',
          'API neural interface',
          'Priority quantum support',
          'Multi-dimensional analytics',
          'Voice synthesis included'
        ],
        isPopular: true
      },
      {
        id: 'enterprise',
        name: 'Cosmic Enterprise',
        price: 199.99,
        features: [
          'Everything in Professional',
          'Custom AI neural models',
          'White-label quantum solution',
          'Dedicated neural support',
          'On-premise deployment',
          'Advanced security protocols',
          'Team collaboration hub',
          'Predictive trend analysis'
        ],
        isPopular: false
      }
    ];
  },
  
  createSubscription: async (planId: string, paymentMethodId: string): Promise<Subscription> => {
    // This would integrate with Stripe - for now return mock data
    throw new Error('Subscription creation not implemented yet');
  },
  
  cancelSubscription: async (): Promise<void> => {
    // This would integrate with Stripe - for now throw error
    throw new Error('Subscription cancellation not implemented yet');
  }
};

// User Settings API
export const userApi = {
  // Get user subscription information including limits
  getUserSubscriptionInfo: async (): Promise<{
    maxSources: number;
    canScheduleDigest: boolean;
    canProcessWeekly: boolean;
    subscriptionTier: 'free' | 'premium';
  }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔍 Fetching user subscription info for user:', user.id);

    const { data, error } = await supabase
      .from('users')
      .select('max_sources, can_schedule_digest, can_process_weekly, subscription_tier')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Database error in getUserSubscriptionInfo:', error);
      // Return default free limits if columns don't exist or other errors
      return {
        maxSources: 3,
        canScheduleDigest: false,
        canProcessWeekly: false,
        subscriptionTier: 'free'
      };
    }

    console.log('✅ User subscription info fetched:', data);

    return {
      maxSources: data?.max_sources ?? 3,
      canScheduleDigest: data?.can_schedule_digest ?? false,
      canProcessWeekly: data?.can_process_weekly ?? false,
      subscriptionTier: (data?.subscription_tier as 'free' | 'premium') ?? 'free'
    };
  },

  getAutoDigestSettings: async (): Promise<{
    autoDigestEnabled: boolean;
    autoDigestTime: string;
    autoDigestTimezone: string;
    lastAutoDigestRun?: string;
  }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔍 Fetching auto digest settings for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('auto_digest_enabled, auto_digest_time, auto_digest_timezone, last_auto_digest_run')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Database error in getAutoDigestSettings:', error);
        // 如果是字段不存在的错误，返回默认值而不是抛出错误
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('📋 Auto digest columns do not exist, returning defaults');
          return {
            autoDigestEnabled: false,
            autoDigestTime: '09:00:00',
            autoDigestTimezone: 'UTC',
            lastAutoDigestRun: undefined
          };
        }
        throw error;
      }

      console.log('✅ Auto digest settings fetched:', data);

      return {
        autoDigestEnabled: data?.auto_digest_enabled || false,
        autoDigestTime: data?.auto_digest_time || '09:00:00',
        autoDigestTimezone: data?.auto_digest_timezone || 'UTC',
        lastAutoDigestRun: data?.last_auto_digest_run
      };
    } catch (error) {
      console.error('❌ Failed to fetch auto digest settings:', error);
      // 如果任何错误发生，返回默认值
      console.log('📋 Returning default settings due to error');
      return {
        autoDigestEnabled: false,
        autoDigestTime: '09:00:00',
        autoDigestTimezone: 'UTC',
        lastAutoDigestRun: undefined
      };
    }
  },

  updateAutoDigestSettings: async (settings: {
    autoDigestEnabled: boolean;
    autoDigestTime: string;
    autoDigestTimezone?: string;
  }): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('users')
        .update({
          auto_digest_enabled: settings.autoDigestEnabled,
          auto_digest_time: settings.autoDigestTime,
          auto_digest_timezone: settings.autoDigestTimezone || 'UTC',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        // 如果字段不存在，先尝试添加字段
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('📋 Auto digest columns do not exist, settings cannot be saved');
          throw new Error('Auto digest feature is not available. Please contact support.');
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to update auto digest settings:', error);
      throw error;
    }
  },

  // 手动触发自动digest处理 (主要用于测试)
  triggerAutoDigest: async (): Promise<{ success: boolean; task_id?: string; message?: string; error?: string; processorTriggered?: boolean; processorError?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      // 调用后端API启动处理任务
      const result = await sourcesApi.startProcessingTask(user.id, 'today');
      
      if (result.success && result.task_id) {
        console.log('🔄 Task created, now triggering task processor...');
        
        // 立即调用task-processor来处理刚创建的任务
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-processor`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          const processorResult = await response.json();
          console.log('📋 Task processor result:', processorResult);
          
          return {
            ...result,
            processorTriggered: processorResult.success
          };
        } catch (processorError) {
          console.error('❌ Failed to trigger task processor:', processorError);
          return {
            ...result,
            processorTriggered: false,
            processorError: processorError instanceof Error ? processorError.message : 'Unknown error'
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ 手动触发自动digest失败:', error);
      throw error;
    }
  },

  // 🚀 NEW: 直接处理函数 - 用于手动按钮，绕过任务系统
  processDirectly: async (timeRange: 'today' | 'week'): Promise<{ 
    success: boolean; 
    data?: any; 
    error?: string;
    message?: string;
  }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const user = session.user;

    try {
      console.log(`🎯 Triggering direct processing for user ${user.id}, time range: ${timeRange}`);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-processing-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          timeRange: timeRange,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Process directly failed with status ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Directly processing triggered successfully:', result);

      if (result.success) {
        return {
          success: true,
          data: result,
          message: result.message || `Successfully started processing for ${timeRange}.`
        };
      } else {
        return {
          success: false,
          error: result.error || 'Direct processing failed to start.',
          message: result.message || 'Starting process failed.'
        };
      }

    } catch (error) {
      console.error('❌ Directly process initiation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Direct processing initiation failed'
      };
    }
  }
};