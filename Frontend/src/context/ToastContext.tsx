import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  error: 7000,
};

const STYLES: Record<ToastType, { container: string; icon: string }> = {
  success: { container: 'bg-success text-white', icon: 'check_circle' },
  error: { container: 'bg-error-container text-on-error-container border border-error/20', icon: 'error' },
  info: { container: 'bg-primary-fixed text-on-primary-fixed-variant', icon: 'info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, action?: ToastAction) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message, action }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS[type]);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
        {toasts.map((toast) => {
          const style = STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className={`rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 ${style.container}`}
            >
              <span className="material-symbols-outlined text-[20px] mt-0.5">{style.icon}</span>
              <p className="font-body-md text-body-md flex-1">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="font-label-md text-label-md underline shrink-0"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(toast.id)}
                className="material-symbols-outlined text-[18px] shrink-0 opacity-70 hover:opacity-100"
              >
                close
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
