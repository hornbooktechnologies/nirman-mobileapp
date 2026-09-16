"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";
import { Input, type InputProps } from "./input";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showPasswordLabel = "Show password",
      hidePasswordLabel = "Hide password",
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? hidePasswordLabel : showPasswordLabel;

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn("pr-11", className)}
          type={visible ? "text" : "password"}
          {...props}
        />
        <IconButton
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          className="absolute right-1 top-1/2 -translate-y-1/2"
          size="sm"
          variant="ghost"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </IconButton>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
