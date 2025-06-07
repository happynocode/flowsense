import { supabase } from '../lib/supabase';
import { User, ContentSource, Digest, Subscription, SubscriptionPlan, ApiResponse, PaginatedResponse } from '../types';

// Auth API
export const authApi = {
  signUp: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },
  
  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (!supabaseUser) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error || !userData) return null;

      return {
        id: userData.id.toString(),
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar_url || '',
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) throw error;
  }
};

// Sources API
export const sourcesApi = {
  getSources: async (): Promise<ContentSource[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔍 获取 sources，当前用户 ID:', user.id);

    const { data, error } = await supabase
      .from('content_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 获取 sources 失败:', error);
      throw error;
    }

    console.log('✅ 成功获取 sources:', data?.length || 0, '条记录');
    console.log('📊 Sources 详情:', data);

    return (data || []).map(source => ({
      id: source.id.toString(),
      name: source.name,
      url: source.url,
      type: source.source_type as 'podcast' | 'blog' | 'news',
      description: source.description || '',
      isActive: source.is_active,
      lastScraped: source.last_scraped_at || undefined,
      createdAt: source.created_at
    }));
  },
  
  createSource: async (source: Omit<ContentSource, 'id' | 'createdAt' | 'lastScraped'>): Promise<ContentSource> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('📝 创建新 source，用户 ID:', user.id);
    console.log('📝 Source 数据:', source);

    const { data, error } = await supabase
      .from('content_sources')
      .insert({
        user_id: user.id,
        name: source.name,
        url: source.url,
        source_type: source.type,
        description: source.description || null,
        is_active: source.isActive
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 创建 source 失败:', error);
      throw error;
    }

    console.log('✅ 成功创建 source:', data);

    return {
      id: data.id.toString(),
      name: data.name,
      url: data.url,
      type: data.source_type as 'podcast' | 'blog' | 'news',
      description: data.description || '',
      isActive: data.is_active,
      lastScraped: data.last_scraped_at || undefined,
      createdAt: data.created_at
    };
  },
  
  updateSource: async (id: string, source: Partial<ContentSource>): Promise<ContentSource> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔄 更新 source，ID:', id, '用户 ID:', user.id);
    
    const updateData: any = {};
    
    if (source.name !== undefined) updateData.name = source.name;
    if (source.url !== undefined) updateData.url = source.url;
    if (source.type !== undefined) updateData.source_type = source.type;
    if (source.description !== undefined) updateData.description = source.description;
    if (source.isActive !== undefined) updateData.is_active = source.isActive;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('content_sources')
      .update(updateData)
      .eq('id', parseInt(id))
      .eq('user_id', user.id) // 确保只能更新自己的 source
      .select()
      .single();

    if (error) {
      console.error('❌ 更新 source 失败:', error);
      throw error;
    }

    console.log('✅ 成功更新 source:', data);

    return {
      id: data.id.toString(),
      name: data.name,
      url: data.url,
      type: data.source_type as 'podcast' | 'blog' | 'news',
      description: data.description || '',
      isActive: data.is_active,
      lastScraped: data.last_scraped_at || undefined,
      createdAt: data.created_at
    };
  },
  
  deleteSource: async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🗑️ 删除 source，ID:', id, '用户 ID:', user.id);

    const { error } = await supabase
      .from('content_sources')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', user.id); // 确保只能删除自己的 source

    if (error) {
      console.error('❌ 删除 source 失败:', error);
      throw error;
    }

    console.log('✅ 成功删除 source');
  },
  
  validateSource: async (url: string): Promise<{ valid: boolean; message: string }> => {
    // Simple URL validation for now
    try {
      new URL(url);
      return { valid: true, message: 'Valid URL' };
    } catch {
      return { valid: false, message: 'Invalid URL format' };
    }
  }
};

// Digests API
export const digestsApi = {
  getDigests: async (page = 1, limit = 10): Promise<PaginatedResponse<Digest[]>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('digests')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('generation_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const digests: Digest[] = (data || []).map(digest => ({
      id: digest.id.toString(),
      title: digest.title,
      date: digest.generation_date,
      summaries: [], // Will be populated when needed
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
  
  getDigest: async (id: string): Promise<Digest> => {
    const { data, error } = await supabase
      .from('digests')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error) throw error;

    // For now, return mock summaries since we don't have the full content pipeline
    return {
      id: data.id.toString(),
      title: data.title,
      date: data.generation_date,
      summaries: [
        {
          id: '1',
          title: 'Sample Summary',
          content: 'This is a sample summary content.',
          sourceUrl: 'https://example.com',
          sourceName: 'Example Source',
          publishedAt: new Date().toISOString(),
          readingTime: 3
        }
      ],
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

export default { authApi, sourcesApi, digestsApi, subscriptionApi };