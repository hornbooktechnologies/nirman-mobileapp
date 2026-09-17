"use client";

import { useCallback, useEffect } from "react";

// Used by Calendar and Attendance forms without changing global navigation behavior.
export function useUnsavedAttendanceForm(dirty: boolean) {
  const confirmDiscard = useCallback(() => !dirty || window.confirm("Discard your unsaved changes?"), [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const followLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!confirmDiscard()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", followLink, true); };
  }, [dirty, confirmDiscard]);
  return confirmDiscard;
}
