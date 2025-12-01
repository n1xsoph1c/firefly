'use client';

import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { HTMLAttributes } from 'react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  onClose?: () => void;
}

export default function Alert({
  children,
  variant = 'info',
  title,
  onClose,
  className = '',
  ...props
}: AlertProps) {
  const variants = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      icon: <Info size={20} />,
    },
    success: {
      container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      icon: <CheckCircle size={20} />,
    },
    warning: {
      container: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      icon: <AlertCircle size={20} />,
    },
    danger: {
      container: 'bg-red-500/10 border-red-500/20 text-red-400',
      icon: <XCircle size={20} />,
    },
  };
  
  const config = variants[variant];
  
  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border
        ${config.container} ${className}
      `}
      {...props}
    >
      <div className="flex-shrink-0 mt-0.5">
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1">
            {title}
          </h4>
        )}
        <div className="text-sm opacity-90">
          {children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
