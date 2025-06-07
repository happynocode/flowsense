import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../services/api';
import type { Subscription as SubscriptionType, SubscriptionPlan } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle, Zap, Shield, Brain, Sparkles, Globe, Settings } from 'lucide-react';
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

  const mockPlans: SubscriptionPlan[] = [
    {
      id: 'premium',
      name: 'Premium Plan',
      price: 9.99,
      features: [
        'Up to 20 content sources',
        'Daily AI digest delivery',
        'Email summaries included',
        'Audio digest versions',
        'Mobile interface access',
        'Priority support',
        'Advanced analytics',
        'Custom delivery schedules'
      ],
      isPopular: true
    }
  ];

  const currentPlans = plans || mockPlans;

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <Brain className="w-8 h-8 text-starlight" />
          </div>
          <LoadingIndicator size="lg" text="Loading neural interface..." />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-4">
            <span className="text-cosmic-gradient">Power Level</span>{" "}
            <span className="text-starlight">Management</span>
          </h1>
          <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
            Upgrade your neural processing capabilities and unlock the full potential of AI intelligence
          </p>
        </div>
        
        {subscription ? (
          <div className="mb-12">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-starlight">
                  Current Neural Configuration
                  <Badge 
                    variant={subscription.status === 'active' ? 'default' : 'destructive'}
                    className={`${
                      subscription.status === 'active' 
                        ? 'bg-astral-teal text-midnight' 
                        : 'bg-nebula-pink text-starlight'
                    }`}
                  >
                    {subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-lunar-grey">
                  Monitor and optimize your neural interface settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-card p-4">
                      <h3 className="font-space-grotesk font-semibold text-starlight mb-2">{subscription.planName}</h3>
                      <p className="text-cosmic-gradient text-2xl font-bold">${subscription.pricePerMonth}/month</p>
                    </div>
                    <div className="glass-card p-4">
                      <h4 className="font-medium text-starlight mb-2">Next Quantum Cycle</h4>
                      <p className="text-lunar-grey">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="btn-outline-electric">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Billing
                    </Button>
                    <Button variant="destructive" className="bg-nebula-pink hover:bg-nebula-pink/80 text-starlight">
                      <Zap className="w-4 h-4 mr-2" />
                      Terminate Connection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mb-12">
            <Card className="glass-card border-0 text-center p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-sunset-gradient rounded-full flex items-center justify-center glow-pink">
                <Brain className="w-10 h-10 text-starlight" />
              </div>
              <CardTitle className="text-2xl text-starlight mb-4">Initialize Neural Interface</CardTitle>
              <CardDescription className="text-lunar-grey text-lg">
                Select your preferred power level to begin your journey into AI-enhanced intelligence
              </CardDescription>
            </Card>
          </div>
        )}

        {/* Pricing Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-space-grotesk font-bold mb-4">
              <span className="text-aurora-gradient">Neural</span>{" "}
              <span className="text-starlight">Power Level</span>
            </h2>
            <p className="text-lunar-grey text-lg">The perfect configuration for enhanced intelligence processing</p>
          </div>
          
          <div className="max-w-md mx-auto">
            {currentPlans.map((plan: SubscriptionPlan) => (
              <Card 
                key={plan.id} 
                className="relative glass-card border-0 gradient-border glow-blue scale-105"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-sunset-gradient text-starlight px-4 py-2 glow-pink">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Most Popular
                  </Badge>
                </div>
                
                <CardHeader className="text-center pb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-sunset-gradient rounded-2xl flex items-center justify-center glow-pink">
                    <Brain className="w-8 h-8 text-starlight" />
                  </div>
                  <CardTitle className="text-2xl text-starlight mb-4">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-cosmic-gradient">${plan.price}</span>
                    <span className="text-lunar-grey">/month</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-astral-teal mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-starlight text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full h-12 btn-cosmic"
                    disabled={subscription?.planId === plan.id}
                  >
                    {subscription?.planId === plan.id ? (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Current Level
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Activate {plan.name}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-space-grotesk font-bold text-center text-starlight mb-8">
            <span className="text-cosmic-gradient">Neural</span> Interface FAQ
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <h4 className="font-semibold text-starlight mb-3">Can I upgrade my neural capacity?</h4>
                <p className="text-lunar-grey text-sm">
                  Yes, you can enhance your power level at any time. Quantum changes are applied instantly.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <h4 className="font-semibold text-starlight mb-3">Is there a neural trial period?</h4>
                <p className="text-lunar-grey text-sm">
                  All power levels include a 14-day quantum trial. No neural commitment required.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <h4 className="font-semibold text-starlight mb-3">Can I disconnect anytime?</h4>
                <p className="text-lunar-grey text-sm">
                  Absolutely. Terminate your neural connection at any time with zero quantum penalties.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <h4 className="font-semibold text-starlight mb-3">What payment methods are accepted?</h4>
                <p className="text-lunar-grey text-sm">
                  We accept quantum credits, neural transfers, and traditional payment methods.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;