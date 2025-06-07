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
  },

  // 新增：测试 Web Scraping 功能
  testScraping: async (sourceId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log('🕷️ 开始测试 Web Scraping，Source ID:', sourceId);
      
      // 获取 source 信息
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: source, error: sourceError } = await supabase
        .from('content_sources')
        .select('*')
        .eq('id', parseInt(sourceId))
        .eq('user_id', user.id)
        .single();

      if (sourceError || !source) {
        throw new Error('Source not found');
      }

      console.log('📄 开始抓取网站内容:', source.url);

      // 使用 CORS 代理来抓取内容
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`;
      
      let response;
      try {
        response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
      } catch (fetchError) {
        console.error('❌ 网络请求失败:', fetchError);
        throw new Error(`Network request failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.contents) {
        throw new Error('Failed to fetch content from proxy service');
      }

      // 解析 HTML 内容
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // 提取标题
      const title = doc.querySelector('title')?.textContent || 
                   doc.querySelector('h1')?.textContent || 
                   'Untitled';

      // 提取主要内容
      let content = '';
      const contentSelectors = [
        'article', '.post', '.entry', '.content',
        '.post-content', '.entry-content', '.article-content',
        'main', '.main-content', '#content'
      ];

      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          content = element.textContent || '';
          break;
        }
      }

      // 如果没找到特定内容区域，使用 body
      if (!content) {
        const body = doc.querySelector('body');
        if (body) {
          // 移除 script 和 style 标签
          const scripts = body.querySelectorAll('script, style');
          scripts.forEach(script => script.remove());
          content = body.textContent || '';
        }
      }

      // 清理内容
      content = content.replace(/\s+/g, ' ').trim();
      
      if (content.length < 100) {
        throw new Error('Content too short or not found');
      }

      // 创建 content_item 记录
      const { data: contentItem, error: itemError } = await supabase
        .from('content_items')
        .insert({
          source_id: parseInt(sourceId),
          title: title.substring(0, 500), // 限制标题长度
          content_url: source.url,
          content_text: content.substring(0, 10000), // 限制内容长度
          published_date: new Date().toISOString(),
          is_processed: false
        })
        .select()
        .single();

      if (itemError) {
        console.error('❌ 创建 content_item 失败:', itemError);
        throw itemError;
      }

      console.log('✅ 成功抓取内容并创建 content_item:', contentItem.id);

      // 调用 AI 总结
      const summaryResult = await testAISummarization(contentItem.id, content);

      // 更新 source 的 last_scraped_at
      await supabase
        .from('content_sources')
        .update({ 
          last_scraped_at: new Date().toISOString(),
          error_count: 0,
          last_error: null
        })
        .eq('id', parseInt(sourceId));

      return {
        success: true,
        data: {
          contentItem,
          summary: summaryResult,
          extractedContent: {
            title,
            contentLength: content.length,
            preview: content.substring(0, 200) + '...'
          }
        }
      };

    } catch (error) {
      console.error('❌ Web Scraping 测试失败:', error);
      
      // 更新 source 错误信息
      try {
        // First, get the current error_count
        const { data: currentSource, error: fetchError } = await supabase
          .from('content_sources')
          .select('error_count')
          .eq('id', parseInt(sourceId))
          .single();

        if (fetchError) {
          console.error('❌ 获取当前错误计数失败:', fetchError);
        } else {
          // Increment the error count
          const newErrorCount = (currentSource?.error_count || 0) + 1;
          
          await supabase
            .from('content_sources')
            .update({ 
              last_error: error instanceof Error ? error.message : 'Unknown error',
              error_count: newErrorCount
            })
            .eq('id', parseInt(sourceId));
        }
      } catch (updateError) {
        console.error('❌ 更新错误信息失败:', updateError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

// 新增：测试 AI 总结功能
const testAISummarization = async (contentItemId: number, content: string): Promise<any> => {
  try {
    console.log('🤖 开始 AI 总结，Content Item ID:', contentItemId);

    // 模拟 AI 总结（实际项目中这里会调用 OpenAI API）
    const mockSummary = generateMockSummary(content);
    
    // 计算阅读时间（平均 200 字/分钟）
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    // 创建 summary 记录
    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        content_item_id: contentItemId,
        summary_text: mockSummary,
        summary_length: mockSummary.length,
        reading_time: readingTime,
        model_used: 'mock-ai-v1',
        processing_time: Math.random() * 2 + 1 // 模拟处理时间 1-3 秒
      })
      .select()
      .single();

    if (summaryError) {
      console.error('❌ 创建 summary 失败:', summaryError);
      throw summaryError;
    }

    // 更新 content_item 为已处理
    await supabase
      .from('content_items')
      .update({ 
        is_processed: true,
        processing_error: null
      })
      .eq('id', contentItemId);

    console.log('✅ 成功创建 AI 总结:', summary.id);

    return summary;

  } catch (error) {
    console.error('❌ AI 总结失败:', error);
    
    // 更新 content_item 错误信息
    await supabase
      .from('content_items')
      .update({ 
        processing_error: error instanceof Error ? error.message : 'AI summarization failed'
      })
      .eq('id', contentItemId);

    throw error;
  }
};

// 生成模拟 AI 总结
const generateMockSummary = (content: string): string => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length === 0) {
    return "This content discusses various topics and provides information on the subject matter.";
  }

  // 选择前几个有意义的句子作为总结
  const selectedSentences = sentences.slice(0, Math.min(3, sentences.length));
  let summary = selectedSentences.join('. ').trim();
  
  // 确保总结以句号结尾
  if (!summary.endsWith('.')) {
    summary += '.';
  }

  // 限制总结长度
  if (summary.length > 500) {
    summary = summary.substring(0, 497) + '...';
  }

  return summary;
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