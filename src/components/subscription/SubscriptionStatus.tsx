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
    <div className={`rounded-lg p-4 border ${className} ${
      isPremium 
        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
        : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isPremium ? (
            <div className="flex items-center space-x-2">
              <Crown className="h-6 w-6 text-yellow-600" />
              <div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  高级版用户
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  享受所有高级功能
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-gray-500" />
              <div>
                <Badge variant="outline" className="border-gray-300 text-gray-700">
                  免费用户
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  {limits.maxSources} 个信息源，仅限今日处理
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feature Summary */}
        <div className="text-right">
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-end space-x-2">
              <span className="text-gray-600">信息源:</span>
              <span className="font-medium">{limits.maxSources}</span>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <span className="text-gray-600">自动摘要:</span>
              <span className={`font-medium ${limits.canScheduleDigest ? 'text-green-600' : 'text-gray-400'}`}>
                {limits.canScheduleDigest ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <span className="text-gray-600">本周处理:</span>
              <span className={`font-medium ${limits.canProcessWeekly ? 'text-green-600' : 'text-gray-400'}`}>
                {limits.canProcessWeekly ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>

        {/* Upgrade Button */}
        {isFree && showUpgradePrompt && (
          <div className="ml-4">
            <Button 
              onClick={() => window.location.href = '/subscription'}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              size="sm"
            >
              <Crown className="w-4 h-4 mr-2" />
              升级到高级版
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Premium Benefits Preview */}
      {isFree && showUpgradePrompt && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600">20个信息源</span>
            </div>
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600">自动定时摘要</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600">本周内容处理</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus; 