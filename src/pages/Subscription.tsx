
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../services/api';
import type { Subscription as SubscriptionType, SubscriptionPlan } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle } from 'lucide-react';
import LoadingIndicator from '../components/common/LoadingIndicator';

const SubscriptionPage = () => {
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
  });

  // Mock pricing plans since we don't have real backend data
  const mockPlans: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      features: [
        'Up to 5 content sources',
        'Daily digest delivery',
        'Email summaries',
        'Basic analytics',
        'Mobile app access'
      ],
      isPopular: false
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 19.99,
      features: [
        'Unlimited content sources',
        'Daily + weekly digests',
        'Audio summaries',
        'Advanced analytics',
        'Priority support',
        'Custom digest timing',
        'Export to PDF'
      ],
      isPopular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 49.99,
      features: [
        'Everything in Premium',
        'Team collaboration',
        'Custom branding',
        'API access',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security features'
      ],
      isPopular: false
    }
  ];

  const currentPlans = plans || mockPlans;

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading subscription details..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Subscription Management</h1>
        
        {subscription ? (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Current Subscription
                  <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                    {subscription.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage your current subscription plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{subscription.planName}</h3>
                    <p className="text-gray-600">${subscription.pricePerMonth}/month</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Manage Billing
                    </Button>
                    <Button variant="destructive" size="sm">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>
                  Select the perfect plan for your content consumption needs
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Pricing Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Pricing Plans</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {currentPlans.map((plan: SubscriptionPlan) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.isPopular ? 'ring-2 ring-blue-500 scale-105' : ''} hover:shadow-lg transition-all`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={plan.isPopular ? 'default' : 'outline'}
                      size="lg"
                      disabled={subscription?.planId === plan.id}
                    >
                      {subscription?.planId === plan.id ? 'Current Plan' : `Choose ${plan.name}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h4>
                <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h4>
                <p className="text-gray-600 text-sm">Yes, all plans come with a 14-day free trial. No credit card required.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
                <p className="text-gray-600 text-sm">Absolutely. You can cancel your subscription at any time with no cancellation fees.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
                <p className="text-gray-600 text-sm">We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
