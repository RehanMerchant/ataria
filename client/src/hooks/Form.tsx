import React, { createContext, useContext } from 'react';
import type { FormContextType } from './useForm';

// Use 'any' internally for the Context, but enforce strict types via the Hook
const FormContext = createContext<FormContextType<any> | null>(null);

export function useFormContext<T extends Record<string, any>>() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("Form components must be used within a <Form> provider");
  }
  return context as FormContextType<T>;
}

interface FormProps<T extends Record<string, any>> {
  form: FormContextType<T>;
  onSubmit: (values: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function Form<T extends Record<string, any>>({ form, onSubmit, children, className }: FormProps<T>) {
  return (
    <FormContext.Provider value={form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormContext.Provider>
  );
}