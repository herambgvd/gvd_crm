import React, { useState, useCallback, memo } from "react";
import { Layout } from "../../../components";
import { fetchStockMovements } from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  RefreshCw,
} from "lucide-react";

// Shared module imports
import { formatDateTime } from "../utils";
import { MOVEMENT_TYPE, QUERY_KEYS, STALE_TIME } from "../constants";
import {
  Pagination,
  TableLoadingRow,
  TableEmptyRow,
  ErrorState,
} from "../components";
import { useDebounce, usePagination, useListQuery } from "../hooks";

// Icon mapping for movement types
const movementTypeIcons = {
  goods_received: ArrowDownCircle,
  rma_received: ArrowDownCircle,
  rma_to_sales: ArrowDownCircle,
  demo_returned: ArrowDownCircle,
  sold: ArrowUpCircle,
  scrap: ArrowUpCircle,
  rma_scrapped: ArrowUpCircle,
  lost: ArrowUpCircle,
  rma_returned_to_customer: ArrowUpCircle,
  demo_issued: ArrowRightLeft,
  adjustment_in: RefreshCw,
  adjustment_out: RefreshCw,
  stock_take: RefreshCw,
};

const MovementRow = memo(({ item }) => {
  const typeConfig = MOVEMENT_TYPE[item.movement_type] || {
    label: item.movement_type,
    color: "text-gray-500",
    variant: "secondary",
  };
  const Icon = movementTypeIcons[item.movement_type] || ArrowRightLeft;
  const isPositive = [
    "goods_received",
    "rma_received",
    "rma_to_sales",
    "demo_returned",
    "adjustment_in",
  ].includes(item.movement_type);

  const stockFlow = (() => {
    const from = item.from_stock_type;
    const to = item.to_stock_type;
    if (from && to) return `${from} → ${to}`;
    if (to) return `→ ${to}`;
    if (from) return `${from} →`;
    return "-";
  })();

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-4 text-sm">{formatDateTime(item.created_at)}</td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${typeConfig.color}`} />
          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
        </div>
      </td>
      <td className="p-4">
        <div>
          <div className="font-medium">{item.product_name}</div>
          <div className="text-sm text-muted-foreground">
            {item.product_sku}
          </div>
        </div>
      </td>
      <td className="p-4 text-sm">{stockFlow}</td>
      <td
        className={`p-4 text-right font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
      >
        {isPositive ? "+" : "-"}
        {item.quantity}
      </td>
      <td className="p-4 text-right text-muted-foreground">
        {item.previous_quantity}
      </td>
      <td className="p-4 text-right font-medium">{item.new_quantity}</td>
      <td className="p-4">
        <div className="text-sm">
          {item.reference_type && (
            <span className="text-muted-foreground capitalize">
              {item.reference_type.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </td>
      <td className="p-4 max-w-[150px] truncate" title={item.reason}>
        {item.reason || "-"}
      </td>
      <td className="p-4 text-sm text-muted-foreground">
        {item.created_by_name || "-"}
      </td>
    </tr>
  );
});

const StockMovements = () => {
  const [searchInput, setSearchInput] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");

  const debouncedSearch = useDebounce(searchInput, 300);
  const { page, pageSize, setPage, resetPage } = usePagination();

  const {
    data = { items: [], total: 0, total_pages: 0 },
    isLoading,
    error,
  } = useListQuery(
    [QUERY_KEYS.stockMovements, debouncedSearch, movementTypeFilter],
    () =>
      fetchStockMovements({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: debouncedSearch || undefined,
        movement_type:
          movementTypeFilter !== "all" ? movementTypeFilter : undefined,
      }),
    { page, pageSize },
    { staleTime: STALE_TIME.list },
  );

  const { items, total, total_pages: totalPages } = data;

  // Memoized callbacks
  const handleSearchChange = useCallback(
    (e) => {
      setSearchInput(e.target.value);
      resetPage();
    },
    [resetPage],
  );

  const handleMovementTypeChange = useCallback(
    (v) => {
      setMovementTypeFilter(v);
      resetPage();
    },
    [resetPage],
  );

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <ErrorState error={error} title="Error loading stock movements" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold">Stock Movements</h1>
            <p className="text-muted-foreground">
              Audit trail of all inventory movements
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product, reference..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          <Select
            value={movementTypeFilter}
            onValueChange={handleMovementTypeChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Movement Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="goods_received">Goods Received</SelectItem>
              <SelectItem value="rma_received">RMA Received</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="demo_issued">Demo Issued</SelectItem>
              <SelectItem value="demo_returned">Demo Returned</SelectItem>
              <SelectItem value="rma_to_sales">RMA → Sales</SelectItem>
              <SelectItem value="rma_scrapped">RMA Scrapped</SelectItem>
              <SelectItem value="rma_returned_to_customer">
                Returned to Customer
              </SelectItem>
              <SelectItem value="adjustment_in">Adjustment (+)</SelectItem>
              <SelectItem value="adjustment_out">Adjustment (-)</SelectItem>
              <SelectItem value="stock_take">Stock Take</SelectItem>
              <SelectItem value="scrapped">Scrapped</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Movements Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Movement Log ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Date/Time</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium">Stock Flow</th>
                    <th className="text-right p-4 font-medium">Qty</th>
                    <th className="text-right p-4 font-medium">Before</th>
                    <th className="text-right p-4 font-medium">After</th>
                    <th className="text-left p-4 font-medium">Reference</th>
                    <th className="text-left p-4 font-medium">Reason</th>
                    <th className="text-left p-4 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingRow colSpan={10} />
                  ) : items.length === 0 ? (
                    <TableEmptyRow colSpan={10} message="No movements found" />
                  ) : (
                    items.map((item) => (
                      <MovementRow key={item.id} item={item} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockMovements;
