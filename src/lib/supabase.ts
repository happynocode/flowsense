import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: any;

console.log('Supabase 环境变量检查:', {
  url: supabaseUrl ? '已设置' : '未设置',
  key: supabaseAnonKey ? '已设置' : '未设置',
  urlValue: supabaseUrl,
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少 Supabase 环境变量:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  
  // 创建模拟客户端以防止应用崩溃
  const mockClient = {
    auth: {
      getUser: () => {
        console.log('模拟客户端: getUser 调用');
        return Promise.resolve({ data: { user: null }, error: new Error('Supabase 未配置') });
      },
      getSession: () => {
        console.log('模拟客户端: getSession 调用');
        return Promise.resolve({ data: { session: null }, error: new Error('Supabase 未配置') });
      },
      signInWithPassword: () => {
        console.log('模拟客户端: signInWithPassword 调用');
        return Promise.resolve({ error: new Error('Supabase 未配置，请检查环境变量') });
      },
      signUp: () => {
        console.log('模拟客户端: signUp 调用');
        return Promise.resolve({ error: new Error('Supabase 未配置，请检查环境变量') });
      },
      signOut: () => {
        console.log('模拟客户端: signOut 调用');
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: () => {
        console.log('模拟客户端: onAuthStateChange 调用');
        return { data: { subscription: { unsubscribe: () => console.log('模拟客户端: 取消订阅') } } };
      }
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => {
            console.log('模拟客户端: 数据库查询调用');
            return Promise.resolve({ data: null, error: new Error('Supabase 未配置') });
          }
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => {
            console.log('模拟客户端: 数据库插入调用');
            return Promise.resolve({ data: null, error: new Error('Supabase 未配置') });
          }
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => {
              console.log('模拟客户端: 数据库更新调用');
              return Promise.resolve({ data: null, error: new Error('Supabase 未配置') });
            }
          })
        })
      }),
      delete: () => ({
        eq: () => {
          console.log('模拟客户端: 数据库删除调用');
          return Promise.resolve({ error: new Error('Supabase 未配置') });
        }
      })
    })
  };
  
  supabase = mockClient;
} else {
  console.log('创建 Supabase 客户端...');
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    console.log('Supabase 客户端创建成功');
  } catch (error) {
    console.error('创建 Supabase 客户端失败:', error);
    // 如果创建失败，使用模拟客户端
    supabase = mockClient;
  }
}

export { supabase };

// Database types (generated from your schema)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          email: string
          google_id: string | null
          name: string
          avatar_url: string | null
          subscription_status: string
          subscription_expiry: string | null
          stripe_customer_id: string | null
          email_notifications: boolean
          digest_frequency: string
          created_at: string
          updated_at: string
          last_login: string | null
        }
        Insert: {
          email: string
          google_id?: string | null
          name: string
          avatar_url?: string | null
          subscription_status?: string
          subscription_expiry?: string | null
          stripe_customer_id?: string | null
          email_notifications?: boolean
          digest_frequency?: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
        Update: {
          email?: string
          google_id?: string | null
          name?: string
          avatar_url?: string | null
          subscription_status?: string
          subscription_expiry?: string | null
          stripe_customer_id?: string | null
          email_notifications?: boolean
          digest_frequency?: string
          updated_at?: string
          last_login?: string | null
        }
      }
      content_sources: {
        Row: {
          id: number
          user_id: number
          name: string
          url: string
          source_type: string
          description: string | null
          has_rss: boolean
          rss_url: string | null
          scraping_selector: string | null
          is_active: boolean
          last_scraped_at: string | null
          last_error: string | null
          error_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: number
          name: string
          url: string
          source_type: string
          description?: string | null
          has_rss?: boolean
          rss_url?: string | null
          scraping_selector?: string | null
          is_active?: boolean
          last_scraped_at?: string | null
          last_error?: string | null
          error_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: number
          name?: string
          url?: string
          source_type?: string
          description?: string | null
          has_rss?: boolean
          rss_url?: string | null
          scraping_selector?: string | null
          is_active?: boolean
          last_scraped_at?: string | null
          last_error?: string | null
          error_count?: number
          updated_at?: string
        }
      }
      digests: {
        Row: {
          id: number
          user_id: number
          title: string
          generation_date: string
          email_sent: boolean
          email_sent_at: string | null
          audio_url: string | null
          audio_duration: number | null
          is_read: boolean
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: number
          title: string
          generation_date: string
          email_sent?: boolean
          email_sent_at?: string | null
          audio_url?: string | null
          audio_duration?: number | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: number
          title?: string
          generation_date?: string
          email_sent?: boolean
          email_sent_at?: string | null
          audio_url?: string | null
          audio_duration?: number | null
          is_read?: boolean
          read_at?: string | null
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: number
          user_id: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          plan_type: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          amount: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan_type: string
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          amount: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan_type?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          amount?: number
          currency?: string
          updated_at?: string
        }
      }
    }
  }
}