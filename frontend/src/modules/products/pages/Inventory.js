import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchProducts,
  fetchLowStockProducts,
  fetchStockMovements,
  createStockMovement,
} from "../api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

const Inventory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Overview tab state
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Low-stock tab state
  const [lowStockPage, setLowStockPage] = useState(1);

  // Movements tab state
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");

  // Stock movement form
  const [movementForm, setMovementForm] = useState({
    movement_type: "in",
    quantity: "",
    reason: "",
    notes: "",
    reference_type: "",
    reference_id: "",
  });

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setOverviewSearch(searchInput);
      setOverviewPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Queries
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ["inventory-overview", overviewPage, overviewSearch],
    queryFn: () =>
      fetchProducts({
        page: overviewPage,
        page_size: 20,
        search: overviewSearch || undefined,
      }),
    keepPreviousData: true,
  });

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ["low-stock", lowStockPage],
    queryFn: () => fetchLowStockProducts({ page: lowStockPage, page_size: 20 }),
    keepPreviousData: true,
    enabled: activeTab === "low-stock",
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", movementsPage, movementTypeFilter],
    queryFn: () =>
      fetchStockMovements({
        page: movementsPage,
        page_size: 20,
        movement_type:
          movementTypeFilter !== "all" ? movementTypeFilter : undefined,
      }),
    keepPreviousData: true,
    enabled: activeTab === "movements",
  });

  const stockMutation = useMutation({
    mutationFn: ({ productId, data }) => createStockMovement(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["inventory-overview"]);
      queryClient.invalidateQueries(["low-stock"]);
      queryClient.invalidateQueries(["stock-movements"]);
      queryClient.invalidateQueries(["products"]);
      toast.success("Stock movement recorded successfully!");
      setStockDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to record stock movement",
      );
    },
  });

  const resetForm = () => {
    setMovementForm({
      movement_type: "in",
      quantity: "",
      reason: "",
      notes: "",
      reference_type: "",
      reference_id: "",
    });
    setSelectedProduct(null);
  };

  const openStockDialog = (product) => {
    setSelectedProduct(product);
    resetForm();
    setStockDialogOpen(true);
  };

  const handleStockSubmit = () => {
    if (!movementForm.quantity || parseInt(movementForm.quantity) === 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!movementForm.reason) {
      toast.error("Please enter a reason");
      return;
    }

    stockMutation.mutate({
      productId: selectedProduct.id,
      data: {
        product_id: selectedProduct.id,
        movement_type: movementForm.movement_type,
        quantity: parseInt(movementForm.quantity),
        reason: movementForm.reason,
        notes: movementForm.notes || undefined,
        reference_type: movementForm.reference_type || undefined,
        reference_id: movementForm.reference_id || undefined,
      },
    });
  };

  const overviewProducts = overviewData?.items || [];
  const overviewTotal = overviewData?.total || 0;
  const overviewTotalPages = overviewData?.total_pages || 1;

  const lowStockProducts = lowStockData?.items || [];
  const lowStockTotal = lowStockData?.total || 0;
  const lowStockTotalPages = lowStockData?.total_pages || 1;

  const movements = movementsData?.items || [];
  const movementsTotal = movementsData?.total || 0;
  const movementsTotalPages = movementsData?.total_pages || 1;

  const movementTypeLabel = (type) => {
    const labels = {
      in: "Stock In",
      out: "Stock Out",
      adjustment: "Adjustment",
      transfer: "Transfer",
    };
    return labels[type] || type;
  };

  const movementTypeBadge = (type) => {
    const variants = {
      in: "default",
      out: "destructive",
      adjustment: "secondary",
      transfer: "outline",
    };
    return variants[type] || "outline";
  };

  const Pagination = ({ current, total: totalPages, onChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-600">
          Page {current} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(Math.max(1, current - 1))}
            disabled={current === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(Math.min(totalPages, current + 1))}
            disabled={current === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Inventory Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Track stock levels, movements, and alerts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/products")}>
              <Package className="mr-2 h-4 w-4" />
              Products
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-lg font-semibold">{overviewTotal}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Low Stock Items</p>
                  <p className="text-lg font-semibold text-amber-600">
                    {lowStockData?.total ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recent Movements</p>
                  <p className="text-lg font-semibold">
                    {movementsData?.total ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Stock Overview</TabsTrigger>
            <TabsTrigger value="low-stock">
              Low Stock
              {lowStockTotal > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {lowStockTotal}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          SKU
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Product Name
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Stock Qty
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Min Level
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Max Level
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-gray-700">
                          Status
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewLoading && !overviewData ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : overviewProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No products found.
                          </td>
                        </tr>
                      ) : (
                        overviewProducts.map((p) => {
                          const isLow =
                            p.stock_quantity <= p.min_stock_level &&
                            p.min_stock_level > 0;
                          const isOut = p.stock_quantity === 0;
                          return (
                            <tr
                              key={p.id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-4 font-mono text-sm">{p.sku}</td>
                              <td className="p-4 text-sm font-medium">
                                {p.name}
                              </td>
                              <td
                                className={`p-4 text-right font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"}`}
                              >
                                {p.stock_quantity}
                              </td>
                              <td className="p-4 text-right text-sm text-gray-600">
                                {p.min_stock_level}
                              </td>
                              <td className="p-4 text-right text-sm text-gray-600">
                                {p.max_stock_level ?? "—"}
                              </td>
                              <td className="p-4 text-center">
                                {isOut ? (
                                  <Badge variant="destructive">
                                    Out of Stock
                                  </Badge>
                                ) : isLow ? (
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                    Low Stock
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                    In Stock
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openStockDialog(p)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Adjust
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Pagination
              current={overviewPage}
              total={overviewTotalPages}
              onChange={setOverviewPage}
            />
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="low-stock" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          SKU
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Product Name
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Category
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Current Stock
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Min Level
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Deficit
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockLoading && !lowStockData ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : lowStockProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-green-600 font-medium"
                          >
                            All products are well-stocked!
                          </td>
                        </tr>
                      ) : (
                        lowStockProducts.map((p) => (
                          <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 font-mono text-sm">{p.sku}</td>
                            <td className="p-4 text-sm font-medium">
                              {p.name}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{p.category}</Badge>
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${p.stock_quantity === 0 ? "text-red-600" : "text-amber-600"}`}
                            >
                              {p.stock_quantity}
                            </td>
                            <td className="p-4 text-right text-sm">
                              {p.min_stock_level}
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-red-600 font-medium">
                                -{p.min_stock_level - p.stock_quantity}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStockDialog(p)}
                              >
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                                Stock In
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Pagination
              current={lowStockPage}
              total={lowStockTotalPages}
              onChange={setLowStockPage}
            />
          </TabsContent>

          {/* Stock Movements Tab */}
          <TabsContent value="movements" className="space-y-4">
            <div className="flex gap-4">
              <div className="w-48">
                <Select
                  value={movementTypeFilter}
                  onValueChange={(v) => {
                    setMovementTypeFilter(v);
                    setMovementsPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Date
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Type
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Quantity
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          Before
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          After
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Reason
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementsLoading && !movementsData ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : movements.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No stock movements found.
                          </td>
                        </tr>
                      ) : (
                        movements.map((m) => (
                          <tr key={m.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">
                              {m.created_at
                                ? new Date(m.created_at).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )
                                : "—"}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={movementTypeBadge(m.movement_type)}
                              >
                                {movementTypeLabel(m.movement_type)}
                              </Badge>
                            </td>
                            <td
                              className={`p-4 text-right font-mono font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {m.quantity > 0 ? "+" : ""}
                              {m.quantity}
                            </td>
                            <td className="p-4 text-right text-sm text-gray-600">
                              {m.previous_quantity ?? "—"}
                            </td>
                            <td className="p-4 text-right text-sm text-gray-600">
                              {m.new_quantity ?? "—"}
                            </td>
                            <td className="p-4 text-sm">{m.reason || "—"}</td>
                            <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate">
                              {m.notes || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Pagination
              current={movementsPage}
              total={movementsTotalPages}
              onChange={setMovementsPage}
            />
          </TabsContent>
        </Tabs>

        {/* Stock Movement Dialog */}
        <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Stock Movement</DialogTitle>
              <DialogDescription>
                {selectedProduct && (
                  <>
                    <span className="font-medium">{selectedProduct.name}</span>
                    <span className="text-gray-500 ml-2">
                      ({selectedProduct.sku})
                    </span>
                    <br />
                    Current stock:{" "}
                    <strong>{selectedProduct.stock_quantity}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Movement Type *</Label>
                <Select
                  value={movementForm.movement_type}
                  onValueChange={(value) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      movement_type: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        Stock In
                      </div>
                    </SelectItem>
                    <SelectItem value="out">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        Stock Out
                      </div>
                    </SelectItem>
                    <SelectItem value="adjustment">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        Adjustment
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder="Enter quantity"
                />
                {selectedProduct && movementForm.quantity && (
                  <p className="text-xs text-gray-500">
                    New stock will be:{" "}
                    <strong>
                      {movementForm.movement_type === "out"
                        ? selectedProduct.stock_quantity -
                          parseInt(movementForm.quantity || 0)
                        : selectedProduct.stock_quantity +
                          parseInt(movementForm.quantity || 0)}
                    </strong>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Input
                  value={movementForm.reason}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="e.g., Purchase order #123"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={movementForm.notes}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStockDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStockSubmit}
                  disabled={stockMutation.isPending}
                >
                  {stockMutation.isPending ? "Recording..." : "Record Movement"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Inventory;
