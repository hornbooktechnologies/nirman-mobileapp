"use client";
import { useState } from "react";
import { refreshTogether } from "@nirman-app/shared";
import { RefreshButton } from "../refresh-button";

// Development-only controlled reads exercise busy/error/duplicate-tap behavior.
export function RefreshPreview() {
  const [requests, setRequests] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState(0);
  const read = (delay: number, fail = false) => new Promise<void>((resolve, reject) => {
    setTimeout(() => { if (fail) reject(new Error("Fixture read failed")); else resolve(); }, delay);
  });
  const refresh = async (fail = false) => {
    setRequests(count => count + 1);
    try { await refreshTogether([read(100, fail), read(700)]); setCompleted(count => count + 1); }
    catch { setErrors(count => count + 1); }
  };
  return <section aria-label="Refresh fixture" className="space-y-3">
    <output data-refresh-counts>{requests} requests; {completed} completed; {errors} errors</output>
    <div className="flex gap-3">
      <RefreshButton variant="outline" onRefresh={() => refresh()}>Test refresh success</RefreshButton>
      <RefreshButton variant="outline" onRefresh={() => refresh(true)}>Test refresh failure</RefreshButton>
    </div>
  </section>;
}
