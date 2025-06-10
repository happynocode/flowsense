import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement,
} from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { Loader2, CreditCard, Shield } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { SubscriptionPlan } from '../../lib/stripe';

interface PaymentFormProps {
  plan: SubscriptionPlan;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ plan, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 确认支付
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || '支付失败，请重试');
        toast({
          title: "支付失败",
          description: error.message || '支付过程中发生错误，请重试',
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // 支付成功
        toast({
          title: "支付成功！",
          description: "您的订阅已激活，正在跳转...",
        });
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '支付过程中发生未知错误';
      setErrorMessage(errorMsg);
      toast({
        title: "支付失败",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Plan Summary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{plan.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-indigo-600">${plan.price}</span>
          <span className="text-sm text-gray-600">/ {plan.interval === 'month' ? '月' : '年'}</span>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-2 text-green-500" />
            <span>7天免费试用，随时取消</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4 inline mr-2" />
            支付信息
          </label>
          <div className="border border-gray-300 rounded-lg p-3">
            <PaymentElement 
              options={{
                layout: 'tabs'
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            账单地址
          </label>
          <div className="border border-gray-300 rounded-lg p-3">
            <AddressElement 
              options={{
                mode: 'billing'
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <Button
            type="submit"
            disabled={!stripe || isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                开始7天免费试用
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full"
          >
            取消
          </Button>
        </div>

        {/* Security Notice */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div className="flex items-center justify-center">
            <Shield className="w-3 h-3 mr-1" />
            <span>由Stripe安全处理</span>
          </div>
          <p>您的支付信息经过加密保护</p>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm; 