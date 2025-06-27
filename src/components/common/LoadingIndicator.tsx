import React from 'react';
import { Brain } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`bg-gradient-primary rounded-full flex items-center justify-center shadow-sm ${sizeClasses[size]}`}>
        <Brain className={`text-white animate-pulse ${iconSizes[size]}`} />
      </div>
      <p className="text-gray-600 text-center font-medium">{text}</p>
    </div>
  );
};

export default LoadingIndicator;
