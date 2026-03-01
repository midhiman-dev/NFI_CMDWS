import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { inputBase, inputError, textareaBase, selectBase } from '../ui/formStyles';

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
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
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
  value,
  onChange,
}: NfiFieldProps) {
  const resolvedInputClass = [inputBase, error ? inputError : '', inputProps?.className || '']
    .filter(Boolean)
    .join(' ');

  const resolvedTextareaClass = [textareaBase, error ? inputError : '', textareaProps?.className || '']
    .filter(Boolean)
    .join(' ');

  const resolvedSelectClass = [selectBase, error ? inputError : '', selectProps?.className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {children ? (
        children
      ) : (
        <>
          {type === 'input' && (
            <input
              className={resolvedInputClass}
              {...inputProps}
            />
          )}

          {type === 'textarea' && (
            <textarea
              className={resolvedTextareaClass}
              rows={4}
              value={value}
              onChange={onChange}
              {...textareaProps}
            />
          )}

          {type === 'select' && (
            <select
              className={resolvedSelectClass}
              {...(selectProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
            />
          )}
        </>
      )}

      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
