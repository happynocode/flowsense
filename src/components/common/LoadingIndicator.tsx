
import React from 'react';
import { Brain } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingIndicator = ({ size = 'md', text = 'Loading your content...', className = '' }: LoadingIndicatorProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple ${
        size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-16 h-16' : 'w-20 h-20'
      }`}>
        <Brain className={`text-starlight ${iconSizes[size]}`} />
      </div>
      {text && (
        <p className="text-lunar-grey text-center">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingIndicator;
