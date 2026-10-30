"use client";
import { createContext, useContext } from "react";

export type FieldRegistration = {
  validate: () => boolean;
  revalidate: () => void;
  reset: () => void;
  element: () => HTMLLabelElement | null;
};
export type FieldMessage = { errorId: string; message: string };
export const ValidationContext = createContext<{
  fields: Set<FieldRegistration>;
  messages: Record<string, FieldMessage | undefined>;
  setMessage: (id: string, error?: FieldMessage) => void;
} | null>(null);

/** Connect controls whose labels are separate siblings through their existing IDs. */
export function useNativeFieldError(id?: string) {
  const context = useContext(ValidationContext);
  return id ? context?.messages[id] : undefined;
}
