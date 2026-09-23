import { ArrowLeft } from "lucide-react";
import { type HTMLAttributes, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Description, Heading, SectionTitle } from "@/components/ui/typography";
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-[min(100%,20rem)] items-center gap-3">
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
            <Heading>{title}</Heading>
            {description ? <Description className="mt-1 max-w-3xl">{description}</Description> : null}
          </div>
        </div>
        {actions ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 [&>*]:min-w-0 [&>*]:max-w-full">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeader({ title, description, actions, className }: { title: string; description?: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center justify-between gap-3", className)}>
      <div className="min-w-0 flex-1 basis-[min(100%,16rem)]">
        <SectionTitle>{title}</SectionTitle>
        {description ? <Description className="mt-0.5">{description}</Description> : null}
      </div>
      {actions ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
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
