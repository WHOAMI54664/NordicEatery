"use client";
import { useCallback, useEffect, useState } from "react";
import {
  isGroupAvailability,
  type GroupAvailability,
} from "@/lib/group-orders/slots";

export function useGroupAvailability(enabled = true) {
  const [availability, setAvailability] = useState<GroupAvailability | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback((next?: GroupAvailability) => {
    if (next) setAvailability(next);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    async function load() {
      if (stopped || controller) return;
      clearTimeout(timer);
      if (!document.hidden) {
        controller = new AbortController();
        try {
          const response = await fetch("/api/group-orders/availability", {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(10000),
            ]),
          });
          if (!response.ok) throw new Error("unavailable");
          const next: unknown = await response.json();
          if (!isGroupAvailability(next)) throw new Error("unavailable");
          if (!stopped) {
            setAvailability(next);
            setFailed(false);
          }
        } catch {
          if (!stopped) setFailed(true);
        } finally {
          controller = null;
        }
      }
      if (!stopped) timer = setTimeout(load, 10000);
    }
    void load();
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled, revision]);
  return { availability, failed, refresh };
}
