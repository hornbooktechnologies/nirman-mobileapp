"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LottieLoader({ className }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  return (
    <DotLottieReact
      aria-hidden="true"
      autoplay={!reducedMotion}
      className={cn("size-8", className)}
      loop={!reducedMotion}
      src="/animations/NirmanSite_Theme_Real_Estate_Loader.json"
    />
  );
}
