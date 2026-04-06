import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { BACKEND_URL } from "../../../lib/axios";
import {
  fetchProducts,
  deleteProduct,
  fetchCategoryTree,
  fetchStockSummary,
  transferProductStock,
} from "../api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ImportWizard } from "../../import-wizard";

const Products = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [productToView, setProductToView] = useState(null);

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferData, setTransferData] = useState({
    from_type: "sales",
    to_type: "demo",
    quantity: 1,
    reason: "",
  });

  // Server-side pagination & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all, has_stock, low_stock, out_of_stock
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch stock summary
  const { data: stockSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["stockSummary"],
    queryFn: fetchStockSummary,
    staleTime: 30 * 1000,
  });

  // Fetch category tree from backend
  const { data: categoryTree = [] } = useQuery({
    queryKey: ["categoryTree"],
    queryFn: fetchCategoryTree,
    staleTime: 60 * 1000,
  });

  // Build flat list of category names (parents + subcategories) for filter dropdown
  const categoryList = React.useMemo(() => {
    const names = new Set();
    categoryTree.forEach((parent) => {
      names.add(parent.name);
      if (parent.subcategories) {
        parent.subcategories.forEach((sub) => names.add(sub.name));
      }
    });
    return Array.from(names).sort();
  }, [categoryTree]);

  // Server-side paginated query
  const { data, isLoading } = useQuery({
    queryKey: [
      "products",
      currentPage,
      pageSize,
      categoryFilter,
      stockFilter,
      searchQuery,
    ],
    queryFn: () =>
      fetchProducts({
        page: currentPage,
        page_size: pageSize,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        search: searchQuery || undefined,
        has_stock: stockFilter === "has_stock" ? true : undefined,
        low_stock_only: stockFilter === "low_stock" ? true : undefined,
        out_of_stock_only: stockFilter === "out_of_stock" ? true : undefined,
      }),
    keepPreviousData: true,
  });

  const products = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  // Debounced search
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, pageSize]);

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product deleted successfully!");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete product");
      setDeleteDialogOpen(false);
    },
  });

  // Stock transfer mutation
  const transferMutation = useMutation({
    mutationFn: ({ productId, data }) => transferProductStock(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["stockSummary"]);
      toast.success("Stock transferred successfully!");
      setTransferDialogOpen(false);
      setTransferProduct(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to transfer stock");
    },
  });

  // Transfer handlers
  const handleTransferClick = (product) => {
    setTransferProduct(product);
    setTransferData({
      from_type: "main",
      to_type: "demo",
      quantity: 1,
      reason: "",
    });
    setTransferDialogOpen(true);
  };

  const handleTransferConfirm = () => {
    if (!transferProduct) return;
    const fromQty = transferProduct[`${transferData.from_type}_quantity`] ?? 0;
    if (transferData.quantity > fromQty) {
      toast.error(`Not enough stock. Available: ${fromQty}`);
      return;
    }
    transferMutation.mutate({
      productId: transferProduct.id,
      data: {
        from_type: transferData.from_type,
        to_type: transferData.to_type,
        quantity: transferData.quantity,
        reason: transferData.reason,
      },
    });
  };

  const handleView = (product) => {
    setProductToView(product);
    setViewDialogOpen(true);
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${BACKEND_URL}/${imagePath}`;
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  if (isLoading && !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6" data-testid="products-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold">Product Master</h1>
            <p className="text-muted-foreground">
              Manage your product catalog & inventory ({total} total)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import
            </Button>
<Button onClick={() => navigate("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          </div>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">
                  Sales Stock
                </span>
              </div>
              <p className="text-lg font-semibold">
                {isLoadingSummary
                  ? "..."
                  : (stockSummary?.total_sales_quantity ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-muted-foreground">
                  Demo Stock
                </span>
              </div>
              <p className="text-lg font-semibold">
                {isLoadingSummary
                  ? "..."
                  : (stockSummary?.total_demo_quantity ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">RMA Stock</span>
              </div>
              <p className="text-lg font-semibold">
                {isLoadingSummary
                  ? "..."
                  : (stockSummary?.total_rma_quantity ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Low Stock</span>
              </div>
              <p className="text-lg font-semibold text-amber-600">
                {isLoadingSummary
                  ? "..."
                  : (stockSummary?.low_stock_count ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Total Value
                </span>
              </div>
              <p className="text-lg font-semibold">
                {isLoadingSummary
                  ? "..."
                  : `₹${Number(stockSummary?.total_stock_value ?? 0).toLocaleString("en-IN")}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product code or name..."
                    value={searchInput}
                    onChange={handleSearchChange}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryList.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-40">
                <Select
                  value={stockFilter}
                  onValueChange={(value) => {
                    setStockFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stock Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="has_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-32">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of{" "}
              {total} products
              {(searchQuery || categoryFilter !== "all") && (
                <span className="ml-2 text-blue-600">(filtered)</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products & Stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Image
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Product Code
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Product Name
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Category
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-700">
                      Price
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-700">
                      <span className="text-green-600">Sales</span>
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-700">
                      <span className="text-purple-600">Demo</span>
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-700">
                      <span className="text-red-600">RMA</span>
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-700">
                      Total
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-12 text-gray-500"
                      >
                        {total === 0 &&
                        !searchQuery &&
                        categoryFilter === "all" &&
                        stockFilter === "all"
                          ? "No products found. Create your first product!"
                          : "No products match your filters."}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const totalStock =
                        product.total_quantity ?? product.stock_quantity ?? 0;
                      const isLowStock =
                        totalStock <= (product.min_stock_level ?? 0) &&
                        (product.min_stock_level ?? 0) > 0;
                      return (
                        <tr
                          key={product.id}
                          className="border-b hover:bg-gray-50"
                          data-testid="product-row"
                        >
                          <td className="p-4">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={getImageUrl(product.images[0])}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No Image
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-sm">
                            {product.sku}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {product.name}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{product.category}</Badge>
                          </td>
                          <td className="p-4 font-mono text-sm text-right">
                            ₹
                            {Number(product.unit_price).toLocaleString("en-IN")}
                          </td>
                          <td className="p-4 text-right text-green-600 font-medium">
                            {product.sales_quantity ?? 0}
                          </td>
                          <td className="p-4 text-right text-purple-600 font-medium">
                            {product.demo_quantity ?? 0}
                          </td>
                          <td className="p-4 text-right text-red-600 font-medium">
                            {product.rma_quantity ?? 0}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isLowStock && (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                              <span
                                className={`font-bold ${
                                  isLowStock
                                    ? "text-amber-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {totalStock}
                              </span>
                              {(product.in_transit_quantity ?? 0) > 0 && (
                                <span className="text-xs text-cyan-600">
                                  +{product.in_transit_quantity}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(product)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTransferClick(product)}
                                title="Transfer Stock"
                                disabled={totalStock === 0}
                              >
                                <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/products/edit/${product.id}`)
                                }
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(product)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
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

        {/* Pagination */}
        {total > 0 && totalPages > 1 && (
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Product Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>
                Complete information about {productToView?.name}
              </DialogDescription>
            </DialogHeader>
            {productToView && (
              <div className="space-y-6">
                {productToView.images && productToView.images.length > 0 && (
                  <div className="flex justify-center">
                    <div className="w-64 h-64 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      <img
                        src={getImageUrl(productToView.images[0])}
                        alt={productToView.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Product Code (SKU)
                    </Label>
                    <p className="font-mono text-sm font-medium">
                      {productToView.sku}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Product Name
                    </Label>
                    <p className="text-sm font-medium">{productToView.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Category</Label>
                    <div>
                      <Badge variant="outline">{productToView.category}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Unit</Label>
                    <p className="text-sm">{productToView.unit_of_measure}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Unit Price</Label>
                    <p className="text-sm font-mono font-semibold text-green-600">
                      ₹
                      {Number(productToView.unit_price).toLocaleString("en-IN")}
                    </p>
                  </div>
                  {productToView.cost_price != null && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">
                        Cost Price
                      </Label>
                      <p className="text-sm font-mono">
                        ₹
                        {Number(productToView.cost_price).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Stock Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Stock Information
                  </h4>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs text-gray-500">
                        Total Stock
                      </Label>
                      <p
                        className={`text-lg font-bold ${
                          (productToView.total_quantity ??
                            productToView.stock_quantity ??
                            0) <= (productToView.min_stock_level ?? 0)
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      >
                        {productToView.total_quantity ??
                          productToView.stock_quantity ??
                          0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Sales Stock
                      </Label>
                      <p className="text-lg font-medium text-green-600">
                        {productToView.sales_quantity ?? 0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Demo Stock
                      </Label>
                      <p className="text-lg font-medium text-purple-600">
                        {productToView.demo_quantity ?? 0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">RMA Stock</Label>
                      <p className="text-lg font-medium text-red-600">
                        {productToView.rma_quantity ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs text-gray-500">
                        Ordered (Pipeline)
                      </Label>
                      <p className="text-lg font-medium text-orange-500">
                        {productToView.ordered_quantity ?? 0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        In Transit
                      </Label>
                      <p className="text-lg font-medium text-cyan-600">
                        {productToView.in_transit_quantity ?? 0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Reorder Point
                      </Label>
                      <p className="text-lg font-medium">
                        {productToView.reorder_point ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <Label className="text-xs text-gray-500">Min Level</Label>
                      <p className="text-lg font-medium">
                        {productToView.min_stock_level ?? 0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Max Level</Label>
                      <p className="text-lg font-medium">
                        {productToView.max_stock_level ?? "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Avg Cost Price
                      </Label>
                      <p className="text-lg font-medium">
                        ₹
                        {Number(productToView.unit_price ?? 0).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {productToView.description && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <p className="text-sm text-gray-700">
                      {productToView.description}
                    </p>
                  </div>
                )}

                {productToView.specifications &&
                  typeof productToView.specifications === "object" &&
                  Object.keys(productToView.specifications).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">
                        Specifications
                      </Label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(productToView.specifications).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="font-medium text-gray-700">
                                  {key}:
                                </span>
                                <span className="text-gray-600">{value}</span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                <div className="text-xs text-gray-400">
                  Created:{" "}
                  {productToView.created_at
                    ? new Date(productToView.created_at).toLocaleDateString(
                        "en-IN",
                        { year: "numeric", month: "long", day: "numeric" },
                      )
                    : "—"}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      navigate(`/products/edit/${productToView.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Product
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                product
                <strong className="block mt-2 text-foreground">
                  {productToDelete?.name} ({productToDelete?.sku})
                </strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stock Transfer Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Stock</DialogTitle>
              <DialogDescription>
                Transfer stock for {transferProduct?.name} (
                {transferProduct?.sku})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Current Stock Summary */}
              <div className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                <div className="text-center">
                  <span className="text-muted-foreground">Sales</span>
                  <p className="font-bold text-green-600">
                    {transferProduct?.sales_quantity ?? 0}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-muted-foreground">Demo</span>
                  <p className="font-bold text-purple-600">
                    {transferProduct?.demo_quantity ?? 0}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-muted-foreground">RMA</span>
                  <p className="font-bold text-red-600">
                    {transferProduct?.rma_quantity ?? 0}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="from_type">Transfer From *</Label>
                <Select
                  value={transferData.from_type}
                  onValueChange={(v) =>
                    setTransferData({
                      ...transferData,
                      from_type: v,
                      to_type: v === "sales" ? "demo" : "sales",
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
                  {transferProduct?.[`${transferData.from_type}_quantity`] ?? 0}{" "}
                  units
                </p>
              </div>

              <div>
                <Label htmlFor="to_type">Transfer To *</Label>
                <Select
                  value={transferData.to_type}
                  onValueChange={(v) =>
                    setTransferData({ ...transferData, to_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["sales", "demo"]
                      .filter((type) => type !== transferData.from_type)
                      .map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)} Stock
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transfer_quantity">Quantity *</Label>
                <Input
                  id="transfer_quantity"
                  type="number"
                  min="1"
                  max={
                    transferProduct?.[`${transferData.from_type}_quantity`] ?? 0
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
                <Label htmlFor="transfer_reason">Reason</Label>
                <Input
                  id="transfer_reason"
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
                onClick={() => setTransferDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferConfirm}
                disabled={
                  transferMutation.isPending ||
                  transferData.quantity >
                    (transferProduct?.[`${transferData.from_type}_quantity`] ??
                      0)
                }
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {transferMutation.isPending ? "Transferring..." : "Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="product"
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
    </Layout>
  );
};

export default Products;
