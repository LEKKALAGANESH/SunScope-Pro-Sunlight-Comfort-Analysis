import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { ErrorSeverity, type AppError } from '../../utils/errors';

// Toast item interface
interface ToastItem {
  id: string;
  message: string;
  severity: ErrorSeverity;
  recoveryAction?: string;
  duration: number;
}

// Toast context interface
interface ToastContextType {
  showToast: (
    message: string,
    severity?: ErrorSeverity,
    options?: { recoveryAction?: string; duration?: number }
  ) => void;
  showError: (error: AppError) => void;
  dismissToast: (id: string) => void;
}

// Create context
const ToastContext = createContext<ToastContextType | null>(null);

// Default durations by severity (ms)
const DEFAULT_DURATIONS: Record<ErrorSeverity, number> = {
  [ErrorSeverity.INFO]: 3000,
  [ErrorSeverity.WARNING]: 5000,
  [ErrorSeverity.ERROR]: 7000,
  [ErrorSeverity.CRITICAL]: 0, // Don't auto-dismiss critical errors
};

// Severity colors and icons
const SEVERITY_STYLES: Record<
  ErrorSeverity,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  [ErrorSeverity.INFO]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-blue-500',
  },
  [ErrorSeverity.WARNING]: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    iconColor: 'text-amber-500',
  },
  [ErrorSeverity.ERROR]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-red-500',
  },
  [ErrorSeverity.CRITICAL]: {
    bg: 'bg-red-100',
    border: 'border-red-300',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-red-600',
  },
};

// Generate unique ID
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Individual Toast component
function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = SEVERITY_STYLES[item.severity];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, onDismiss]);

  useEffect(() => {
    if (item.duration > 0) {
      const timer = setTimeout(handleDismiss, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.duration, handleDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md w-full
        ${styles.bg} ${styles.border}
        transform transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {/* Icon */}
      <svg
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={styles.icon}
        />
      </svg>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{item.message}</p>
        {item.recoveryAction && (
          <p className="mt-1 text-xs text-gray-600">{item.recoveryAction}</p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// Toast container component
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[200] flex flex-col gap-3"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} item={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Toast Provider component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (
      message: string,
      severity: ErrorSeverity = ErrorSeverity.INFO,
      options?: { recoveryAction?: string; duration?: number }
    ) => {
      const id = generateId();
      const duration = options?.duration ?? DEFAULT_DURATIONS[severity];

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          severity,
          recoveryAction: options?.recoveryAction,
          duration,
        },
      ]);
    },
    []
  );

  const showError = useCallback(
    (error: AppError) => {
      showToast(error.userMessage, error.severity, {
        recoveryAction: error.recoveryAction,
      });
    },
    [showToast]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    showError,
    dismissToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast context
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience hooks for common operations
export function useShowError() {
  const { showError } = useToast();
  return showError;
}

export function useShowToast() {
  const { showToast } = useToast();
  return showToast;
}
