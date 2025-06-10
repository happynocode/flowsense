export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: Subscription;
  // Auto digest configuration
  autoDigestEnabled?: boolean;
  autoDigestTime?: string; // Format: "HH:MM"
  autoDigestTimezone?: string;
  lastAutoDigestRun?: string;
  // Subscription limits and permissions
  maxSources?: number; // Default 3 for free, 20 for premium
  canScheduleDigest?: boolean; // Default false for free, true for premium
  canProcessWeekly?: boolean; // Default false for free, true for premium
  subscriptionTier?: 'free' | 'premium'; // Default 'free'
}

export interface ContentSource {
  id: string;
  name: string;
  url: string;
  type: 'podcast' | 'blog' | 'news';
  description?: string;
  isActive: boolean;
  hasRss?: boolean;
  rssUrl?: string;
  lastScraped?: string;
  createdAt: string;
}

export interface DigestSummary {
  id: string;
  title: string;
  content: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  readingTime: number;
}

export interface Digest {
  id: string;
  title: string;
  date: string;
  summaries: DigestSummary[];
  audioUrl?: string;
  duration?: number;
  isRead: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
  pricePerMonth: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
