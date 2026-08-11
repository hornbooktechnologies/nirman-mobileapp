import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Heading = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "min-w-0 break-words text-[30px] font-medium leading-[1.05] tracking-normal text-body sm:text-[36px] lg:text-[44px]",
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
      "min-w-0 break-words text-[17px] font-semibold leading-6 tracking-normal text-ink sm:text-[19px] sm:leading-7",
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
      "min-w-0 break-words text-[14px] leading-6 text-sub sm:text-[15px]",
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
      "min-w-0 break-words text-[11px] font-semibold uppercase leading-4 tracking-[1.1px] text-muted",
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
