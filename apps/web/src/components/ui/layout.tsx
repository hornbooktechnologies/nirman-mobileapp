import { ArrowLeft } from "lucide-react";
import { type HTMLAttributes, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  onBack,
  className,
}: PageHeaderProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-lime">{eyebrow}</p> : null}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <IconButton
              variant="outline"
              size="sm"
              aria-label="Go back"
              className="shrink-0"
              onClick={onBack}
            >
              <ArrowLeft size={15} strokeWidth={2} />
            </IconButton>
          ) : null}
          <div className="min-w-0">
            <h1 className="break-words text-[22px] font-semibold leading-tight tracking-[-0.01em] text-body sm:text-[26px]">{title}</h1>
            {description ? <p className="mt-1 max-w-3xl text-[13px] leading-5 text-sub">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeader({ title, description, actions, className }: { title: string; description?: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="break-words text-[15px] font-semibold leading-6 text-body sm:text-[16px]">{title}</h2>
        {description ? <p className="mt-0.5 text-[12.5px] leading-5 text-sub">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FormLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-3 sm:grid-cols-2", className)} {...props} />;
}

export function FilterBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-inner border border-hairline/80 bg-sunken/40 p-3 sm:flex-row sm:items-center",
        className,
      )}
      {...props}
    />
  );
}
