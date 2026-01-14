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
    <div className={`card overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between py-1 -my-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{title}</h3>
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
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
        }`}
      >
        <div className="pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
