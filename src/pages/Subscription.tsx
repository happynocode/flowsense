
import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { subscriptionApi } from '../services/api';
import { Subscription, SubscriptionPlan } from '../types';
import { useToast } from '../hooks/use-toast';
import LoadingIndicator from '../components/common/LoadingIndicator';

const Subscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscriptionData, plansData] = await Promise.all([
        subscriptionApi.getSubscription(),
        subscriptionApi.getPlans()
      ]);
      setSubscription(subscriptionData);
      setPlans(plansData);
    } catch (error) {
      toast({
        title: "Failed to load subscription data",
        description: "There was an error loading your subscription information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (planId: string) => {
    // This would typically open a Stripe checkout flow
    toast({
      title: "Upgrade Feature",
      description: "Subscription upgrade will be implemented with Stripe integration.",
    });
  };

  const handleCancel = async () => {
    try {
      await subscriptionApi.cancelSubscription();
      setSubscription(prev => prev ? { ...prev, status: 'canceled' } : null);
      toast({
        title: "Subscription canceled",
        description: "Your subscription has been canceled successfully.",
      });
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: "There was an error canceling your subscription.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'basic':
        return <Star className="h-5 w-5" />;
      case 'premium':
        return <Zap className="h-5 w-5" />;
      case 'enterprise':
        return <Crown className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading subscription details..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-2">
            Manage your Daily Digest subscription and billing
          </p>
        </div>

        {/* Current Subscription */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Subscription</span>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Plan</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription.planName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Price</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${subscription.pricePerMonth}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Next Billing</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
              
              {subscription.status === 'active' && (
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {subscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${
                  plan.isPopular ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${
                  subscription?.planId === plan.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-lg ${
                      plan.isPopular ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getPlanIcon(plan.name)}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-gray-900">
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-600">/month</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4">
                    {subscription?.planId === plan.id ? (
                      <Button disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleUpgrade(plan.id)}
                        variant={plan.isPopular ? 'default' : 'outline'}
                        className="w-full"
                      >
                        {subscription ? 'Upgrade' : 'Get Started'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Can I change my plan at any time?
              </h4>
              <p className="text-gray-600 text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                What happens if I cancel my subscription?
              </h4>
              <p className="text-gray-600 text-sm">
                You'll continue to have access to your current plan features until the end of your billing period. After that, you'll be moved to the free tier.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-600 text-sm">
                We offer a 30-day money-back guarantee for all new subscriptions. Contact support if you're not satisfied with the service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscription;
