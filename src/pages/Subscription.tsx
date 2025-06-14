import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { CheckCircle, Brain, ArrowRight, Crown, CreditCard, Settings, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { stripePromise, SUBSCRIPTION_PLANS, type SubscriptionPlan } from '../lib/stripe';
import { subscriptionService, type SubscriptionInfo } from '../services/subscription';
import PaymentForm from '../components/subscription/PaymentForm';
import SubscriptionStatus from '../components/subscription/SubscriptionStatus';

const Subscription = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, isFree } = useSubscription();
  const { toast } = useToast();
  
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 如果用户未登录，重定向到登录页面
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // 加载当前订阅信息
  useEffect(() => {
    if (user && isPremium) {
      loadCurrentSubscription();
    }
  }, [user, isPremium]);

  const loadCurrentSubscription = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getSubscription();
      setCurrentSubscription(subscription);

      // 检查是否有最近创建的订阅（5分钟内）但用户权限还是free
      if (subscription && subscription.status === 'active' && !isPremium) {
        const subscriptionCreatedAt = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        // 如果订阅很新，说明刚完成支付，重定向到成功页面进行权限同步
        console.log('Found recent active subscription, redirecting to success page');
        window.location.href = '/subscription/success';
        return;
      }
      
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (isPremium) {
      toast({
        title: "Already Premium User",
        description: "You already have an active subscription.",
      });
      return;
    }

    try {
      setLoading(true);
      setSelectedPlan(plan);

      // 创建Stripe Checkout会话
      const checkoutSession = await subscriptionService.createCheckoutSession({
        priceId: plan.stripePriceId,
        successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/subscription`,
      });

      // 跳转到Stripe Checkout
      window.location.href = checkoutSession.url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast({
        title: "Payment Failed to Start",
        description: error instanceof Error ? error.message : "Error occurred while creating payment session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      const portalSession = await subscriptionService.createPortalSession();
      window.open(portalSession.url, '_blank');
    } catch (error) {
      console.error('Failed to create portal session:', error);
      toast({
        title: "Unable to Open Billing Management",
        description: error instanceof Error ? error.message : "Error occurred while creating customer portal session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-balance">
            <span className="text-gray-800">Choose Your</span>{" "}
            <span className="text-gradient-primary">Subscription Plan</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
            Upgrade to Premium and unlock powerful features
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="flex justify-center mb-16">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`modern-card-elevated p-8 text-center relative max-w-md w-full ${
                plan.isPopular ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="badge-accent px-4 py-2">Most Popular</span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
              
              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-800">${plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 text-left">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {isPremium ? (
                <Button
                  disabled
                  className="w-full mb-4 opacity-50 cursor-not-allowed"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Subscribed
                </Button>
              ) : (
                <Button
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading}
                  className="btn-primary w-full mb-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Start 7-Day Free Trial
                    </>
                  )}
                </Button>
              )}
              
              <p className="text-sm text-gray-500">
                7-day free trial, then ${plan.price}/month
              </p>
            </div>
          ))}
        </div>

        {/* Security and Trust */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Security & Trust</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>SSL Encrypted</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Stripe Secure Payment</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Sources */}
        <div className="text-center mt-12">
          <Link to="/sources">
            <Button variant="outline">
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Sources
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
