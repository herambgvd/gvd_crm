import React, { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchInTransitShipments,
  deleteInTransitShipment,
  receiveInTransitShipment,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";
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
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Truck,
  Package,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

// Shared module imports
import { formatDate } from "../utils";
import { IN_TRANSIT_STATUS, QUERY_KEYS, STALE_TIME } from "../constants";
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
const ShipmentRow = memo(({ item, onView, onEdit, onReceive, onDelete }) => {
  const totalItems =
    item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-4 font-medium">{item.tracking_number || "-"}</td>
      <td className="p-4">{item.factory_order_number || "-"}</td>
      <td className="p-4">{item.carrier || "-"}</td>
      <td className="p-4">
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4 text-muted-foreground" />
          {totalItems} units
        </div>
      </td>
      <td className="p-4">{formatDate(item.ship_date)}</td>
      <td className="p-4">{formatDate(item.estimated_arrival)}</td>
      <td className="p-4">
        <StatusBadge status={item.status} statusMap={IN_TRANSIT_STATUS} />
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
              <DropdownMenuItem onClick={() => onView(item.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {item.status !== "delivered" && (
                <DropdownMenuItem onClick={() => onEdit(item.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {item.status !== "delivered" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onReceive(item)}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Receive into Stock
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
});

ShipmentRow.displayName = "ShipmentRow";

const InTransit = () => {
  const navigate = useNavigate();

  // State management with custom hooks
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(searchInput);
  const { page, pageSize, setPage, reset: resetPage } = usePagination();
  const deleteDialog = useConfirmDialog();
  const [receiveDialog, setReceiveDialog] = useState({
    open: false,
    item: null,
  });
  const [receiveData, setReceiveData] = useState({
    notes: "",
  });

  // Fetch shipments with optimized query
  const { items, total, totalPages, isLoading, error } = useListQuery(
    QUERY_KEYS.inTransitInventory,
    fetchInTransitShipments,
    {
      search: debouncedSearch,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { page, pageSize },
    { staleTime: STALE_TIME.list },
  );

  // Mutations using shared hooks
  const deleteMutation = useDeleteMutation(
    deleteInTransitShipment,
    QUERY_KEYS.inTransitInventory,
    {
      successMessage: "In-transit record deleted",
      errorMessage: "Delete failed",
      onSuccess: () => deleteDialog.close(),
    },
  );

  const receiveMutation = useActionMutation(
    ({ id, data }) => receiveInTransitShipment(id, data),
    QUERY_KEYS.inTransitInventory,
    {
      successMessage: "Stock received at warehouse successfully",
      errorMessage: "Receive failed",
      invalidateKeys: [QUERY_KEYS.warehouseStock],
      onSuccess: () => setReceiveDialog({ open: false, item: null }),
    },
  );

  // Memoized callbacks
  const handleView = useCallback(
    (id) => navigate(`/stock-management/in-transit/${id}`),
    [navigate],
  );

  const handleEdit = useCallback(
    (id) => navigate(`/stock-management/in-transit/${id}/edit`),
    [navigate],
  );

  const handleStatusChange = useCallback(
    (v) => {
      setStatusFilter(v);
      resetPage();
    },
    [resetPage],
  );

  const handleOpenReceiveDialog = useCallback((item) => {
    setReceiveDialog({ open: true, item });
    setReceiveData({ notes: "" });
  }, []);

  const handleReceive = useCallback(() => {
    receiveMutation.mutate({
      id: receiveDialog.item.id,
      data: receiveData,
    });
  }, [receiveData, receiveDialog.item, receiveMutation]);

  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center text-destructive">
          Error loading data: {error.message}
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
            <h1 className="text-2xl font-bold">In-Transit Inventory</h1>
            <p className="text-muted-foreground">
              Track shipments from factory to warehouse
            </p>
          </div>
          <Button onClick={() => navigate("/stock-management/in-transit/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shipment
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tracking number, Factory Order..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_pickup">Pending Pickup</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="customs_hold">Customs Hold</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="exception">Exception</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipments ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Tracking #</th>
                    <th className="text-left p-4 font-medium">Factory Order</th>
                    <th className="text-left p-4 font-medium">Carrier</th>
                    <th className="text-left p-4 font-medium">Items</th>
                    <th className="text-left p-4 font-medium">Ship Date</th>
                    <th className="text-left p-4 font-medium">ETA</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingRow colSpan={8} />
                  ) : items.length === 0 ? (
                    <TableEmptyRow colSpan={8} message="No shipments found" />
                  ) : (
                    items.map((item) => (
                      <ShipmentRow
                        key={item.id}
                        item={item}
                        onView={handleView}
                        onEdit={handleEdit}
                        onReceive={handleOpenReceiveDialog}
                        onDelete={(item) => deleteDialog.open(item)}
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
              <AlertDialogTitle>Delete Shipment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete shipment{" "}
                {deleteDialog.item?.tracking_number || deleteDialog.item?.id}.
                This action cannot be undone.
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

        {/* Receive Dialog */}
        <Dialog
          open={receiveDialog.open}
          onOpenChange={(open) => setReceiveDialog({ open, item: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Receive Stock into Sales</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                All items from shipment{" "}
                <span className="font-medium">
                  {receiveDialog.item?.tracking_number ||
                    receiveDialog.item?.shipment_number}
                </span>{" "}
                will be received directly into Sales stock.
              </p>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={receiveData.notes}
                  onChange={(e) =>
                    setReceiveData({
                      ...receiveData,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Any notes about the receipt..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReceiveDialog({ open: false, item: null })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReceive}
                disabled={receiveMutation.isPending}
              >
                Confirm Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default memo(InTransit);
