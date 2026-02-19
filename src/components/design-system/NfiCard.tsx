import { ReactNode } from 'react';

interface NfiCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function NfiCard({ children, className = '', padding = 'md' }: NfiCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-[var(--nfi-surface)] rounded-lg border border-[var(--nfi-border)] shadow-sm ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
