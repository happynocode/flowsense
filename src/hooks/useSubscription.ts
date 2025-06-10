import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { User } from '../types';

export interface SubscriptionLimits {
  maxSources: number;
  canScheduleDigest: boolean;
  canProcessWeekly: boolean;
  subscriptionTier: 'free' | 'premium';
}

export interface SubscriptionStatus {
  isLoading: boolean;
  isPremium: boolean;
  isFree: boolean;
  limits: SubscriptionLimits;
  canAddSource: (currentSourceCount: number) => boolean;
  canUseFeature: (feature: 'schedule' | 'weekly' | 'auto') => boolean;
  upgradeRequired: (feature: 'schedule' | 'weekly' | 'auto' | 'addSource') => boolean;
}

const DEFAULT_FREE_LIMITS: SubscriptionLimits = {
  maxSources: 3,
  canScheduleDigest: false,
  canProcessWeekly: false,
  subscriptionTier: 'free',
};

const DEFAULT_PREMIUM_LIMITS: SubscriptionLimits = {
  maxSources: 20,
  canScheduleDigest: true,
  canProcessWeekly: true,
  subscriptionTier: 'premium',
};

export const useSubscription = (): SubscriptionStatus => {
  const { user, loading } = useAuth();

  const subscriptionStatus = useMemo(() => {
    if (loading) {
      return {
        isLoading: true,
        isPremium: false,
        isFree: true,
        limits: DEFAULT_FREE_LIMITS,
        canAddSource: () => false,
        canUseFeature: () => false,
        upgradeRequired: () => true,
      };
    }

    if (!user) {
      return {
        isLoading: false,
        isPremium: false,
        isFree: true,
        limits: DEFAULT_FREE_LIMITS,
        canAddSource: () => false,
        canUseFeature: () => false,
        upgradeRequired: () => true,
      };
    }

    // Get user's subscription limits from database or use defaults
    const limits: SubscriptionLimits = {
      maxSources: user.maxSources ?? DEFAULT_FREE_LIMITS.maxSources,
      canScheduleDigest: user.canScheduleDigest ?? DEFAULT_FREE_LIMITS.canScheduleDigest,
      canProcessWeekly: user.canProcessWeekly ?? DEFAULT_FREE_LIMITS.canProcessWeekly,
      subscriptionTier: user.subscriptionTier ?? DEFAULT_FREE_LIMITS.subscriptionTier,
    };

    const isPremium = limits.subscriptionTier === 'premium';
    const isFree = limits.subscriptionTier === 'free';

    const canAddSource = (currentSourceCount: number): boolean => {
      return currentSourceCount < limits.maxSources;
    };

    const canUseFeature = (feature: 'schedule' | 'weekly' | 'auto'): boolean => {
      switch (feature) {
        case 'schedule':
        case 'auto':
          return limits.canScheduleDigest;
        case 'weekly':
          return limits.canProcessWeekly;
        default:
          return false;
      }
    };

    const upgradeRequired = (feature: 'schedule' | 'weekly' | 'auto' | 'addSource'): boolean => {
      if (isPremium) return false;
      
      switch (feature) {
        case 'schedule':
        case 'auto':
          return !limits.canScheduleDigest;
        case 'weekly':
          return !limits.canProcessWeekly;
        case 'addSource':
          return false; // This depends on current source count, check with canAddSource
        default:
          return false;
      }
    };

    return {
      isLoading: false,
      isPremium,
      isFree,
      limits,
      canAddSource,
      canUseFeature,
      upgradeRequired,
    };
  }, [user, loading]);

  return subscriptionStatus;
}; 