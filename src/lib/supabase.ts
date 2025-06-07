import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
})

// Test connection function with proper error handling
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Use a simple query with timeout
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for connection test
      console.error('Supabase connection error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Supabase connection test failed:', error)
    return false
  }
}

// Initialize connection test on module load
let connectionStatus: boolean | null = null

export const getConnectionStatus = async (): Promise<boolean> => {
  if (connectionStatus === null) {
    connectionStatus = await testSupabaseConnection()
  }
  return connectionStatus
}

// Reset connection status for retry
export const resetConnectionStatus = (): void => {
  connectionStatus = null
}