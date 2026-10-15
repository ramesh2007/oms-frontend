import { useRef, useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { LEGACY_TABS, type LegacyTabId, type LegacyTab } from "@/lib/orders";
import { cn } from "@/lib/utils";

export function OrdersTabs({
  activeTab,
  onTabChange,
  tabCounts,
  searchActive = false,
  searchTabCounts,
}: {
  activeTab: LegacyTabId;
  onTabChange: (tab: LegacyTabId) => void;
  tabCounts: Record<LegacyTabId, number>;
  searchActive?: boolean;
  searchTabCounts?: Record<LegacyTabId, number> | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Scroll to active tab on mount / tab change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetLeft - 12;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeTab]);

  // Handle native wheel event to convert vertical scroll to horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll-fast multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        "scrollbar-none flex items-center gap-1 overflow-x-auto py-1 px-4 sm:px-0",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      role="tablist"
      aria-label="Order status filters"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {LEGACY_TABS.reduce<React.ReactNode[]>((acc, tab) => {
        const EXCLUDED_TABS = ["Returns & Replacements", "Replacement", "Exchange", "Delivery Failed"];
        
        // Skip these as they are now in the sidebar After-Sales Operations group
        if (EXCLUDED_TABS.includes(tab.id)) {
          return acc;
        }

        const isActive = activeTab === tab.id;
        const totalCount = tabCounts[tab.id] ?? 0;
        const searchCount = searchTabCounts ? (searchTabCounts[tab.id] ?? 0) : null;
        const hasSearchMatch = searchActive && searchCount !== null && searchCount > 0;
        const hasZeroSearchMatch = searchActive && searchCount !== null && searchCount === 0;

        const count = searchActive && searchCount !== null ? searchCount : totalCount;

        const TabButton = (
          <button
            key={tab.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={(e) => {
              // Prevent click action if user was dragging
              if (isDragging && Math.abs(scrollRef.current!.scrollLeft - scrollLeft) > 5) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onTabChange(tab.id);
            }}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : hasSearchMatch
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 ring-1 ring-emerald-500/20"
                  : hasZeroSearchMatch
                    ? "text-muted-foreground/50 hover:bg-muted hover:text-foreground opacity-60"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span className="absolute -top-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary-foreground/60" />
            )}
            {tab.id === "Express" && (
              <Zap
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                  isActive
                    ? "fill-primary-foreground text-primary-foreground"
                    : "fill-amber-500 text-amber-500",
                )}
                aria-hidden
              />
            )}
            <span>{tab.label}</span>
            <span
              className={cn(
                "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums leading-none transition-all",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : hasSearchMatch
                    ? "bg-emerald-600 text-white font-extrabold shadow-xs"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </button>
        );

        acc.push(TabButton);

        return acc;
      }, [])}
    </div>
  );
}
