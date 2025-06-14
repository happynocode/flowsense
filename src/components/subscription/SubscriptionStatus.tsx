import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Crown, Zap, Shield, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionStatusProps {
  showUpgradePrompt?: boolean;
  className?: string;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  showUpgradePrompt = true,
  className = ""
}) => {
  const { isPremium, isFree, limits, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 shadow-lg ${className} ${
      isPremium 
        ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-yellow-300'
        : 'bg-gradient-to-br from-white via-blue-50 to-indigo-50 border-indigo-200'
    }`}>
      <div className="p-5">
        {/* Upgrade Button - Made more prominent for free users */}
        {isFree && showUpgradePrompt && (
          <div className="mb-4 p-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl">
            <Button 
              onClick={() => window.location.href = '/subscription'}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3 text-base"
              size="lg"
            >
              <Crown className="w-5 h-5 mr-2" />
              🚀 Upgrade to Premium Now!
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* Main Status Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {isPremium ? (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold px-3 py-1">
                    Premium User
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1 font-medium">
                    Enjoy all premium features
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Shield className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <Badge variant="outline" className="border-gray-400 text-gray-700 font-semibold px-3 py-1">
                    Free User
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1 font-medium">
                    {limits.maxSources} sources, today's processing only
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Summary Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/80 rounded-lg p-4 text-center border border-indigo-200/50 shadow-sm">
            <div className="text-2xl font-bold text-indigo-600 mb-1">{limits.maxSources}</div>
            <div className="text-xs text-gray-600 font-semibold">Sources</div>
          </div>
          <div className="bg-white/80 rounded-lg p-4 text-center border border-indigo-200/50 shadow-sm">
            <div className={`text-2xl font-bold mb-1 ${limits.canScheduleDigest ? 'text-green-600' : 'text-red-400'}`}>
              {limits.canScheduleDigest ? '✓' : '✗'}
            </div>
            <div className="text-xs text-gray-600 font-semibold">Auto Digest</div>
          </div>
          <div className="bg-white/80 rounded-lg p-4 text-center border border-indigo-200/50 shadow-sm">
            <div className={`text-2xl font-bold mb-1 ${limits.canProcessWeekly ? 'text-green-600' : 'text-red-400'}`}>
              {limits.canProcessWeekly ? '✓' : '✗'}
            </div>
            <div className="text-xs text-gray-600 font-semibold">Weekly Processing</div>
          </div>
        </div>

        {/* Premium Benefits Preview */}
        {isFree && showUpgradePrompt && (
          <div className="mt-5 p-4 bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 border-2 border-orange-300 rounded-xl shadow-sm">
            <h4 className="text-sm font-bold text-orange-800 mb-3 text-center">✨ Unlock Premium Features ✨</h4>
            <div className="grid grid-cols-2 gap-3 text-sm font-medium">
              <div className="flex items-center text-orange-700 bg-white/60 rounded-lg p-2 border border-orange-200">
                <Crown className="w-4 h-4 mr-2 text-yellow-600" />
                20 Sources
              </div>
              <div className="flex items-center text-orange-700 bg-white/60 rounded-lg p-2 border border-orange-200">
                <Crown className="w-4 h-4 mr-2 text-yellow-600" />
                Auto Daily Digest
              </div>
              <div className="flex items-center text-orange-700 bg-white/60 rounded-lg p-2 border border-orange-200">
                <Crown className="w-4 h-4 mr-2 text-yellow-600" />
                Weekly Processing
              </div>
              <div className="flex items-center text-orange-700 bg-white/60 rounded-lg p-2 border border-orange-200">
                <Crown className="w-4 h-4 mr-2 text-yellow-600" />
                Custom Schedule
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatus; 