import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading StudyPilot data...',
  size = 'md',
}) => {
  const iconSizes = { sm: 16, md: 24, lg: 32 };
  const boxSizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div
        className={`${boxSizes[size]} rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 animate-pulse`}
      >
        <Sparkles size={iconSizes[size]} className="animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      {label && <p className="text-xs font-semibold text-slate-400">{label}</p>}
    </div>
  );
};
