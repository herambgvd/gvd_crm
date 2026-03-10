import React, { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchRmaRecords,
  startRmaRepair,
  completeRmaRepair,
  returnRmaToStock,
  returnRmaToCustomer,
  scrapRmaItem,
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
import { Badge } from "../../../components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Wrench,
  CheckCircle,
  PackageCheck,
  UserCheck,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// Shared imports
import { formatDate } from "../utils";
import { RMA_STATUS, QUERY_KEYS, STALE_TIME } from "../constants";
import {
  StatusBadge,
  Pagination,
  TableLoadingRow,
  TableEmptyRow,
  ErrorState,
} from "../components";
import {
  useDebounce,
  usePagination,
  useListQuery,
  useActionMutation,
} from "../hooks";

// Memoized row
const RMARow = memo(({ item, onView, onAction }) => {
  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-4 font-medium">{item.rma_number || "-"}</td>
      <td className="p-4">
        <div>
          <div className="font-medium">{item.product_name}</div>
          <div className="text-sm text-muted-foreground">
            {item.product_sku}
          </div>
        </div>
      </td>
      <td className="p-4">{item.entity_name || "-"}</td>
      <td className="p-4 text-right">{item.quantity}</td>
      <td className="p-4">
        <StatusBadge status={item.status} statusMap={RMA_STATUS} />
      </td>
      <td className="p-4">
        {item.is_warranty_claim ? (
          <Badge variant="outline" className="text-blue-600">
            Warranty
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </td>
      <td className="p-4 text-sm text-muted-foreground">
        {formatDate(item.created_at)}
      </td>
      <td className="p-4">
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
            {item.status === "received" || item.status === "under_review" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction("start_repair", item)}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Start Repair
                </DropdownMenuItem>
              </>
            ) : null}
            {item.status === "repairing" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction("complete_repair", item)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Repair
                </DropdownMenuItem>
              </>
            ) : null}
            {item.status === "repaired" || item.status === "under_review" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction("return_to_stock", item)}
                >
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Return to Stock
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("return_to_customer", item)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Return to Customer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onAction("scrap", item)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Scrap Item
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

RMARow.displayName = "RMARow";

// Action dialog state
const INITIAL_DIALOG = { type: null, item: null, open: false };

const RMARecords = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState(INITIAL_DIALOG);
  const [actionForm, setActionForm] = useState({
    notes: "",
    stock_type: "sales",
    tracking_number: "",
  });

  const debouncedSearch = useDebounce(search, 400);
  const { page, pageSize, setPage, reset: resetPage } = usePagination();

  const { items, total, totalPages, isLoading, error } = useListQuery(
    QUERY_KEYS.rmaRecords,
    fetchRmaRecords,
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { page, pageSize },
    { staleTime: STALE_TIME.list },
  );

  // Action mutations
  const startRepairMutation = useActionMutation(
    (id) => startRmaRepair(id),
    [QUERY_KEYS.rmaRecords],
    {
      successMessage: "Repair started",
      onSuccess: () => setActionDialog(INITIAL_DIALOG),
    },
  );

  const completeRepairMutation = useActionMutation(
    ({ id, notes }) => completeRmaRepair(id, notes),
    [QUERY_KEYS.rmaRecords],
    {
      successMessage: "Repair completed",
      onSuccess: () => setActionDialog(INITIAL_DIALOG),
    },
  );

  const returnToStockMutation = useActionMutation(
    ({ id, data }) => returnRmaToStock(id, data),
    [QUERY_KEYS.rmaRecords, QUERY_KEYS.warehouseStock],
    {
      successMessage: "Item returned to stock",
      onSuccess: () => setActionDialog(INITIAL_DIALOG),
    },
  );

  const returnToCustomerMutation = useActionMutation(
    ({ id, data }) => returnRmaToCustomer(id, data),
    [QUERY_KEYS.rmaRecords],
    {
      successMessage: "Item returned to customer",
      onSuccess: () => setActionDialog(INITIAL_DIALOG),
    },
  );

  const scrapMutation = useActionMutation(
    ({ id, notes }) => scrapRmaItem(id, notes),
    [QUERY_KEYS.rmaRecords, QUERY_KEYS.warehouseStock],
    {
      successMessage: "Item scrapped",
      onSuccess: () => setActionDialog(INITIAL_DIALOG),
    },
  );

  const handleView = useCallback(
    (id) => navigate(`/stock-management/rma/${id}`),
    [navigate],
  );

  const handleAction = useCallback((type, item) => {
    setActionForm({ notes: "", stock_type: "sales", tracking_number: "" });
    setActionDialog({ type, item, open: true });
  }, []);

  const handleActionConfirm = useCallback(() => {
    const { type, item } = actionDialog;
    switch (type) {
      case "start_repair":
        startRepairMutation.mutate(item.id);
        break;
      case "complete_repair":
        completeRepairMutation.mutate({ id: item.id, notes: actionForm.notes });
        break;
      case "return_to_stock":
        returnToStockMutation.mutate({
          id: item.id,
          data: { stock_type: actionForm.stock_type, notes: actionForm.notes },
        });
        break;
      case "return_to_customer":
        returnToCustomerMutation.mutate({
          id: item.id,
          data: {
            tracking_number: actionForm.tracking_number || undefined,
            notes: actionForm.notes,
          },
        });
        break;
      case "scrap":
        scrapMutation.mutate({ id: item.id, notes: actionForm.notes });
        break;
    }
  }, [
    actionDialog,
    actionForm,
    startRepairMutation,
    completeRepairMutation,
    returnToStockMutation,
    returnToCustomerMutation,
    scrapMutation,
  ]);

  const isActionPending =
    startRepairMutation.isPending ||
    completeRepairMutation.isPending ||
    returnToStockMutation.isPending ||
    returnToCustomerMutation.isPending ||
    scrapMutation.isPending;

  const actionDialogTitle =
    {
      start_repair: "Start Repair",
      complete_repair: "Complete Repair",
      return_to_stock: "Return to Stock",
      return_to_customer: "Return to Customer",
      scrap: "Scrap Item",
    }[actionDialog.type] || "";

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <ErrorState error={error} />
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
            <h1 className="text-2xl font-bold">RMA Records</h1>
            <p className="text-muted-foreground">
              Manage returns, repairs, and defective inventory
            </p>
          </div>
          <Button onClick={() => navigate("/stock-management/rma/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New RMA
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by RMA number, product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              resetPage();
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(RMA_STATUS).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              RMA Records ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">RMA #</th>
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-right p-4 font-medium">Qty</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Warranty</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingRow colSpan={8} />
                  ) : items.length === 0 ? (
                    <TableEmptyRow colSpan={8} message="No RMA records found" />
                  ) : (
                    items.map((item) => (
                      <RMARow
                        key={item.id}
                        item={item}
                        onView={handleView}
                        onAction={handleAction}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog
          open={actionDialog.open}
          onOpenChange={(open) => !open && setActionDialog(INITIAL_DIALOG)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionDialogTitle}</DialogTitle>
              <DialogDescription>
                RMA {actionDialog.item?.rma_number} —{" "}
                {actionDialog.item?.product_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {actionDialog.type === "return_to_stock" && (
                <div>
                  <Label>Return to Stock Type *</Label>
                  <Select
                    value={actionForm.stock_type}
                    onValueChange={(v) =>
                      setActionForm({ ...actionForm, stock_type: v })
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
                </div>
              )}
              {actionDialog.type === "return_to_customer" && (
                <div>
                  <Label htmlFor="tracking_number">
                    Return Tracking Number
                  </Label>
                  <Input
                    id="tracking_number"
                    value={actionForm.tracking_number}
                    onChange={(e) =>
                      setActionForm({
                        ...actionForm,
                        tracking_number: e.target.value,
                      })
                    }
                    placeholder="e.g., 1Z999AA10123456784"
                  />
                </div>
              )}
              {actionDialog.type !== "start_repair" && (
                <div>
                  <Label htmlFor="action_notes">Notes</Label>
                  <Input
                    id="action_notes"
                    value={actionForm.notes}
                    onChange={(e) =>
                      setActionForm({ ...actionForm, notes: e.target.value })
                    }
                    placeholder="Optional notes..."
                  />
                </div>
              )}
              {actionDialog.type === "scrap" && (
                <p className="text-sm text-destructive">
                  Warning: This will permanently remove the item from inventory.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog(INITIAL_DIALOG)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleActionConfirm}
                disabled={isActionPending}
                variant={
                  actionDialog.type === "scrap" ? "destructive" : "default"
                }
              >
                {actionDialogTitle}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RMARecords;
