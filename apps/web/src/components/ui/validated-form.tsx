"use client";

import {
  Children, cloneElement, forwardRef, isValidElement, useCallback, useContext, useEffect, useId,
  useRef, useState, type FormHTMLAttributes, type LabelHTMLAttributes, type ReactNode,
} from "react";
import { constraintError } from "@/lib/forms/constraint-error";
import { cn } from "@/lib/utils";
import { ValidationContext, type FieldRegistration, type FieldMessage } from "@/lib/forms/validation-context";

/** Adapter for existing controlled forms: business validation stays in their submit handlers. */
export const ValidatedForm = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(
  function ValidatedForm({ children, onSubmit, onReset, onBlurCapture, onChangeCapture, ...props }, ref) {
    const [fields] = useState(() => new Set<FieldRegistration>());
    const [messages, setMessages] = useState<Record<string, FieldMessage | undefined>>({});
    const setMessage = useCallback((id: string, error?: FieldMessage) => {
      setMessages((current) => current[id]?.message === error?.message && current[id]?.errorId === error?.errorId ? current : { ...current, [id]: error });
    }, []);
    return <ValidationContext.Provider value={{ fields, messages, setMessage }}>
      <form {...props} ref={ref} noValidate onBlurCapture={(event) => {
        fields.forEach((field) => { if (field.element()?.control === event.target) field.validate(); });
        onBlurCapture?.(event);
      }} onChangeCapture={(event) => {
        fields.forEach((field) => { if (field.element()?.control === event.target) field.revalidate(); });
        onChangeCapture?.(event);
      }} onReset={(event) => {
        fields.forEach((field) => field.reset());
        onReset?.(event);
      }} onSubmit={(event) => {
        const invalid = [...fields].filter((field) => !field.validate());
        if (invalid.length) {
          event.preventDefault();
          const nodes = invalid.map((field) => field.element()).filter((node): node is HTMLLabelElement => Boolean(node));
          nodes.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1);
          const first = nodes[0]?.control ?? nodes[0]?.querySelector<HTMLElement>('input,select,textarea,button');
          first?.focus();
          first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          return;
        }
        onSubmit?.(event);
      }}>{children}</form>
    </ValidationContext.Provider>;
  },
);

function hasRequiredChild(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<{ required?: boolean; disabled?: boolean; children?: ReactNode }>(child)) return false;
    return Boolean(child.props.required) || hasRequiredChild(child.props.children);
  });
}

function labelText(children: ReactNode): string {
  for (const child of Children.toArray(children)) {
    if (typeof child === "string" && child.trim()) return child.replace(/\*/g, "").trim();
    if (isValidElement<{ children?: ReactNode }>(child) && (child.type === "span" || child.type === "strong")) {
      const text = labelText(child.props.children);
      if (text) return text;
    }
  }
  return "This field";
}

/** Retains legacy label layout while supplying accessible inline native-constraint errors. */
export function ValidatedField({ children, className, onBlurCapture, onChangeCapture, validate: validateValue, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { validate?: (value: string) => string | undefined }) {
  const registry = useContext(ValidationContext);
  const root = useRef<HTMLLabelElement>(null);
  const id = useId();
  const visited = useRef(false);
  const [error, setError] = useState<string>();
  const label = labelText(children);
  const required = hasRequiredChild(children);
  const setMessage = registry?.setMessage;
  const htmlFor = props.htmlFor;
  useEffect(() => () => { if (htmlFor) setMessage?.(htmlFor); }, [htmlFor, setMessage]);
  const validate = () => {
    visited.current = true;
    const nested = root.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea");
    const associated = root.current?.control;
    const controls = nested?.length ? [...nested] : associated instanceof HTMLInputElement || associated instanceof HTMLSelectElement || associated instanceof HTMLTextAreaElement ? [associated] : [];
    let message: string | undefined;
    controls?.forEach((control) => {
      message ??= constraintError(control, label);
    });
    if (controls.some((control) => control.willValidate)) message ??= validateValue?.(controls[0]?.value ?? "");
    setError(message);
    if (props.htmlFor) registry?.setMessage(props.htmlFor, message ? { errorId: `${id}-error`, message } : undefined);
    return !message;
  };
  // Register the current closure so dynamic required/conditional controls are always checked.
  useEffect(() => {
    const field = { validate, revalidate: () => { if (visited.current) validate(); }, reset: () => { visited.current = false; setError(undefined); if (props.htmlFor) registry?.setMessage(props.htmlFor); }, element: () => root.current };
    registry?.fields.add(field);
    return () => { registry?.fields.delete(field); };
  });
  type ControlProps = { value?: unknown; required?: boolean; invalid?: boolean; children?: ReactNode; 'aria-describedby'?: string; 'aria-invalid'?: boolean };
  function connect(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (child) => {
      if (!isValidElement<ControlProps>(child)) return child;
      const isControl = 'value' in child.props || 'required' in child.props || ['input', 'select', 'textarea'].includes(String(child.type));
      if (isControl && error) return cloneElement(child, {
        ...(typeof child.type === 'string' ? {} : { invalid: true }),
        'aria-invalid': true,
        'aria-describedby': [child.props['aria-describedby'], `${id}-error`].filter(Boolean).join(' '),
      });
      return child.props.children ? cloneElement(child, { children: connect(child.props.children) }) : child;
    });
  }
  const hasStar = Children.toArray(children).some((child) => typeof child === "string" && child.includes("*"));
  function markLabel(nodes: ReactNode): ReactNode {
    const items = Children.toArray(nodes);
    const first = items.findIndex((child) => (typeof child === "string" && child.replace(/\*/g, "").trim()) ||
      (isValidElement<{ children?: ReactNode }>(child) && (child.type === "span" || child.type === "strong") && labelText(child.props.children) !== "This field"));
    return items.map((child, index) => {
      if (typeof child === "string") {
        const text = child.replace(/\s*\*/g, "");
        if (index !== first) return text;
        return <span key={index}>{text}{required || hasStar ? <span className="text-danger" aria-label="required"> *</span> : null}</span>;
      }
      if (index === first && isValidElement<{ children?: ReactNode }>(child)) return cloneElement(child, { children: markLabel(child.props.children) });
      return child;
    });
  }
  const content = markLabel(children);
  return <label {...props} ref={root} className={cn(className, error && "[&_input]:border-danger [&_select]:border-danger [&_textarea]:border-danger")} onBlurCapture={(event) => {
    onBlurCapture?.(event);
    validate();
  }} onChangeCapture={(event) => {
    onChangeCapture?.(event);
    if (visited.current) validate();
  }}>
    {connect(content)}
    {error ? <span id={`${id}-error`} role="alert" className="block text-sm font-medium text-danger">{error}</span> : null}
  </label>;
}
