import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "compact" | "default";
  variant?: "default" | "surface" | "sunken" | "lime";
}

const cardVariants: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "border border-hairline bg-surface text-body shadow-card",
  surface: "border border-hairline/80 bg-surface text-body shadow-card",
  sunken: "border border-hairline/40 bg-sunken/60 text-body",
  lime: "border border-lime/20 bg-lime text-lime-ink shadow-copper",
};

const cardPadding: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  compact: "p-4 sm:p-5",
  default: "p-5 sm:p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = "default", variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "min-w-0 overflow-hidden rounded-card break-words transition-all duration-150",
        cardVariants[variant],
        cardPadding[padding],
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mb-4 flex min-w-0 flex-col gap-1 sm:mb-5", className)}
      {...props}
    />
  ),
);

CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
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

CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("min-w-0 break-words text-[13px] leading-5 text-sub", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("min-w-0 break-words text-[13px] sm:text-[13.5px]", className)}
      {...props}
    />
  ),
);

CardContent.displayName = "CardContent";
