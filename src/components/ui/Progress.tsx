'use client';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
}

export default function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const variants = {
    default: 'bg-gradient-to-r from-violet-500 to-indigo-500',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500',
  };
  
  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-zinc-400">{label}</span>}
          {showLabel && (
            <span className="text-sm font-medium text-zinc-300">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-zinc-800 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${sizes[size]} ${variants[variant]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
