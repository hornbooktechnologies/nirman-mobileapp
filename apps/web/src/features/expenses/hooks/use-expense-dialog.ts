"use client";
import { useEffect, useRef } from "react";

/** Keep pending callbacks and unsaved input bound to the mounted user/project workspace. */
export function useExpenseDialog(
  dirty: boolean,
  uncertain: boolean,
  close: () => void,
) {
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const message = uncertain
    ? "The result is uncertain. Closing loses the retry key. Check the expense history before recording again. Leave?"
    : "Discard unsaved expense changes?";
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty && !uncertain) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("a[href]") &&
        (busyRef.current || !window.confirm(message))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, uncertain, message]);
  return {
    busyRef,
    mountedRef,
    requestClose: () => {
      if (
        !busyRef.current &&
        (!(dirty || uncertain) || window.confirm(message))
      )
        close();
    },
  };
}
