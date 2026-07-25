import React from 'react';
import { useFormContext } from '../../hooks/Form';

// --- FormField ---
interface FormFieldProps<T extends Record<string, any>> {
  name: keyof T;
  label?: string;
  children: React.ReactNode;
}

export function FormField<T extends Record<string, any>>({ name, label, children }: FormFieldProps<T>) {
  const { errors, touched } = useFormContext<T>();
  const error = touched[name] && errors[name];

  return (
    <div className="flex flex-col gap-1 mb-4">
      {label && (
        <label htmlFor={name as string} className="text-sm font-medium">
          {label}
        </label>
      )}
      
      {children}
      
      {error && <span className="text-sm text-red-500">{error as string}</span>}
    </div>
  );
}

// --- Input ---
// Omit standard React input props that we are controlling manually to avoid TS conflicts
interface InputProps<T extends Record<string, any>> 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'onBlur'> {
  name: keyof T;
}

export function FormInput<T extends Record<string, any>>({ 
  name, 
  type = "text", 
  className, 
  ...props 
}: InputProps<T>) {
  const { values, handleChange, handleBlur, errors, touched } = useFormContext<T>();
  const hasError = touched[name] && errors[name];

  return (
    <input
      id={name as string}
      name={name as string}
      type={type}
      value={values[name] || ''}
      onChange={(e) => handleChange(name, e.target.value)}
      onBlur={() => handleBlur(name)}
      className={`border p-2 rounded-md transition-colors ${
        hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-300 focus:outline-blue-500'
      } ${className || ''}`}
      {...props}
    />
  );
}