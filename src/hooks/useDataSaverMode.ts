import { useEffect, useState } from "react";

const KEY = "skilllink:data-saver";

function detectInitial(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(KEY);
  if (stored !== null) return stored === "1";
  // Honor browser Save-Data hint and slow connections
  const conn = (navigator as any).connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return true;
  return false;
}

export function useDataSaverMode() {
  const [enabled, setEnabled] = useState<boolean>(detectInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("data-saver", enabled);
    localStorage.setItem(KEY, enabled ? "1" : "0");
  }, [enabled]);

  return { enabled, setEnabled, toggle: () => setEnabled((v) => !v) };
}
