import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toast-context';
import type { ToastInput } from './toast-context';
import '../styles/Toast.css';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
};

const DEFAULT_DURATION_MS = 4200;
const MAX_TOASTS = 5;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, message, variant = 'info', durationMs = DEFAULT_DURATION_MS }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setToasts((prev) => {
        const next: ToastItem[] = [{ id, title, message, variant }, ...prev];
        return next.slice(0, MAX_TOASTS);
      });

      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.variant}`} role="status">
            <div className="toast__content">
              <p className="toast__title">{toast.title}</p>
              {toast.message && <p className="toast__message">{toast.message}</p>}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

