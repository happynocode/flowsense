import { loadStripe } from '@stripe/stripe-js';

// 确保在生产环境中使用实际的可发布密钥
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo'; // 暂时使用演示密钥

// 暂时允许演示模式
if (!stripePublishableKey || stripePublishableKey === 'pk_test_demo') {
  console.warn('⚠️ Using demo Stripe key. Please set VITE_STRIPE_PUBLISHABLE_KEY for actual payments.');
}

// 初始化Stripe实例
export const stripePromise = loadStripe(stripePublishableKey);

// Stripe价格配置 - 这些应该与你在Stripe Dashboard中创建的价格ID匹配
export const STRIPE_PRICES = {
  starter: {
    monthly: 'price_1...', // 替换为你的实际价格ID
    yearly: 'price_1...', // 如果有年度计划
  },
  professional: {
    monthly: 'price_1...', // 替换为你的实际价格ID
    yearly: 'price_1...', // 如果有年度计划
  },
} as const;

// 订阅计划配置
export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: '入门版',
    price: 9,
    currency: 'usd',
    interval: 'month',
    stripePriceId: STRIPE_PRICES.starter.monthly,
    features: [
      '最多20个信息源',
      '每日自动摘要',
      '定时发送到邮箱',
      '本周内容处理',
      '自定义发送时间',
      '邮件支持',
    ],
    isPopular: true,
  },
  {
    id: 'professional',
    name: '专业版', 
    price: 19,
    currency: 'usd',
    interval: 'month',
    stripePriceId: STRIPE_PRICES.professional.monthly,
    features: [
      '无限信息源',
      '实时内容处理',
      '高级AI摘要',
      '自定义摘要长度',
      'API访问',
      '优先客户支持',
      '数据导出',
    ],
    isPopular: false,
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