
import axios from 'axios';
import { User, ContentSource, Digest, Subscription, SubscriptionPlan, ApiResponse, PaginatedResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  loginWithGoogle: () => {
    window.location.href = '/api/auth/google';
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await api.get<ApiResponse<User>>('/user/profile');
      return response.data.data;
    } catch (error) {
      return null;
    }
  }
};

// Sources API
export const sourcesApi = {
  getSources: async (): Promise<ContentSource[]> => {
    const response = await api.get<ApiResponse<ContentSource[]>>('/sources');
    return response.data.data;
  },
  
  createSource: async (source: Omit<ContentSource, 'id' | 'createdAt' | 'lastScraped'>): Promise<ContentSource> => {
    const response = await api.post<ApiResponse<ContentSource>>('/sources', source);
    return response.data.data;
  },
  
  updateSource: async (id: string, source: Partial<ContentSource>): Promise<ContentSource> => {
    const response = await api.put<ApiResponse<ContentSource>>(`/sources/${id}`, source);
    return response.data.data;
  },
  
  deleteSource: async (id: string): Promise<void> => {
    await api.delete(`/sources/${id}`);
  },
  
  validateSource: async (url: string): Promise<{ valid: boolean; message: string }> => {
    const response = await api.post<ApiResponse<{ valid: boolean; message: string }>>('/sources/validate', { url });
    return response.data.data;
  }
};

// Digests API
export const digestsApi = {
  getDigests: async (page = 1, limit = 10): Promise<PaginatedResponse<Digest[]>> => {
    const response = await api.get<PaginatedResponse<Digest[]>>(`/digests?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getDigest: async (id: string): Promise<Digest> => {
    const response = await api.get<ApiResponse<Digest>>(`/digests/${id}`);
    return response.data.data;
  },
  
  markDigestAsRead: async (id: string): Promise<void> => {
    await api.patch(`/digests/${id}/read`);
  }
};

// Subscription API
export const subscriptionApi = {
  getSubscription: async (): Promise<Subscription | null> => {
    try {
      const response = await api.get<ApiResponse<Subscription>>('/subscription');
      return response.data.data;
    } catch (error) {
      return null;
    }
  },
  
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get<ApiResponse<SubscriptionPlan[]>>('/subscription/plans');
    return response.data.data;
  },
  
  createSubscription: async (planId: string, paymentMethodId: string): Promise<Subscription> => {
    const response = await api.post<ApiResponse<Subscription>>('/subscription', {
      planId,
      paymentMethodId
    });
    return response.data.data;
  },
  
  cancelSubscription: async (): Promise<void> => {
    await api.delete('/subscription');
  }
};

export default api;
