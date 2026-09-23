import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Heading = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "min-w-0 break-words text-[22px] font-semibold leading-tight tracking-[-0.01em] text-body sm:text-[26px]",
      className,
    )}
    {...props}
  />
));

Heading.displayName = "Heading";

export const SectionTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "min-w-0 break-words text-[16px] font-semibold leading-6 tracking-normal text-body sm:text-[18px] sm:leading-7",
      className,
    )}
    {...props}
  />
));

SectionTitle.displayName = "SectionTitle";

export const Description = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "min-w-0 break-words text-[13px] leading-5 text-sub",
      className,
    )}
    {...props}
  />
));

Description.displayName = "Description";

export const FieldLabel = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "min-w-0 break-words text-[13px] font-medium leading-5 text-sub",
      className,
    )}
    {...props}
  />
));

FieldLabel.displayName = "FieldLabel";

export const FieldError = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "min-w-0 break-words text-[12.5px] font-medium leading-5 text-ink",
      className,
    )}
    {...props}
  />
));

FieldError.displayName = "FieldError";
