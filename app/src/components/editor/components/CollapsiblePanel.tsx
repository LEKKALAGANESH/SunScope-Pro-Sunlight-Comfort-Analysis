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
    <div className="card-editor-hover overflow-hidden">
      {/* Header - Always visible with gradient accent */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-all duration-200 ${
          !isCollapsed ? 'bg-gradient-to-r from-blue-50/50 to-transparent border-b border-blue-100' : 'hover:bg-blue-50/30'
        }`}
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{title}</h4>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
          !isCollapsed ? 'bg-blue-100 rotate-180' : 'bg-gray-100'
        }`}>
          <svg
            className={`w-4 h-4 transition-colors duration-200 ${!isCollapsed ? 'text-blue-600' : 'text-gray-500'}`}
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
        </div>
      </button>

      {/* Content - Collapsible with smooth animation */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isCollapsed ? 0 : contentHeight,
          opacity: isCollapsed ? 0 : 1,
          transform: isCollapsed ? 'translateY(-8px)' : 'translateY(0)',
        }}
      >
        <div ref={contentRef} className="p-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
