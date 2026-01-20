import { useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
  badge?: string | number;
  className?: string;
}

export function CollapsibleSection({
  title,
  defaultCollapsed = true,
  children,
  badge,
  className = '',
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`card-viewer-hover overflow-hidden ${className}`}>
      {/* Header - Always visible with gradient accent */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-between p-4 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-inset transition-all duration-200 ${
          !isCollapsed ? 'bg-gradient-to-r from-sky-50/50 to-transparent border-b border-sky-100' : 'hover:bg-sky-50/30'
        }`}
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{title}</h3>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
          !isCollapsed ? 'bg-sky-100 rotate-180' : 'bg-gray-100'
        }`}>
          <svg
            className={`w-4 h-4 transition-colors duration-200 ${!isCollapsed ? 'text-sky-600' : 'text-gray-500'}`}
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
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
        style={{
          transform: isCollapsed ? 'translateY(-8px)' : 'translateY(0)',
        }}
      >
        <div className="p-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
