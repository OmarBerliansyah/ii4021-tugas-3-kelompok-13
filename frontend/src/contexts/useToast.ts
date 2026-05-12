import { useContext } from 'react';
import { ToastContext } from './toast-context';
import type { ToastContextType } from './toast-context';

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
};
