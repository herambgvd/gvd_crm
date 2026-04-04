import React, { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchRmaRecords,
} from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  RotateCcw,
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
} from "../hooks";
import {
  StateBadge,
  StateStatsBar,
  TransitionActions,
} from "../../workflow-engine";

// Memoized row
const RMARow = memo(({ item, onView }) => {
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
        <StateBadge stateName={item.current_state_name} stateColor={null} />
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
        {item.sop_id && (
          <TransitionActions
            recordType="rma"
            recordId={item.id}
            invalidateKeys={[[QUERY_KEYS.rmaRecords], [QUERY_KEYS.warehouseStock]]}
          />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

RMARow.displayName = "RMARow";

const RMARecords = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedSopId, setSelectedSopId] = useState("");
  const [stateFilter, setStateFilter] = useState(null);

  const debouncedSearch = useDebounce(search, 400);
  const { page, pageSize, setPage, reset: resetPage } = usePagination();

  const handleSopChange = useCallback((sopId) => {
    setSelectedSopId(sopId);
    setStateFilter(null);
  }, []);

  // Reset page on filter change
  React.useEffect(() => {
    resetPage();
  }, [debouncedSearch, selectedSopId, stateFilter]);

  // Build query params
  const queryParams = React.useMemo(() => {
    const params = { page, page_size: pageSize };
    if (selectedSopId) params.sop_id = selectedSopId;
    if (stateFilter) params.current_state_id = stateFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [page, pageSize, selectedSopId, stateFilter, debouncedSearch]);

  const { data: rmaData, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.rmaRecords, queryParams],
    queryFn: () => fetchRmaRecords(queryParams),
    keepPreviousData: true,
    staleTime: STALE_TIME.list,
  });

  const items = rmaData?.items || [];
  const total = rmaData?.total || 0;
  const totalPages = rmaData?.total_pages || 1;

  const handleView = useCallback(
    (id) => navigate(`/stock-management/rma/${id}`),
    [navigate],
  );

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
            <h1 className="text-lg font-semibold">RMA Records</h1>
            <p className="text-muted-foreground">
              Manage returns, repairs, and defective inventory
            </p>
          </div>
          <Button onClick={() => navigate("/stock-management/rma/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New RMA
          </Button>
        </div>

        {/* Dynamic Stats Cards from Workflow Engine */}
        <StateStatsBar
          module="inventory"
          selectedSopId={selectedSopId}
          onSopChange={handleSopChange}
          onStateFilter={setStateFilter}
          activeStateFilter={stateFilter}
        />

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
                    <th className="text-left p-4 font-medium">Workflow</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingRow colSpan={9} />
                  ) : items.length === 0 ? (
                    <TableEmptyRow colSpan={9} message="No RMA records found" />
                  ) : (
                    items.map((item) => (
                      <RMARow
                        key={item.id}
                        item={item}
                        onView={handleView}
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

      </div>
    </Layout>
  );
};

export default RMARecords;
