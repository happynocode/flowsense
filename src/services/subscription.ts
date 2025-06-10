import { supabase } from '../lib/supabase';

export interface CreateCheckoutSessionRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface SubscriptionInfo {
  id: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  planName: string;
}

export const subscriptionService = {
  // 创建Stripe Checkout会话
  createCheckoutSession: async (request: CreateCheckoutSessionRequest): Promise<CheckoutSession> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    console.log('🔄 Creating checkout session for user:', user.id);

    // 调用Supabase Edge Function创建Stripe Checkout
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        userId: user.id,
        userEmail: user.email,
        priceId: request.priceId,
        successUrl: request.successUrl,
        cancelUrl: request.cancelUrl,
      },
    });

    if (error) {
      console.error('❌ Failed to create checkout session:', error);
      throw new Error(error.message || '创建支付会话失败');
    }

    if (!data || !data.sessionId || !data.url) {
      throw new Error('支付会话创建失败，请重试');
    }

    console.log('✅ Checkout session created:', data.sessionId);

    return {
      id: data.sessionId,
      url: data.url,
    };
  },

  // 获取用户当前订阅信息
  getSubscription: async (): Promise<SubscriptionInfo | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    console.log('🔍 Fetching subscription for user:', user.id);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch subscription:', error);
      throw error;
    }

    if (!data) {
      console.log('ℹ️ No active subscription found');
      return null;
    }

    console.log('✅ Subscription found:', data);

    return {
      id: data.id,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end || false,
      priceId: data.stripe_price_id,
      planName: data.plan_type,
    };
  },

  // 取消订阅
  cancelSubscription: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    console.log('🔄 Canceling subscription for user:', user.id);

    // 调用Supabase Edge Function取消订阅
    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: {
        userId: user.id,
      },
    });

    if (error) {
      console.error('❌ Failed to cancel subscription:', error);
      throw new Error(error.message || '取消订阅失败');
    }

    console.log('✅ Subscription canceled');
  },

  // 创建客户门户会话（用于管理计费信息）
  createPortalSession: async (): Promise<{ url: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    console.log('🔄 Creating portal session for user:', user.id);

    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        userId: user.id,
        returnUrl: `${window.location.origin}/subscription`,
      },
    });

    if (error) {
      console.error('❌ Failed to create portal session:', error);
      throw new Error(error.message || '创建客户门户会话失败');
    }

    if (!data || !data.url) {
      throw new Error('客户门户会话创建失败，请重试');
    }

    console.log('✅ Portal session created');

    return {
      url: data.url,
    };
  },

  // 检查订阅状态并同步到本地数据库
  syncSubscriptionStatus: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    console.log('🔄 Syncing subscription status for user:', user.id);

    // 调用Supabase Edge Function同步订阅状态
    const { error } = await supabase.functions.invoke('sync-subscription-status', {
      body: {
        userId: user.id,
      },
    });

    if (error) {
      console.error('❌ Failed to sync subscription status:', error);
      throw new Error(error.message || '同步订阅状态失败');
    }

    console.log('✅ Subscription status synced');
  },
}; 