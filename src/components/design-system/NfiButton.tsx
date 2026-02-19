import { ButtonHTMLAttributes } from 'react';

interface NfiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function NfiButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: NfiButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-[var(--nfi-primary)] text-white hover:bg-[var(--nfi-primary-dark)] focus:ring-[var(--nfi-primary)]',
    secondary: 'bg-white text-[var(--nfi-text)] border border-[var(--nfi-border)] hover:bg-gray-50 focus:ring-[var(--nfi-primary)]',
    ghost: 'bg-transparent text-[var(--nfi-primary)] hover:bg-gray-100 focus:ring-[var(--nfi-primary)]',
    danger: 'bg-[var(--nfi-error)] text-white hover:bg-red-600 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
