
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useToast } from './use-toast';

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
      // Mock user for bypassing authentication
      const mockUser: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUser(mockUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const login = () => {
    // Mock login - just set the user directly
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUser(mockUser);
    toast({
      title: "Logged in successfully",
      description: "Welcome to Daily Digest!",
    });
  };

  const logout = async () => {
    try {
      // For mock authentication, just clear the user state
      setUser(null);
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
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
      setLoading(true);
      // For demo purposes, start without a user so you can see the landing page
      setUser(null);
      setLoading(false);
    };

    initAuth();
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
