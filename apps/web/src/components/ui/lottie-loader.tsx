"use client";

import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import loaderAnimation from "../../../public/animations/NirmanSite_Theme_Real_Estate_Loader.json";

// Configure before any player mounts; loading UI must not depend on a CDN.
setWasmUrl("/animations/dotlottie-player.wasm");

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
      data={loaderAnimation}
    />
  );
}
