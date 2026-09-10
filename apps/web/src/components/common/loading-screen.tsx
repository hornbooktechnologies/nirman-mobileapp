"use client";

import { Card, LottieLoader } from "@/components/ui";
import { cn } from "@/lib/utils";

type LoadingScreenProps = {
  className?: string;
  message?: string;
};

export function LoadingScreen({ className, message = "Loading" }: LoadingScreenProps) {
  return (
    <Card
      aria-busy="true"
      aria-live="polite"
      className={cn("grid min-h-64 place-items-center", className)}
      role="status"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <LottieLoader className="size-40 sm:size-44" />
        <p className="text-[13px] font-semibold text-sub">{message}</p>
      </div>
    </Card>
  );
}
