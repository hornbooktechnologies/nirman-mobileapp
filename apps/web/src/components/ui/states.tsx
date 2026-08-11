import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <Card className={cn("grid place-items-center px-6 py-10 text-center border-dashed border-hairline/80 bg-sunken/30", className)}>
      <div className="max-w-sm">
        <h3 className="text-[17px] font-semibold text-body">{title}</h3>
        {description ? <p className="mt-1.5 text-[13px] leading-5 text-sub">{description}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </Card>
  );
}

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-28 items-center justify-center gap-2.5 rounded-inner bg-sunken/55 px-4 py-6 text-[13px] font-semibold text-sub animate-fade-in-up", className)}>
      <Loader2 className="size-4 animate-spin text-lime" />
      {label}
    </div>
  );
}

export function ConfirmDialogActions({ cancelLabel = "Cancel", confirmLabel = "Confirm", onCancel, confirmProps }: { cancelLabel?: string; confirmLabel?: string; onCancel: () => void; confirmProps?: ButtonProps }) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
      <Button variant="danger" {...confirmProps}>{confirmLabel}</Button>
    </div>
  );
}
