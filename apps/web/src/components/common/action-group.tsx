import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ActionGroupProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "between";
  mobile?: "wrap" | "stack";
}

const alignClasses: Record<NonNullable<ActionGroupProps["align"]>, string> = {
  start: "sm:justify-start",
  end: "sm:justify-end",
  between: "sm:justify-between",
};

const mobileClasses: Record<NonNullable<ActionGroupProps["mobile"]>, string> = {
  wrap: "flex-row flex-wrap",
  stack: "flex-col sm:flex-row",
};

export const ActionGroup = forwardRef<HTMLDivElement, ActionGroupProps>(
  (
    {
      align = "end",
      children,
      className,
      mobile = "wrap",
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 gap-3 [&>*]:max-w-full",
        mobileClasses[mobile],
        alignClasses[align],
        mobile === "stack" && "[&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

ActionGroup.displayName = "ActionGroup";
