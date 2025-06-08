import { createClient } from '@supabase/supabase-js';
import type { 
  ContentSource, 
  PaginatedResponse, 
  Digest, 
  Subscription, 
  SubscriptionPlan 
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  getSources: async (page = 1, limit = 10): Promise<PaginatedResponse<ContentSource[]>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('content_sources')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

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

  addSource: async (source: Omit<ContentSource, 'id' | 'lastScraped' | 'createdAt'>): Promise<ContentSource> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('content_sources')
      .insert({
        user_id: user.id,
        name: source.name,
        url: source.url,
        description: source.description,
        is_active: source.isActive
      })
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
    const { error } = await supabase
      .from('content_sources')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;
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

  validateSource: async (url: string): Promise<{ valid: boolean; message: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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

  // 🚀 全局处理所有sources的功能 (使用 Edge Function)
  processAllSources: async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log('🚀 开始全局处理所有sources (通过 Edge Function)...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('📡 调用 process-all-sources Edge Function...');

      const { data, error } = await supabase.functions.invoke('process-all-sources', {
        body: {}
      });

      if (error) {
        console.error('❌ Edge Function 调用失败:', error);
        throw error;
      }

      console.log('✅ Edge Function 响应:', data);

      return {
        success: data.success,
        data: data.data,
        error: data.error
      };

    } catch (error) {
      console.error('❌ processAllSources 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // 🗑️ 清除已抓取内容的功能（使用 Edge Function）
  clearScrapedContent: async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
  
  getDigest: async (id: string): Promise<Digest> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
  clearAllDigests: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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