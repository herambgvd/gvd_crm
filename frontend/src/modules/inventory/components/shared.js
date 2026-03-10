/**
 * Inventory Module Shared Components
 * Reusable UI components for the inventory module
 */

import React, { memo, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageX,
  AlertCircle,
} from "lucide-react";

// ─── Loading State ─────────────────────────────────
export const LoadingState = memo(
  ({ message = "Loading...", className = "" }) => (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  ),
);

LoadingState.displayName = "LoadingState";

// ─── Empty State ─────────────────────────────────
export const EmptyState = memo(
  ({
    icon: Icon = PackageX,
    title = "No data found",
    description = "Try adjusting your filters or search criteria",
    action,
    actionLabel,
    className = "",
  }) => (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm">{description}</p>
      {action && actionLabel && (
        <Button onClick={action} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  ),
);

EmptyState.displayName = "EmptyState";

// ─── Error State ─────────────────────────────────
export const ErrorState = memo(
  ({ error, title = "Error loading data", onRetry, className = "" }) => (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        {error?.message || "An unexpected error occurred"}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          Try Again
        </Button>
      )}
    </div>
  ),
);

ErrorState.displayName = "ErrorState";

// ─── Pagination ─────────────────────────────────
export const Pagination = memo(
  ({
    currentPage,
    totalPages,
    onPageChange,
    showPageInfo = true,
    className = "",
  }) => {
    const handlePrevious = useCallback(() => {
      if (currentPage > 1) onPageChange(currentPage - 1);
    }, [currentPage, onPageChange]);

    const handleNext = useCallback(() => {
      if (currentPage < totalPages) onPageChange(currentPage + 1);
    }, [currentPage, totalPages, onPageChange]);

    if (totalPages <= 1) return null;

    return (
      <div
        className={`flex items-center justify-between p-4 border-t ${className}`}
      >
        {showPageInfo && (
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  },
);

Pagination.displayName = "Pagination";

// ─── Status Badge ─────────────────────────────────
export const StatusBadge = memo(({ status, statusMap }) => {
  const config = statusMap[status] || { label: status, variant: "secondary" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
});

StatusBadge.displayName = "StatusBadge";

// ─── Stat Card ─────────────────────────────────
export const StatCard = memo(
  ({
    title,
    value,
    icon: Icon,
    description,
    color = "blue",
    onClick,
    loading = false,
  }) => (
    <Card
      className={`${onClick ? "cursor-pointer hover:shadow-lg hover:border-primary" : ""} transition-shadow`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          {Icon && (
            <div className={`p-2 rounded-full bg-${color}-100`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
            </div>
          )}
        </div>
        <div className="text-2xl font-bold">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  ),
);

StatCard.displayName = "StatCard";

// ─── Action Button ─────────────────────────────────
export const ActionButton = memo(
  ({
    icon: Icon,
    label,
    onClick,
    variant = "ghost",
    destructive = false,
    disabled = false,
    loading = false,
    className = "",
  }) => (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${destructive ? "text-destructive hover:text-destructive" : ""} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : Icon ? (
        <Icon className="h-4 w-4 mr-2" />
      ) : null}
      {label}
    </Button>
  ),
);

ActionButton.displayName = "ActionButton";

// ─── Table Loading Row ─────────────────────────────────
export const TableLoadingRow = memo(({ colSpan = 8 }) => (
  <tr>
    <td colSpan={colSpan} className="text-center p-8">
      <LoadingState />
    </td>
  </tr>
));

TableLoadingRow.displayName = "TableLoadingRow";

// ─── Table Empty Row ─────────────────────────────────
export const TableEmptyRow = memo(
  ({ colSpan = 8, message = "No records found" }) => (
    <tr>
      <td colSpan={colSpan} className="text-center p-8 text-muted-foreground">
        {message}
      </td>
    </tr>
  ),
);

TableEmptyRow.displayName = "TableEmptyRow";

// ─── Confirm Dialog (for delete operations) ─────────────────────────────────
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
