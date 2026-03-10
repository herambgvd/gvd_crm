import React, { useState, useCallback, memo } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchWarehouseStock,
  fetchInventorySummary,
  transferStock,
} from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import {
  Search,
  Package,
  ArrowRightLeft,
  Warehouse,
  AlertTriangle,
} from "lucide-react";

// Shared module imports
import { formatNumber } from "../utils";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import {
  Pagination,
  TableLoadingRow,
  TableEmptyRow,
  ErrorState,
  StatCard,
} from "../components";
import { useDebounce, usePagination, useFormMutation } from "../hooks";

// Memoized table row component - Updated for products with embedded quantities
const StockTableRow = memo(({ item, onTransferClick }) => {
  const totalStock = item.total_quantity ?? 0;
  const lowStock =
    totalStock <= (item.min_stock_level || 0) &&
    (item.min_stock_level || 0) > 0;
  const totalValue = totalStock * (item.unit_price || 0);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {item.name}
          {lowStock && (
            <AlertTriangle
              className="h-4 w-4 text-orange-500"
              title="Low stock"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{item.sku}</TableCell>
      <TableCell className="text-right text-purple-600">
        {item.demo_quantity ?? 0}
      </TableCell>
      <TableCell className="text-right text-green-600">
        {item.sales_quantity ?? 0}
      </TableCell>
      <TableCell className="text-right text-red-600">
        {item.rma_quantity ?? 0}
      </TableCell>
      <TableCell className="text-right font-bold">{totalStock}</TableCell>
      <TableCell className="text-right text-cyan-600">
        {item.in_transit_quantity ?? 0}
      </TableCell>
      <TableCell className="text-right">
        ₹{Number(item.unit_price || 0).toFixed(2)}
      </TableCell>
      <TableCell className="text-right font-medium">
        ₹{formatNumber(totalValue)}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTransferClick(item)}
          disabled={totalStock === 0}
        >
          <ArrowRightLeft className="h-4 w-4 mr-1" />
          Transfer
        </Button>
      </TableCell>
    </TableRow>
  );
});

StockTableRow.displayName = "StockTableRow";

const WarehouseStock = () => {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all, has_stock, low_stock, out_of_stock
  const [transferDialog, setTransferDialog] = useState({
    open: false,
    item: null,
  });
  const [transferData, setTransferData] = useState({
    from_stock_type: "sales",
    to_stock_type: "demo",
    quantity: 1,
    reason: "",
  });

  // Use debounced search and pagination hooks
  const debouncedSearch = useDebounce(search, 400);
  const { page, setPage, reset: resetPage } = usePagination();

  // Fetch products with stock using products endpoint
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      QUERY_KEYS.warehouseStock,
      { search: debouncedSearch, stockFilter, page },
    ],
    queryFn: () =>
      fetchWarehouseStock({
        search: debouncedSearch || undefined,
        has_stock: stockFilter === "has_stock" ? true : undefined,
        low_stock_only: stockFilter === "low_stock" ? true : undefined,
        out_of_stock_only: stockFilter === "out_of_stock" ? true : undefined,
        page,
        page_size: 20,
      }),
    staleTime: STALE_TIME.list,
    keepPreviousData: true,
  });

  // Fetch summary
  const { data: summaryData } = useQuery({
    queryKey: [QUERY_KEYS.stockSummary],
    queryFn: fetchInventorySummary,
    staleTime: STALE_TIME.summary,
  });

  // Transfer mutation using custom hook
  const transferMutation = useFormMutation(transferStock, {
    successMessage: "Stock transferred successfully",
    errorMessage: "Transfer failed",
    invalidateKeys: [
      QUERY_KEYS.warehouseStock,
      QUERY_KEYS.stockSummary,
      QUERY_KEYS.stockMovements,
    ],
    onSuccess: () => setTransferDialog({ open: false, item: null }),
  });

  // Memoized handlers
  const handleTransfer = useCallback(() => {
    if (transferData.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    const fromQty =
      transferDialog.item?.[`${transferData.from_stock_type}_quantity`] ?? 0;
    if (transferData.quantity > fromQty) {
      toast.error(`Insufficient stock. Available: ${fromQty} units`);
      return;
    }
    if (transferData.from_stock_type === transferData.to_stock_type) {
      toast.error("Source and destination stock types must be different");
      return;
    }

    transferMutation.mutate({
      product_id: transferDialog.item.id,
      from_stock_type: transferData.from_stock_type,
      to_stock_type: transferData.to_stock_type,
      quantity: transferData.quantity,
      reason: transferData.reason,
    });
  }, [transferData, transferDialog.item, transferMutation]);

  const handleSearchChange = useCallback(
    (e) => {
      setSearch(e.target.value);
      resetPage();
    },
    [resetPage],
  );

  const handleStockFilterChange = useCallback(
    (v) => {
      setStockFilter(v);
      resetPage();
    },
    [resetPage],
  );

  const handleTransferClick = useCallback((item) => {
    setTransferDialog({ open: true, item });
    // Default: transfer from main to demo
    setTransferData({
      from_stock_type: "sales",
      to_stock_type: "demo",
      quantity: 1,
      reason: "",
    });
  }, []);

  const handleDialogClose = useCallback((open) => {
    setTransferDialog({ open, item: null });
  }, []);

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
    },
    [setPage],
  );

  const items = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);
  const summary = summaryData || {
    total_products: 0,
    total_demo_quantity: 0,
    total_sales_quantity: 0,
    total_rma_quantity: 0,
    total_stock_value: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  };

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <ErrorState error={error} onRetry={refetch} />
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
            <h1 className="text-2xl font-bold">Warehouse Stock</h1>
            <p className="text-muted-foreground">
              Manage inventory across all stock types
            </p>
          </div>
        </div>

        {/* Summary Cards - Updated for product-based summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-muted-foreground">Demo</span>
              </div>
              <p className="text-2xl font-bold">
                {summary.total_demo_quantity || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Sales</span>
              </div>
              <p className="text-2xl font-bold">
                {summary.total_sales_quantity || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">RMA</span>
              </div>
              <p className="text-2xl font-bold">
                {summary.total_rma_quantity || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Low Stock</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {summary.low_stock_count || 0}
              </p>
            </CardContent>
          </Card>
          <StatCard
            title="Total Value"
            value={`₹${formatNumber(summary.total_stock_value || 0)}`}
            icon={Warehouse}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name, SKU..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              <Select
                value={stockFilter}
                onValueChange={handleStockFilterChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="has_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Items ({data?.total || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Demo</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">RMA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">In Transit</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableLoadingRow colSpan={9} />
                ) : items.length === 0 ? (
                  <TableEmptyRow colSpan={9} message="No stock items found" />
                ) : (
                  items.map((item) => (
                    <StockTableRow
                      key={item.id}
                      item={item}
                      onTransferClick={handleTransferClick}
                    />
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </CardContent>
        </Card>

        {/* Transfer Dialog */}
        <Dialog open={transferDialog.open} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Stock</DialogTitle>
              <DialogDescription>
                Transfer stock for {transferDialog.item?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                <div className="text-center">
                  <span className="text-muted-foreground">Demo</span>
                  <p className="font-bold text-purple-600">
                    {transferDialog.item?.demo_quantity ?? 0}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-muted-foreground">Sales</span>
                  <p className="font-bold text-green-600">
                    {transferDialog.item?.sales_quantity ?? 0}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-muted-foreground">RMA</span>
                  <p className="font-bold text-red-600">
                    {transferDialog.item?.rma_quantity ?? 0}
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="from_stock_type">Transfer From *</Label>
                <Select
                  value={transferData.from_stock_type}
                  onValueChange={(v) =>
                    setTransferData({
                      ...transferData,
                      from_stock_type: v,
                      to_stock_type: v === "sales" ? "demo" : "sales",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Stock</SelectItem>
                    <SelectItem value="demo">Demo Stock</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Available:{" "}
                  {transferDialog.item?.[
                    `${transferData.from_stock_type}_quantity`
                  ] ?? 0}{" "}
                  units
                </p>
              </div>
              <div>
                <Label htmlFor="to_stock_type">Transfer To *</Label>
                <Select
                  value={transferData.to_stock_type}
                  onValueChange={(v) =>
                    setTransferData({ ...transferData, to_stock_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["sales", "demo"]
                      .filter((type) => type !== transferData.from_stock_type)
                      .map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)} Stock
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={
                    transferDialog.item?.[
                      `${transferData.from_stock_type}_quantity`
                    ] ?? 0
                  }
                  value={transferData.quantity}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={transferData.reason}
                  onChange={(e) =>
                    setTransferData({ ...transferData, reason: e.target.value })
                  }
                  placeholder="e.g., Demo request, Sales allocation"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={
                  transferMutation.isPending ||
                  transferData.quantity >
                    (transferDialog.item?.[
                      `${transferData.from_stock_type}_quantity`
                    ] ?? 0)
                }
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default WarehouseStock;
