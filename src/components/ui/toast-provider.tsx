"use client";

/**
 * Toast provider — mounted once in app/providers.tsx. Exposes `useToast()`,
 * auto-dismisses after 5s, stacks vertically at the top-right corner.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ToastCard } from "./toast";

type Toast = { id: number; message: string };

interface ToastApi {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  // `mounted` flips true after the first commit so the portal target
  // (document.body) is available. Using `useSyncExternalStore` lets us
  // return a stable boolean without violating the React Compiler's
  // "no setState in effect" rule.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message }]);
      // Auto-dismiss
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted
        ? createPortal(
              <div
                aria-live="polite"
                className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end"
              >
                {toasts.map((t) => (
                  <ToastCard
                    key={t.id}
                    message={t.message}
                    onDismiss={() => dismiss(t.id)}
                  />
                ))}
              </div>,
              document.body
            )
          : null}
    </ToastContext.Provider>
  );
}