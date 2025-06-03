
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../services/api';
import type { Subscription as SubscriptionType, SubscriptionPlan } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading subscription details..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription Management</h1>
        
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
                  <Button variant="destructive" size="sm">
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>No Active Subscription</CardTitle>
                <CardDescription>
                  Choose a plan to start receiving your daily content digests
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans?.map((plan: SubscriptionPlan) => (
            <Card key={plan.id} className={plan.isPopular ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.isPopular && (
                    <Badge variant="default">Popular</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.isPopular ? 'default' : 'outline'}
                    disabled={subscription?.planId === plan.id}
                  >
                    {subscription?.planId === plan.id ? 'Current Plan' : 'Choose Plan'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
