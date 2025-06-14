import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const DebugSubscription = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const fetchCurrentStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 获取订阅信息
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 获取用户信息
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('subscription_tier, max_sources, can_schedule_digest, can_process_weekly')
        .eq('id', user.id)
        .single();

      setSubscriptionData(subscription);
      setUserData(userInfo);

      if (subError || userError) {
        console.error('Fetch errors:', { subError, userError });
      }

    } catch (error) {
      console.error('Failed to fetch status:', error);
      toast({
        title: "Failed to Fetch Status",
        description: "Unable to get current subscription status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const manualSyncToPremium = async () => {
    if (!user || !subscriptionData) return;

    try {
      setLoading(true);

      if (subscriptionData.status === 'active') {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: 'premium',
            max_sources: 20,
            can_schedule_digest: true,
            can_process_weekly: true,
          })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        await refreshUser();
        await fetchCurrentStatus();

        toast({
          title: "✅ Sync Successful",
          description: "User permissions have been updated to premium",
        });
      } else {
        toast({
          title: "Cannot Sync",
          description: "Subscription status is not active, cannot update to premium",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Manual sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Unable to update user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchCurrentStatus();
    }
  }, [user]);

  if (!user) {
    return <div>Please login first</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subscription Status Debug</h1>

        {/* Current Status */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Subscription Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Subscription Info
            </h2>
            {subscriptionData ? (
              <div className="space-y-2 text-sm">
                <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${subscriptionData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{subscriptionData.status}</span></p>
                <p><strong>Plan:</strong> {subscriptionData.plan_type}</p>
                <p><strong>Subscription ID:</strong> {subscriptionData.stripe_subscription_id}</p>
                <p><strong>Expires:</strong> {new Date(subscriptionData.current_period_end).toLocaleString()}</p>
                <p><strong>Cancel at Period End:</strong> {subscriptionData.cancel_at_period_end ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-gray-500">No subscription record</p>
            )}
          </div>

          {/* User Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
              User Permissions
            </h2>
            {userData ? (
              <div className="space-y-2 text-sm">
                <p><strong>Subscription Tier:</strong> <span className={`px-2 py-1 rounded text-xs ${userData.subscription_tier === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{userData.subscription_tier}</span></p>
                <p><strong>Max Sources:</strong> {userData.max_sources}</p>
                <p><strong>Can Schedule Digest:</strong> {userData.can_schedule_digest ? 'Yes' : 'No'}</p>
                <p><strong>Can Process Weekly:</strong> {userData.can_process_weekly ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-gray-500">No user data</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex gap-4">
            <Button 
              onClick={fetchCurrentStatus}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh Status
            </Button>

            <Button 
              onClick={manualSyncToPremium}
              disabled={loading || !subscriptionData || subscriptionData.status !== 'active'}
              className="btn-primary"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Manual Sync to Premium
            </Button>
          </div>

          {subscriptionData && subscriptionData.status === 'active' && userData && userData.subscription_tier !== 'premium' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Issue Detected:</strong> You have an active subscription but user permissions have not been updated to premium. Please click "Manual Sync to Premium" button.
              </p>
            </div>
          )}

          {subscriptionData && subscriptionData.status === 'active' && userData && userData.subscription_tier === 'premium' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                <strong>Status Normal:</strong> Your subscription and user permissions are correctly configured.
              </p>
            </div>
          )}
        </div>

        {/* User ID for manual SQL updates */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>User ID (for manual SQL updates):</strong> <code className="bg-gray-200 px-2 py-1 rounded">{user.id}</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DebugSubscription; 