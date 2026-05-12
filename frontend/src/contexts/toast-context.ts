import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastInput = {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

export type ToastContextType = {
  pushToast: (toast: ToastInput) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
