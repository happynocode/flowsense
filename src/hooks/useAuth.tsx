import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useToast } from './use-toast';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
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
          .eq('google_id', supabaseUser.id)
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
              google_id: supabaseUser.id,
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

  const login = async () => {
    try {
      // For now, we'll use email/password auth since Google OAuth isn't set up yet
      // This is a placeholder - in a real app you'd have a proper login form
      toast({
        title: "Login not configured",
        description: "Please set up Google OAuth in Supabase to enable login.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "There was an error logging you in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUser(null);
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        });
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
        }
        
        if (session) {
          await refreshUser();
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        // Always set loading to false, even if there's an error
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await refreshUser();
        toast({
          title: "Logged in successfully",
          description: "Welcome to Neural Hub!",
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};