import React, { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchFactoryOrders,
  deleteFactoryOrder,
  submitFactoryOrder,
  confirmFactoryOrder,
  cancelFactoryOrder,
} from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Truck,
  ShoppingCart,
} from "lucide-react";

// Shared module imports
import { formatDate, formatCurrency } from "../utils";
import { FACTORY_ORDER_STATUS, QUERY_KEYS, STALE_TIME } from "../constants";
import {
  StatusBadge,
  Pagination,
  TableLoadingRow,
  TableEmptyRow,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components";
import {
  useDebounce,
  usePagination,
  useDeleteMutation,
  useActionMutation,
  useConfirmDialog,
  useListQuery,
} from "../hooks";

// Memoized table row component
const OrderRow = memo(
  ({
    order,
    onView,
    onEdit,
    onSubmit,
    onConfirm,
    onCancel,
    onDelete,
    onCreateShipment,
  }) => (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-4">
        <span className="font-medium">{order.order_number}</span>
      </td>
      <td className="p-4">{order.factory_name}</td>
      <td className="p-4">{order.items?.length || 0} items</td>
      <td className="p-4 font-medium">
        {formatCurrency(order.total_amount, order.currency)}
      </td>
      <td className="p-4">{formatDate(order.order_date)}</td>
      <td className="p-4">{formatDate(order.expected_delivery_date)}</td>
      <td className="p-4">
        <StatusBadge status={order.status} statusMap={FACTORY_ORDER_STATUS} />
      </td>
      <td className="p-4">
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(order.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {!["received", "cancelled"].includes(order.status) && (
                <DropdownMenuItem onClick={() => onEdit(order.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {order.status === "draft" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSubmit(order.id)}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit to Factory
                  </DropdownMenuItem>
                </>
              )}
              {order.status === "submitted" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onConfirm(order.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Confirmed
                  </DropdownMenuItem>
                </>
              )}
              {order.status === "confirmed" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onCreateShipment(order.id)}>
                    <Truck className="h-4 w-4 mr-2" />
                    Create Shipment
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              {!["received", "cancelled"].includes(order.status) && (
                <DropdownMenuItem
                  onClick={() => onCancel(order.id)}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Order
                </DropdownMenuItem>
              )}
              {!["shipped", "received", "cancelled"].includes(order.status) && (
                <DropdownMenuItem
                  onClick={() => onDelete(order)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  ),
);

OrderRow.displayName = "OrderRow";

const FactoryOrders = () => {
  const navigate = useNavigate();

  // State management with custom hooks
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(searchInput);
  const { page, pageSize, setPage, reset: resetPage } = usePagination();
  const deleteDialog = useConfirmDialog();

  // Fetch orders with optimized query
  const {
    items: orders,
    total,
    totalPages,
    isLoading,
  } = useListQuery(
    QUERY_KEYS.factoryOrders,
    fetchFactoryOrders,
    { search: debouncedSearch, status: statusFilter },
    { page, pageSize },
    { staleTime: STALE_TIME.list },
  );

  // Mutations using shared hooks
  const submitMutation = useActionMutation(
    submitFactoryOrder,
    QUERY_KEYS.factoryOrders,
    {
      successMessage: "Order submitted successfully",
      errorMessage: "Failed to submit order",
      invalidateKeys: [QUERY_KEYS.inventorySummary],
    },
  );

  const confirmMutation = useActionMutation(
    confirmFactoryOrder,
    QUERY_KEYS.factoryOrders,
    {
      successMessage: "Order confirmed",
      errorMessage: "Failed to confirm order",
      invalidateKeys: [QUERY_KEYS.inventorySummary],
    },
  );

  const cancelMutation = useActionMutation(
    cancelFactoryOrder,
    QUERY_KEYS.factoryOrders,
    {
      successMessage: "Order cancelled",
      errorMessage: "Failed to cancel order",
      invalidateKeys: [QUERY_KEYS.inventorySummary],
    },
  );

  const deleteMutation = useDeleteMutation(
    deleteFactoryOrder,
    QUERY_KEYS.factoryOrders,
    {
      successMessage: "Order deleted",
      errorMessage: "Failed to delete order",
      onSuccess: () => deleteDialog.close(),
      invalidateKeys: [QUERY_KEYS.inventorySummary],
    },
  );

  // Memoized callbacks
  const handleView = useCallback(
    (id) => navigate(`/stock-management/factory-orders/${id}`),
    [navigate],
  );
  const handleEdit = useCallback(
    (id) => navigate(`/stock-management/factory-orders/${id}/edit`),
    [navigate],
  );
  const handleCreateShipment = useCallback(
    (id) => navigate(`/stock-management/in-transit/new?factory_order_id=${id}`),
    [navigate],
  );
  const handleStatusChange = useCallback(
    (v) => {
      setStatusFilter(v);
      resetPage();
    },
    [resetPage],
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Factory Orders</h1>
            <p className="text-muted-foreground">
              Purchase orders placed to manufacturers/suppliers
            </p>
          </div>
          <Button
            onClick={() => navigate("/stock-management/factory-orders/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Factory Order
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Factory Orders ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Order #</th>
                    <th className="text-left p-4 font-medium">Factory</th>
                    <th className="text-left p-4 font-medium">Items</th>
                    <th className="text-left p-4 font-medium">Total</th>
                    <th className="text-left p-4 font-medium">Order Date</th>
                    <th className="text-left p-4 font-medium">Expected</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingRow colSpan={8} />
                  ) : orders.length === 0 ? (
                    <TableEmptyRow
                      colSpan={8}
                      message="No factory orders found"
                    />
                  ) : (
                    orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onView={handleView}
                        onEdit={handleEdit}
                        onSubmit={(id) => submitMutation.mutate(id)}
                        onConfirm={(id) => confirmMutation.mutate(id)}
                        onCancel={(id) => cancelMutation.mutate(id)}
                        onDelete={(order) => deleteDialog.open(order)}
                        onCreateShipment={handleCreateShipment}
                      />
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

        {/* Delete Dialog */}
        <AlertDialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) => !open && deleteDialog.close()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Factory Order?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete order{" "}
                {deleteDialog.item?.order_number}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteDialog.item?.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default FactoryOrders;
