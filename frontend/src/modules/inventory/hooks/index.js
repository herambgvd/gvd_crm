/**
 * Inventory Module Custom Hooks
 * Reusable hooks for data fetching, filtering, and pagination
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STALE_TIME, PAGINATION, QUERY_KEYS } from "../constants";

// ─── useDebounce ─────────────────────────────────
/**
 * Debounce a value with configurable delay
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds (default: 400)
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// ─── usePagination ─────────────────────────────────
/**
 * Manage pagination state
 * @param {object} options - Configuration options
 * @returns {object} Pagination state and handlers
 */
export const usePagination = (options = {}) => {
  const { initialPage = 1, pageSize = PAGINATION.defaultPageSize } = options;
  const [page, setPage] = useState(initialPage);

  const reset = useCallback(() => setPage(1), []);

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  return {
    page,
    pageSize,
    setPage: goToPage,
    reset,
    nextPage,
    prevPage,
  };
};

// ─── useFilters ─────────────────────────────────
/**
 * Manage filter state with debounced search
 * @param {object} initialFilters - Initial filter values
 * @param {number} debounceDelay - Search debounce delay
 * @returns {object} Filter state and handlers
 */
export const useFilters = (initialFilters = {}, debounceDelay = 400) => {
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search || "");
  const debouncedSearch = useDebounce(searchInput, debounceDelay);

  // Update search in filters when debounced value changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchInput(initialFilters.search || "");
  }, [initialFilters]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
  }, []);

  return {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    resetFilters,
    clearSearch,
    debouncedSearch,
  };
};

// ─── useListQuery ─────────────────────────────────
/**
 * Standardized list query hook with pagination and filters
 * @param {string} queryKey - Query key identifier
 * @param {Function} fetchFn - Fetch function
 * @param {object} filters - Filter parameters
 * @param {object} pagination - Pagination state
 * @param {object} options - Additional query options
 * @returns {object} Query result with computed values
 */
export const useListQuery = (
  queryKey,
  fetchFn,
  filters,
  pagination,
  options = {},
) => {
  const { page, pageSize } = pagination;

  const queryResult = useQuery({
    queryKey: [queryKey, { ...filters, page, pageSize }],
    queryFn: () =>
      fetchFn({
        ...filters,
        page,
        page_size: pageSize,
        // Remove "all" filter values
        ...Object.fromEntries(
          Object.entries(filters).map(([k, v]) => [
            k,
            v === "all" ? undefined : v,
          ]),
        ),
      }),
    staleTime: options.staleTime ?? STALE_TIME.list,
    keepPreviousData: true,
    ...options,
  });

  const items = queryResult.data?.items || [];
  const total = queryResult.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    ...queryResult,
    items,
    total,
    totalPages,
    isEmpty: !queryResult.isLoading && items.length === 0,
  };
};

// ─── useDeleteMutation ─────────────────────────────────
/**
 * Standardized delete mutation hook
 * @param {Function} deleteFn - Delete function
 * @param {string|Array} queryKey - Query key(s) to invalidate
 * @param {object} options - Additional options
 * @returns {object} Mutation result
 */
export const useDeleteMutation = (deleteFn, queryKey, options = {}) => {
  const queryClient = useQueryClient();
  const {
    successMessage = "Deleted successfully",
    errorMessage = "Delete failed",
    onSuccess,
    onError,
    invalidateKeys = [],
  } = options;

  return useMutation({
    mutationFn: deleteFn,
    onSuccess: (data) => {
      // Invalidate primary query key
      const keys = Array.isArray(queryKey) ? queryKey : [queryKey];
      keys.forEach((key) => queryClient.invalidateQueries([key]));

      // Invalidate additional keys
      invalidateKeys.forEach((key) => queryClient.invalidateQueries([key]));

      toast.success(successMessage);
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || errorMessage);
      onError?.(error);
    },
  });
};

// ─── useActionMutation ─────────────────────────────────
/**
 * Standardized action mutation hook (for status changes, etc.)
 * @param {Function} actionFn - Action function
 * @param {string|Array} queryKey - Query key(s) to invalidate
 * @param {object} options - Additional options
 * @returns {object} Mutation result
 */
export const useActionMutation = (actionFn, queryKey, options = {}) => {
  const queryClient = useQueryClient();
  const {
    successMessage = "Action completed",
    errorMessage = "Action failed",
    onSuccess,
    onError,
    invalidateKeys = [],
  } = options;

  return useMutation({
    mutationFn: actionFn,
    onSuccess: (data) => {
      // Invalidate primary query key
      const primaryKeys = Array.isArray(queryKey) ? queryKey : [queryKey];
      primaryKeys.forEach((key) => queryClient.invalidateQueries([key]));

      // Invalidate additional keys
      invalidateKeys.forEach((key) => queryClient.invalidateQueries([key]));

      toast.success(successMessage);
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || errorMessage);
      onError?.(error);
    },
  });
};

// ─── useFormMutation ─────────────────────────────────
/**
 * Standardized form submit mutation hook
 * @param {Function} submitFn - Submit function
 * @param {object} options - Additional options
 * @returns {object} Mutation result
 */
export const useFormMutation = (submitFn, options = {}) => {
  const queryClient = useQueryClient();
  const {
    successMessage = "Saved successfully",
    errorMessage = "Save failed",
    invalidateKeys = [],
    onSuccess,
    onError,
  } = options;

  return useMutation({
    mutationFn: submitFn,
    onSuccess: (data) => {
      // Invalidate specified keys
      invalidateKeys.forEach((key) => queryClient.invalidateQueries([key]));

      toast.success(successMessage);
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || errorMessage);
      onError?.(error);
    },
  });
};

// ─── useConfirmDialog ─────────────────────────────────
/**
 * Manage confirm dialog state
 * @returns {object} Dialog state and handlers
 */
export const useConfirmDialog = () => {
  const [state, setState] = useState({
    open: false,
    item: null,
    action: null,
  });

  const open = useCallback((item, action = null) => {
    setState({ open: true, item, action });
  }, []);

  const close = useCallback(() => {
    setState({ open: false, item: null, action: null });
  }, []);

  return {
    ...state,
    open: open,
    close,
    isOpen: state.open,
  };
};

// ─── useQueryKeyBuilder ─────────────────────────────────
/**
 * Build consistent query keys
 * @returns {object} Query key builder functions
 */
export const useQueryKeyBuilder = () => {
  return useMemo(
    () => ({
      list: (key, filters) => [key, filters],
      detail: (key, id) => [key, id],
      ...QUERY_KEYS,
    }),
    [],
  );
};
