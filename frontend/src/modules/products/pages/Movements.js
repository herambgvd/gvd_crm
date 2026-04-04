import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchStockMovements, fetchAllMovementCategories } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Plus,
  Search,
  Eye,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const Movements = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categoriesData } = useQuery({
    queryKey: ["movementCategoriesAll"],
    queryFn: fetchAllMovementCategories,
  });

  const categories = categoriesData || [];

  const { data, isLoading } = useQuery({
    queryKey: [
      "stockMovements",
      page,
      searchQuery,
      categoryFilter,
      statusFilter,
    ],
    queryFn: () =>
      fetchStockMovements({
        page,
        page_size: 20,
        search: searchQuery || undefined,
        category_id: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  });

  const movements = data?.items || [];
  const totalPages = data?.pages || 1;

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "shipped":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            <Truck className="h-3 w-3 mr-1" />
            Shipped
          </Badge>
        );
      case "received":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Received
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Stock Movements
            </h1>
            <p className="text-gray-600">
              Track and manage inventory movements
            </p>
          </div>
          <Button onClick={() => navigate("/inventory/movements/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Movement
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">{data?.total || 0}</p>
                <p className="text-xs text-gray-500">Total Movements</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {movements.filter((m) => m.status === "pending").length}
                </p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {movements.filter((m) => m.status === "shipped").length}
                </p>
                <p className="text-xs text-gray-500">In Transit</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {
                    movements.filter(
                      (m) =>
                        m.status === "received" || m.status === "completed",
                    ).length
                  }
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by UID, location..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No stock movements found. Create your first movement!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {movement.uid || movement.id?.slice(0, 8)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {movement.category_code === "out" ? (
                            <ArrowUpCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span>
                            {movement.category_name ||
                              movement.category_code ||
                              "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {movement.product_name || "-"}
                          </p>
                          {movement.product_sku && (
                            <p className="text-xs text-gray-500">
                              {movement.product_sku}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movement.quantity > 0 ? "default" : "destructive"
                          }
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{movement.entity_name || "-"}</TableCell>
                      <TableCell>{formatDate(movement.request_date)}</TableCell>
                      <TableCell>{getStatusBadge(movement.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/inventory/movements/${movement.id}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Movements;
