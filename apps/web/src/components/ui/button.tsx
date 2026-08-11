import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "dark"
  | "lime"
  | "outline"
  | "ghost"
  | "success"
  | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  // "New Project", "New Organization" — copper fill, white text
  primary:
    "bg-lime text-lime-ink shadow-copper hover:bg-lime-sub active:bg-lime-sub border border-transparent",
  // Same as primary — alias kept for compat
  lime: "bg-lime text-lime-ink shadow-copper hover:bg-lime-sub border border-transparent",
  // Neutral secondary action — slate surface with clean border
  default:
    "bg-ink/6 text-body border border-hairline hover:bg-ink/10 hover:border-hairline/80 shadow-pill",
  secondary:
    "bg-ink/6 text-body border border-hairline hover:bg-ink/10 hover:border-hairline/80 shadow-pill",
  // Dark fill for prominent secondary CTAs
  dark: "bg-ink text-surface hover:bg-body border border-transparent",
  // Outlined — used for cancel/secondary beside a primary
  outline:
    "border border-hairline bg-surface text-body hover:bg-sunken/80 shadow-pill",
  // Ghost — inline text actions, no visible fill
  ghost:
    "bg-transparent text-sub hover:bg-sunken/70 hover:text-body border border-transparent",
  success:
    "bg-success text-surface border border-transparent shadow-pill hover:brightness-110",
  danger:
    "bg-danger text-surface border border-transparent shadow-pill hover:brightness-110",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

const buttonSizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-8 px-3 py-1.5 text-[12px] font-semibold rounded-sub gap-1.5",
  md: "min-h-9 px-3.5 py-2 text-[12px] font-semibold rounded-inner gap-2 sm:px-4",
  lg: "min-h-10 px-5 py-2.5 text-[13px] font-semibold rounded-inner-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "md", variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center text-center capitalize leading-5 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
