import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface NfiFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  type?: 'input' | 'textarea' | 'select';
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
  selectProps?: InputHTMLAttributes<HTMLSelectElement>;
  children?: React.ReactNode;
}

export function NfiField({
  label,
  required,
  error,
  hint,
  type = 'input',
  inputProps,
  textareaProps,
  selectProps,
  children,
}: NfiFieldProps) {
  const baseInputClasses =
    'block w-full rounded-md border-[var(--nfi-border)] shadow-sm focus:border-[var(--nfi-primary)] focus:ring-1 focus:ring-[var(--nfi-primary)] sm:text-sm';
  const errorClasses = error
    ? 'border-[var(--nfi-error)] focus:border-[var(--nfi-error)] focus:ring-[var(--nfi-error)]'
    : '';

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[var(--nfi-text)]">
        {label}
        {required && <span className="text-[var(--nfi-error)] ml-1">*</span>}
      </label>

      {children ? (
        children
      ) : (
        <>
          {type === 'input' && (
            <input
              className={`${baseInputClasses} ${errorClasses} ${inputProps?.className || ''}`}
              {...inputProps}
            />
          )}

          {type === 'textarea' && (
            <textarea
              className={`${baseInputClasses} ${errorClasses} ${textareaProps?.className || ''}`}
              rows={4}
              {...textareaProps}
            />
          )}

          {type === 'select' && (
            <select
              className={`${baseInputClasses} ${errorClasses} ${selectProps?.className || ''}`}
              {...selectProps}
            />
          )}
        </>
      )}

      {hint && !error && <p className="text-xs text-[var(--nfi-text-secondary)]">{hint}</p>}
      {error && <p className="text-xs text-[var(--nfi-error)]">{error}</p>}
    </div>
  );
}
