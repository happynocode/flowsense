import { loadStripe } from '@stripe/stripe-js';

// 确保在生产环境中使用实际的可发布密钥
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo'; // 暂时使用演示密钥

// 暂时允许演示模式
if (!stripePublishableKey || stripePublishableKey === 'pk_test_demo') {
  console.warn('⚠️ Using demo Stripe key. Please set VITE_STRIPE_PUBLISHABLE_KEY for actual payments.');
}

// 初始化Stripe实例
export const stripePromise = loadStripe(stripePublishableKey);

// Stripe价格配置 - 从环境变量读取
export const STRIPE_PRICES = {
  starter: {
    monthly: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID || 'price_1RYI6RJ190Ki7I11RybFy23j',
    yearly: import.meta.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly_demo',
  },
  professional: {
    monthly: import.meta.env.VITE_STRIPE_PROFESSIONAL_PRICE_ID || 'price_1RYI6kJ190Ki7I11K8bmWjJn',
    yearly: import.meta.env.VITE_STRIPE_PROFESSIONAL_YEARLY_PRICE_ID || 'price_professional_yearly_demo',
  },
} as const;

// 订阅计划配置
export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Premium Plan',
    price: 9,
    currency: 'usd',
    interval: 'month',
    stripePriceId: STRIPE_PRICES.starter.monthly,
    features: [
      'Up to 20 content sources',
      'Daily auto digest',
      'Email delivery',
      'Weekly content processing',
      'Custom delivery time',
      'Email support',
    ],
    isPopular: true,
  },
] as const;

// Stripe配置选项
export const stripeOptions = {
  // 这里可以添加自定义样式
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#4f46e5',
      colorBackground: '#ffffff',
      colorText: '#374151',
    },
  },
};

export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[number]; 