import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchLeads, fetchLeadStats, updateLead, deleteLead } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
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
  ArrowRight,
  Trash2,
  Search,
  User,
  XCircle,
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

const STATUS_OPTIONS = [
  { value: "new_lead", label: "New Lead" },
  { value: "under_review", label: "Under Review" },
  { value: "solution_design", label: "Solution Design" },
  { value: "proposal_submitted", label: "Proposal Submitted" },
  { value: "under_negotiation", label: "Under Negotiation" },
  { value: "poc_evaluation", label: "POC / Tech Eval" },
  { value: "price_finalization", label: "Price Finalization" },
  { value: "pi_issued", label: "PI Issued" },
  { value: "order_won", label: "Order Won" },
  { value: "order_processing", label: "Order Processing" },
  { value: "project_execution", label: "Project Execution" },
  { value: "project_completed", label: "Project Completed" },
  { value: "lost", label: "Lost" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_COLORS = {
  new_lead: "bg-blue-50 text-blue-700 ring-blue-600/20",
  under_review: "bg-sky-50 text-sky-700 ring-sky-600/20",
  solution_design: "bg-violet-50 text-violet-700 ring-violet-600/20",
  proposal_submitted: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  under_negotiation: "bg-amber-50 text-amber-700 ring-amber-600/20",
  poc_evaluation: "bg-orange-50 text-orange-700 ring-orange-600/20",
  price_finalization: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  pi_issued: "bg-lime-50 text-lime-700 ring-lime-600/20",
  order_won: "bg-green-50 text-green-700 ring-green-600/20",
  order_processing: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  project_execution: "bg-teal-50 text-teal-700 ring-teal-600/20",
  project_completed: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  lost: "bg-red-50 text-red-700 ring-red-600/20",
};

const PRIORITY_COLORS = {
  low: "bg-gray-50 text-gray-600 ring-gray-500/20",
  medium: "bg-blue-50 text-blue-600 ring-blue-500/20",
  high: "bg-orange-50 text-orange-600 ring-orange-500/20",
  urgent: "bg-red-50 text-red-600 ring-red-500/20",
};

const Leads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [leadToDelete, setLeadToDelete] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
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
  }, [debouncedSearch, statusFilter, priorityFilter, pageSize]);

  // Build query params
  const queryParams = React.useMemo(() => {
    const params = { page: currentPage, page_size: pageSize };
    if (statusFilter !== "all") params.status = statusFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [currentPage, pageSize, statusFilter, priorityFilter, debouncedSearch]);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads", queryParams],
    queryFn: () => fetchLeads(queryParams),
    keepPreviousData: true,
  });

  const { data: stats } = useQuery({
    queryKey: ["lead-stats"],
    queryFn: fetchLeadStats,
  });

  const leads = leadsData?.items || [];
  const totalPages = leadsData?.total_pages || 1;
  const totalItems = leadsData?.total || 0;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateLead(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      toast.success("Lead status updated!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
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

  const getStatusBadge = (status) => {
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
    return (
      <Badge className={`${STATUS_COLORS[status] || STATUS_COLORS.new_lead} ring-1 ring-inset`}>
        {label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => (
    <Badge
      className={`${PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium} ring-1 ring-inset text-xs`}
    >
      {priority}
    </Badge>
  );

  const WORKFLOW_NEXT = {
    new_lead: "under_review",
    under_review: "solution_design",
    solution_design: "proposal_submitted",
    proposal_submitted: "under_negotiation",
    under_negotiation: "poc_evaluation",
    poc_evaluation: "price_finalization",
    price_finalization: "pi_issued",
    pi_issued: "order_won",
    order_won: "order_processing",
    order_processing: "project_execution",
    project_execution: "project_completed",
  };

  const getNextStatus = (currentStatus) => WORKFLOW_NEXT[currentStatus];

  const getNextStatusLabel = (currentStatus) => {
    const next = WORKFLOW_NEXT[currentStatus];
    if (!next) return null;
    return STATUS_OPTIONS.find((s) => s.value === next)?.label || next;
  };

  const handleStatusChange = (leadId, currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      updateStatusMutation.mutate({ id: leadId, status: nextStatus });
    }
  };

  const handleMarkAsLost = (leadId) => {
    updateStatusMutation.mutate({ id: leadId, status: "lost" });
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
            <h1 className="text-4xl font-bold font-heading tracking-tight">
              Leads
            </h1>
            <p className="text-gray-600 mt-2">
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            {STATUS_OPTIONS.map((s) => (
              <Card
                key={s.value}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() =>
                  setStatusFilter(statusFilter === s.value ? "all" : s.value)
                }
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.by_status?.[s.value] || 0}
                  </p>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Pipeline
                </p>
                <p className="text-lg font-bold flex items-center">
                  <IndianRupee className="h-4 w-4" />
                  {(stats.pipeline_value || 0).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
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
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority-filter">Priority</Label>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger id="priority-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary and Page Size */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {leads.length} of {totalItems} leads
            {stats?.conversion_rate > 0 && (
              <span className="ml-3 inline-flex items-center text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.conversion_rate}% conversion
              </span>
            )}
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
                      {getStatusBadge(lead.status)}
                      {lead.priority &&
                        lead.priority !== "medium" &&
                        getPriorityBadge(lead.priority)}
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

                    {/* Workflow Actions */}
                    {lead.status !== "project_completed" && lead.status !== "lost" && (
                      <div className="pt-3 border-t flex gap-2">
                        {getNextStatus(lead.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleStatusChange(lead.id, lead.status)}
                            disabled={updateStatusMutation.isPending}
                            data-testid="status-change-btn"
                          >
                            <ArrowRight className="h-3 w-3 mr-2" />
                            {getNextStatusLabel(lead.status)}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleMarkAsLost(lead.id)}
                          disabled={updateStatusMutation.isPending}
                          title="Mark as Lost"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
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
