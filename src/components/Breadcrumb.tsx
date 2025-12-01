'use client';

import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export default function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  const hasParent = items.length > 1;
  const parentId = hasParent && items.length >= 2 ? items[items.length - 2].id : null;

  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {/* Mobile Back Button */}
      {hasParent && (
        <button
          onClick={() => onNavigate(parentId)}
          className="lg:hidden flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0 touch-target"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      )}

      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0 touch-target"
      >
        <Home size={16} />
        <span>Drive</span>
      </button>

      {items.slice(1).map((item, index) => {
        const isLast = index === items.length - 2;

        return (
          <div key={item.id || `item-${index}`} className="flex items-center gap-2 flex-shrink-0">
            <ChevronRight size={16} className="text-zinc-500" />
            {isLast ? (
              <span className="px-3 py-1.5 text-sm font-semibold text-zinc-50 bg-zinc-800 rounded-lg">
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="px-3 py-1.5 text-sm font-medium text-zinc-200 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors touch-target"
              >
                {item.name}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
