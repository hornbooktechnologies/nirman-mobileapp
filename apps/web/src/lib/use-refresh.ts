"use client";
import { useState, useSyncExternalStore } from "react";
import { createRefreshGate } from "@nirman-app/shared";

export function useRefresh() {
  const [gate] = useState(createRefreshGate);
  const busy = useSyncExternalStore(gate.subscribe, gate.getSnapshot, () => false);
  return { busy, run: gate.run };
}
