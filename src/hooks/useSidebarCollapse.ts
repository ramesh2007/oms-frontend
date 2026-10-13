import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "halamama_sidebar_collapsed";

// Single in-memory state initialized once from localStorage
let currentCollapsed: boolean = (() => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
})();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("[useSidebarCollapse] listener error:", e);
    }
  });
}

export function setSidebarCollapsed(value: boolean | ((prev: boolean) => boolean)) {
  const next = typeof value === "function" ? value(currentCollapsed) : value;
  if (next === currentCollapsed) return;
  currentCollapsed = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {}
  notify();
}

export function toggleSidebarCollapsed() {
  setSidebarCollapsed((prev) => !prev);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return currentCollapsed;
}

function getServerSnapshot() {
  return false;
}

// Sync across browser tabs if localStorage changes in another tab
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const next = e.newValue === "true";
      if (next !== currentCollapsed) {
        currentCollapsed = next;
        notify();
      }
    }
  });
}

export function useSidebarCollapse() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCollapsed = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsed(value);
  }, []);

  const toggle = useCallback(() => {
    toggleSidebarCollapsed();
  }, []);

  // Global keyboard shortcut: Cmd+B / Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { collapsed, setCollapsed, toggle };
}
