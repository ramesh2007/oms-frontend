import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/hooks/useOrders";

interface PaginationControlsProps {
  pagination?: PaginationMeta;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  pagination,
  currentPage,
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  if (!pagination || pagination.total === 0) return null;

  const totalPages = pagination.last_page || 1;
  const hasPrev = currentPage > 1 && (pagination.prev_page_url !== null || currentPage > 1);
  const hasNext = (pagination.has_more_pages !== undefined ? pagination.has_more_pages : currentPage < totalPages) && currentPage < totalPages;

  // Generate page numbers range for quick jump
  const pages: number[] = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const fromItem = pagination.from ?? (currentPage - 1) * (pagination.per_page || 15) + 1;
  const toItem = pagination.to ?? Math.min(currentPage * (pagination.per_page || 15), pagination.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs text-xs sm:text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-foreground">{fromItem}</span> to{" "}
          <span className="font-semibold text-foreground">{toItem}</span> of{" "}
          <span className="font-semibold text-foreground">{pagination.total}</span> orders
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev || isLoading}
          className="h-8 gap-1 px-2.5 text-xs font-medium cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              className={`h-8 w-8 p-0 text-xs font-semibold cursor-pointer ${
                p === currentPage ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-foreground"
              }`}
            >
              {p}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext || isLoading}
          className="h-8 gap-1 px-2.5 text-xs font-medium cursor-pointer"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
