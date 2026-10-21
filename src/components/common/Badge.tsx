import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  size?: 'xs' | 'sm';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'purple',
  size = 'xs',
  className = '',
}) => {
  const variantStyles = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
