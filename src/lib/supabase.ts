import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

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