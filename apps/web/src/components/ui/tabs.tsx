import { type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-hairline bg-surface/60 p-1 shadow-pill", className)} role="tablist" {...props}>
      {children}
    </div>
  );
}

export interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function TabButton({ active = false, className, type = "button", ...props }: TabButtonProps) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-4 text-[13px] font-semibold text-sub transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/35",
        active && "bg-lime text-lime-ink shadow-copper",
        className,
      )}
      {...props}
    />
  );
}
