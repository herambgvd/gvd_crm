import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchLeads, deleteLead } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Plus,
  Edit,
  Phone,
  Mail,
  Building,
  Eye,
  Trash2,
  Search,
  User,
  IndianRupee,
  TrendingUp,
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
  StateBadge,
  StateStatsBar,
  TransitionActions,
} from "../../workflow-engine";

const Leads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [leadToDelete, setLeadToDelete] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState(null);
  const [selectedSopId, setSelectedSopId] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, stateFilter, selectedSopId, pageSize]);

  const handleSopChange = React.useCallback((sopId) => {
    setSelectedSopId(sopId);
    setStateFilter(null);
  }, []);

  // Build query params
  const queryParams = React.useMemo(() => {
    const params = { page: currentPage, page_size: pageSize };
    if (selectedSopId) params.sop_id = selectedSopId;
    if (stateFilter) params.current_state_id = stateFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [currentPage, pageSize, selectedSopId, stateFilter, debouncedSearch]);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads", queryParams],
    queryFn: () => fetchLeads(queryParams),
    keepPreviousData: true,
  });

  const leads = leadsData?.items || [];
  const totalPages = leadsData?.total_pages || 1;
  const totalItems = leadsData?.total || 0;

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-stats"] });
      toast.success("Lead deleted successfully!");
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete lead");
      setDeleteDialogOpen(false);
    },
  });

  const handleDelete = (lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id);
    }
  };

  if (isLoading) {
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
      <div className="space-y-6" data-testid="leads-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Leads
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your sales leads across all channels
            </p>
          </div>
          <Button
            onClick={() => navigate("/leads/new")}
            data-testid="create-lead-btn"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>

        {/* Dynamic Stats Cards from Workflow Engine */}
        <StateStatsBar
          module="sales"
          selectedSopId={selectedSopId}
          onSopChange={handleSopChange}
          onStateFilter={setStateFilter}
          activeStateFilter={stateFilter}
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by project, source, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary and Page Size */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {leads.length} of {totalItems} leads
          </p>
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-sm">
              Per page:
            </Label>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger id="page-size" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  {debouncedSearch || statusFilter !== "all" || priorityFilter !== "all"
                    ? "No leads match your filters."
                    : "No leads found. Create your first lead!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            leads.map((lead) => (
              <Card
                key={lead.id}
                className="border border-gray-200 hover:shadow-md transition-all"
                data-testid="lead-card"
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl font-heading text-blue-600">
                          {lead.project_name || "Untitled Project"}
                        </h3>
                        {(lead.customer_name || lead.company) && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <Building className="h-3 w-3" />
                            <span>{lead.customer_name || lead.company}</span>
                          </div>
                        )}
                        {lead.contact_name && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                            <User className="h-3 w-3" />
                            <span>{lead.contact_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          data-testid="view-lead-btn"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/leads/edit/${lead.id}`)}
                          data-testid="edit-lead-btn"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead)}
                          data-testid="delete-lead-btn"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {lead.contact_email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="font-mono text-xs">
                            {lead.contact_email}
                          </span>
                        </div>
                      )}
                      {lead.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span className="font-mono text-xs">{lead.contact_phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <StateBadge
                        stateName={lead.current_state_name}
                        stateColor={null}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                      <span>Source: {lead.source}</span>
                      {lead.expected_value && (
                        <span className="flex items-center text-green-600 font-semibold">
                          <IndianRupee className="h-3 w-3" />
                          {Number(lead.expected_value).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {lead.notes && (
                      <p className="text-sm text-gray-600 border-t pt-3 line-clamp-2">
                        {lead.notes}
                      </p>
                    )}

                    {/* Workflow Transition Actions */}
                    {lead.sop_id && (
                      <div className="pt-3 border-t">
                        <TransitionActions
                          recordType="lead"
                          recordId={lead.id}
                          invalidateKeys={[["leads"]]}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                lead
                <strong className="block mt-2 text-foreground">
                  {leadToDelete?.project_name || leadToDelete?.customer_name || leadToDelete?.company || "this lead"}
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
      </div>
    </Layout>
  );
};

export default Leads;
