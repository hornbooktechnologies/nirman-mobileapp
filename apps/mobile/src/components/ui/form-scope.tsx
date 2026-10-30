import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ScrollViewInstance } from 'react-native';

export type FormRegistration = { validate: () => boolean; reveal: () => void };
export const FormValidationContext = createContext<Set<FormRegistration> | null>(null);
export const FormScrollContext = createContext<{
  scroll: { current: ScrollViewInstance | null };
  offset: { current: number };
} | null>(null);

/** Each screen/sheet owns its fields; nested sheets cannot validate their parent. */
export function FormScope({ children }: { children: ReactNode }) {
  const [fields] = useState(() => new Set<FormRegistration>());
  return <FormValidationContext.Provider value={fields}>{children}</FormValidationContext.Provider>;
}

export function useValidateForm() {
  const fields = useContext(FormValidationContext);
  return () => {
    const invalid = [...(fields ?? [])].filter((field) => !field.validate());
    invalid[0]?.reveal();
    return invalid.length === 0;
  };
}
