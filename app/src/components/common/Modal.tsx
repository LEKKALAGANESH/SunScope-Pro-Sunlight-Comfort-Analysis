import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from './FocusTrap';

export type ModalTheme = 'amber' | 'orange' | 'emerald' | 'blue' | 'sky' | 'rose' | 'neutral';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  theme?: ModalTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

const themeConfig: Record<ModalTheme, { headerBg: string; iconBg: string }> = {
  amber: {
    headerBg: 'bg-gradient-to-r from-amber-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
  },
  orange: {
    headerBg: 'bg-gradient-to-r from-orange-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
  },
  emerald: {
    headerBg: 'bg-gradient-to-r from-emerald-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  },
  blue: {
    headerBg: 'bg-gradient-to-r from-blue-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  sky: {
    headerBg: 'bg-gradient-to-r from-sky-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-sky-400 to-sky-600',
  },
  rose: {
    headerBg: 'bg-gradient-to-r from-rose-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-rose-400 to-rose-600',
  },
  neutral: {
    headerBg: 'bg-gradient-to-r from-gray-50 to-transparent',
    iconBg: 'bg-gradient-to-br from-gray-400 to-gray-600',
  },
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  theme = 'amber',
  size = 'lg',
  closeOnBackdrop = true,
  showCloseButton = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { headerBg, iconBg } = themeConfig[theme];

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use React Portal to render modal directly to document.body
  // This ensures modal appears above all other content regardless of stacking contexts
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      role="presentation"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          ref={dialogRef}
          className={`
            relative bg-white/95 backdrop-blur-xl rounded-2xl ${sizeClasses[size]} w-full
            shadow-2xl border border-gray-200/60 animate-scale-in overflow-hidden
            max-h-[90vh] flex flex-col
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b border-gray-200/60 ${headerBg} flex-shrink-0`}>
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shadow-md text-white`}>
                  {icon}
                </div>
              )}
              <h2 id="modal-title" className="text-xl font-bold text-gray-900">{title}</h2>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-gray-200/60 bg-gray-50/50 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}

// Convenience component for modal actions
interface ModalActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function ModalActions({ children, align = 'right' }: ModalActionsProps) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }[align];

  return (
    <div className={`flex gap-3 ${alignClass}`}>
      {children}
    </div>
  );
}
