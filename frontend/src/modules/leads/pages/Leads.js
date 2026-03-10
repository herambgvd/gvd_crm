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
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const CHANNEL_OPTIONS = [
  { value: "consultant", label: "Consultant" },
  { value: "project", label: "Project" },
  { value: "oem", label: "B2B/OEM" },
  { value: "distributor", label: "Distributor" },
  { value: "dealer", label: "Dealer" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_COLORS = {
  new: "bg-blue-50 text-blue-700 ring-blue-600/20",
  qualified: "bg-purple-50 text-purple-700 ring-purple-600/20",
  contacted: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  converted: "bg-green-50 text-green-700 ring-green-600/20",
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
  const [channelFilter, setChannelFilter] = React.useState("all");
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
  }, [debouncedSearch, statusFilter, channelFilter, priorityFilter, pageSize]);

  // Build query params
  const queryParams = React.useMemo(() => {
    const params = { page: currentPage, page_size: pageSize };
    if (statusFilter !== "all") params.status = statusFilter;
    if (channelFilter !== "all") params.channel = channelFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [
    currentPage,
    pageSize,
    statusFilter,
    channelFilter,
    priorityFilter,
    debouncedSearch,
  ]);

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

  const getStatusBadge = (status) => (
    <Badge
      className={`${STATUS_COLORS[status] || STATUS_COLORS.new} ring-1 ring-inset`}
    >
      {status}
    </Badge>
  );

  const getChannelBadge = (channel) => {
    const label =
      CHANNEL_OPTIONS.find((c) => c.value === channel)?.label || channel;
    return <Badge variant="outline">{label}</Badge>;
  };

  const getPriorityBadge = (priority) => (
    <Badge
      className={`${PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium} ring-1 ring-inset text-xs`}
    >
      {priority}
    </Badge>
  );

  const getNextStatus = (currentStatus) => {
    const workflow = {
      new: "qualified",
      qualified: "contacted",
      contacted: "converted",
    };
    return workflow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      new: "Mark as Qualified",
      qualified: "Mark as Contacted",
      contacted: "Mark as Converted",
    };
    return labels[currentStatus];
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by project, contact, company, email, phone..."
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
                <Label htmlFor="channel-filter">Channel</Label>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger id="channel-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {CHANNEL_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
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
                  {debouncedSearch ||
                  statusFilter !== "all" ||
                  channelFilter !== "all" ||
                  priorityFilter !== "all"
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
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <User className="h-3 w-3" />
                          <span>{lead.contact_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                          <Building className="h-3 w-3" />
                          <span>{lead.company}</span>
                        </div>
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
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono text-xs">
                          {lead.contact_phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getChannelBadge(lead.channel)}
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
                    {lead.status !== "converted" && lead.status !== "lost" && (
                      <div className="pt-3 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            handleStatusChange(lead.id, lead.status)
                          }
                          disabled={updateStatusMutation.isPending}
                          data-testid="status-change-btn"
                        >
                          <ArrowRight className="h-3 w-3 mr-2" />
                          {getNextStatusLabel(lead.status)}
                        </Button>
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
                  {leadToDelete?.contact_name} ({leadToDelete?.company})
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
