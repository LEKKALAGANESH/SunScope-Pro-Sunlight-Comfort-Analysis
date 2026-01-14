import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

interface CollapsiblePanelProps {
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
  badge?: string | number;
  onToggle?: (isCollapsed: boolean) => void;
}

export function CollapsiblePanel({
  title,
  defaultCollapsed = true,
  children,
  badge,
  onToggle,
}: CollapsiblePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (!isCollapsed) {
            setContentHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isCollapsed]);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onToggle?.(newState);
  };

  return (
    <div className="card overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between py-1 -my-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{title}</h4>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content - Collapsible */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isCollapsed ? 0 : contentHeight,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        <div ref={contentRef} className="pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
