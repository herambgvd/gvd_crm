import React, { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchDemandForecasts,
  deleteDemandForecast,
  convertForecastToOrder,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
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
  Factory,
  TrendingUp,
} from "lucide-react";

// Shared imports
import { formatDate } from "../utils";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import {
  Pagination,
  TableLoadingRow,
  TableEmptyRow,
  ErrorState,
} from "../components";
import {
  useDebounce,
  usePagination,
  useDeleteMutation,
  useActionMutation,
  useListQuery,
} from "../hooks";

// Helper: Format period (2024-01 -> Jan 2024)
const formatPeriod = (period) => {
  if (!period) return "-";
  const [year, month] = period.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

// Memoized table row component
const ForecastRow = memo(({ item, onView, onEdit, onConvert, onDelete }) => {
  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-4">
        <div>
          <div className="font-medium">{item.product_name}</div>
          <div className="text-sm text-muted-foreground">
            {item.product_sku}
          </div>
        </div>
      </td>
      <td className="p-4">{formatPeriod(item.forecast_period)}</td>
      <td className="p-4 text-right">{item.forecasted_demand ?? 0}</td>
      <td className="p-4 text-right">
        <span
          className={
            (item.recommended_order_qty || 0) > 0
              ? "text-orange-600 font-medium"
              : "text-green-600"
          }
        >
          {item.recommended_order_qty ?? 0}
        </span>
      </td>
      <td className="p-4">
        {item.confidence_level && (
          <Badge
            variant={
              item.confidence_level === "high"
                ? "success"
                : item.confidence_level === "medium"
                  ? "warning"
                  : "secondary"
            }
          >
            {item.confidence_level.charAt(0).toUpperCase() +
              item.confidence_level.slice(1)}
          </Badge>
        )}
      </td>
      <td className="p-4">
        {item.is_converted_to_po ? (
          <Badge variant="success">Yes</Badge>
        ) : (
          <Badge variant="outline">No</Badge>
        )}
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
            <DropdownMenuItem onClick={() => onEdit(item.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {!item.is_converted_to_po && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onConvert(item)}>
                  <Factory className="h-4 w-4 mr-2" />
                  Convert to PO
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

ForecastRow.displayName = "ForecastRow";

const DemandForecasts = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [convertDialog, setConvertDialog] = useState({
    open: false,
    forecast: null,
  });
  const [convertForm, setConvertForm] = useState({
    factory_name: "",
    unit_price: "",
  });

  // Custom hooks
  const debouncedSearch = useDebounce(search, 400);
  const pagination = usePagination({ pageSize: 20 });

  // List query with shared hook
  const { items, total, totalPages, isLoading, error } = useListQuery(
    QUERY_KEYS.demandForecasts,
    fetchDemandForecasts,
    { search: debouncedSearch },
    pagination,
    { staleTime: STALE_TIME.list },
  );

  // Delete mutation
  const deleteMutation = useDeleteMutation(
    deleteDemandForecast,
    [QUERY_KEYS.demandForecasts],
    { successMessage: "Forecast deleted" },
  );

  // Convert mutation
  const convertMutation = useActionMutation(
    ({ id, data }) => convertForecastToOrder(id, data),
    [QUERY_KEYS.demandForecasts],
    {
      successMessage: "Converted to factory order successfully",
      invalidateKeys: [QUERY_KEYS.factoryOrders],
      onSuccess: (data) => {
        setConvertDialog({ open: false, forecast: null });
        navigate(`/stock-management/factory-orders/${data.id}`);
      },
    },
  );

  // Event handlers with useCallback
  const handleSearchChange = useCallback(
    (e) => {
      setSearch(e.target.value);
      pagination.reset();
    },
    [pagination],
  );

  const handleView = useCallback(
    (id) => {
      navigate(`/stock-management/demand-forecasts/${id}`);
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (id) => {
      navigate(`/stock-management/demand-forecasts/${id}/edit`);
    },
    [navigate],
  );

  const handleConvert = useCallback((item) => {
    setConvertForm({ factory_name: "", unit_price: "" });
    setConvertDialog({ open: true, forecast: item });
  }, []);

  const handleConvertSubmit = useCallback(() => {
    if (!convertForm.factory_name || !convertForm.unit_price) return;
    convertMutation.mutate({
      id: convertDialog.forecast.id,
      data: {
        factory_name: convertForm.factory_name,
        unit_price: parseFloat(convertForm.unit_price),
      },
    });
  }, [convertForm, convertDialog.forecast, convertMutation]);

  const handleDelete = useCallback(
    (id) => {
      if (window.confirm("Delete this forecast?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation],
  );

  if (error) {
    return (
      <Layout>
        <ErrorState message={error.message} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Demand Forecasts</h1>
            <p className="text-muted-foreground">
              Plan inventory based on expected demand
            </p>
          </div>
          <Button
            onClick={() => navigate("/stock-management/demand-forecasts/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Forecast
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Forecasts ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium">Period</th>
                    <th className="text-right p-4 font-medium">
                      Forecasted Qty
                    </th>
                    <th className="text-right p-4 font-medium">
                      Recommended Order
                    </th>
                    <th className="text-left p-4 font-medium">Confidence</th>
                    <th className="text-left p-4 font-medium">Converted</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingRow colSpan={7} />
                  ) : items.length === 0 ? (
                    <TableEmptyRow colSpan={7} message="No forecasts found" />
                  ) : (
                    items.map((item) => (
                      <ForecastRow
                        key={item.id}
                        item={item}
                        onView={handleView}
                        onEdit={handleEdit}
                        onConvert={handleConvert}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.page}
              totalPages={totalPages}
              onPageChange={pagination.setPage}
            />
          </CardContent>
        </Card>
      </div>

      {/* Convert to PO Dialog */}
      <Dialog
        open={convertDialog.open}
        onOpenChange={(open) =>
          !open && setConvertDialog({ open: false, forecast: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Factory Order</DialogTitle>
            <DialogDescription>
              Creating a PO for{" "}
              <strong>{convertDialog.forecast?.product_name}</strong> —{" "}
              {convertDialog.forecast?.forecasted_demand ?? 0} units needed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="factory_name">Factory / Supplier Name *</Label>
              <Input
                id="factory_name"
                value={convertForm.factory_name}
                onChange={(e) =>
                  setConvertForm({
                    ...convertForm,
                    factory_name: e.target.value,
                  })
                }
                placeholder="e.g., Acme Manufacturing"
              />
            </div>
            <div>
              <Label htmlFor="unit_price">Unit Price (₹) *</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={convertForm.unit_price}
                onChange={(e) =>
                  setConvertForm({
                    ...convertForm,
                    unit_price: e.target.value,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertDialog({ open: false, forecast: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertSubmit}
              disabled={
                convertMutation.isPending ||
                !convertForm.factory_name ||
                !convertForm.unit_price
              }
            >
              <Factory className="h-4 w-4 mr-2" />
              Create Factory Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DemandForecasts;
