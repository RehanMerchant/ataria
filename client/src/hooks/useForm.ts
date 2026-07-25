import { useState } from 'react';


export type ValidationErrors<T> = Partial<Record<keyof T, string>>;
export type TouchedFields<T> = Partial<Record<keyof T, boolean>>;

export interface FormContextType<T extends Record<string, any>> {
  values: T;
  errors: ValidationErrors<T>;
  touched: TouchedFields<T>;
  handleChange: (name: keyof T, value: any) => void;
  handleBlur: (name: keyof T) => void;
  handleSubmit: (onSubmit: (values: T) => void) => (e: React.FormEvent<HTMLFormElement>) => void;
}

interface UseFormProps<T extends Record<string, any>> {
  initialValues: T;
  validate?: (values: T) => ValidationErrors<T>;
}

// --- Hook ---
export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
}: UseFormProps<T>): FormContextType<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<TouchedFields<T>>({});

  const handleChange = (name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    if (validate) {
      const formErrors = validate(values);
      setErrors((prev) => ({ ...prev, [name]: formErrors[name] }));
    }
  };

  const handleSubmit = (onSubmit: (values: T) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key as keyof T]: true }),
      {} as TouchedFields<T>
    );
    setTouched(allTouched);

    if (validate) {
      const formErrors = validate(values);
      setErrors(formErrors);

      // Check if any error strings actually exist
      const hasErrors = Object.values(formErrors).some((error) => error !== undefined);
      if (!hasErrors) {
        onSubmit(values);
      }
    } else {
      onSubmit(values);
    }
  };

  return { values, errors, touched, handleChange, handleBlur, handleSubmit };
}