import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchEnquiries, deleteEnquiry, convertEnquiryToLead } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
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
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowRightCircle,
  Calendar,
  User,
  IndianRupee,
  Building2,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  new: { label: "New", class: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  in_review: {
    label: "In Review",
    class: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  },
  qualified: {
    label: "Qualified",
    class: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  converted: {
    label: "Converted",
    class: "bg-purple-50 text-purple-700 ring-purple-600/20",
  },
  rejected: {
    label: "Rejected",
    class: "bg-red-50 text-red-700 ring-red-600/20",
  },
  on_hold: {
    label: "On Hold",
    class: "bg-gray-50 text-gray-700 ring-gray-600/20",
  },
  closed: {
    label: "Closed",
    class: "bg-slate-50 text-slate-700 ring-slate-600/20",
  },
};

const priorityConfig = {
  low: { label: "Low", class: "bg-gray-50 text-gray-600" },
  medium: { label: "Medium", class: "bg-blue-50 text-blue-600" },
  high: { label: "High", class: "bg-orange-50 text-orange-600" },
  urgent: { label: "Urgent", class: "bg-red-50 text-red-600" },
};

const sourceLabels = {
  walk_in: "Walk-in",
  phone: "Phone",
  email: "Email",
  website: "Website",
  referral: "Referral",
  social_media: "Social Media",
  trade_show: "Trade Show",
  other: "Other",
};

const Enquiries = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [enquiryToConvert, setEnquiryToConvert] = useState(null);

  // Build query params
  const queryParams = {
    page: currentPage,
    page_size: pageSize,
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(priorityFilter !== "all" && { priority: priorityFilter }),
    ...(searchQuery && { search: searchQuery }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["enquiries", queryParams],
    queryFn: () => fetchEnquiries(queryParams),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEnquiry,
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiries"]);
      toast.success("Enquiry deleted successfully!");
      setDeleteDialogOpen(false);
      setEnquiryToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete enquiry");
      setDeleteDialogOpen(false);
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id) => convertEnquiryToLead(id, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["enquiries"]);
      queryClient.invalidateQueries(["leads"]);
      toast.success("Enquiry converted to lead successfully!");
      setConvertDialogOpen(false);
      setEnquiryToConvert(null);
      if (data?.lead?.id) {
        navigate(`/leads/${data.lead.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to convert enquiry");
      setConvertDialogOpen(false);
    },
  });

  const handleDelete = (enquiry) => {
    setEnquiryToDelete(enquiry);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (enquiryToDelete) {
      deleteMutation.mutate(enquiryToDelete.id);
    }
  };

  const handleConvert = (enquiry) => {
    setEnquiryToConvert(enquiry);
    setConvertDialogOpen(true);
  };

  const confirmConvert = () => {
    if (enquiryToConvert) {
      convertMutation.mutate(enquiryToConvert.id);
    }
  };

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter]);

  const totalPages = data?.total_pages || 1;
  const enquiries = data?.items || [];
  const totalCount = data?.total || 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "INR") => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Enquiries
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage enquiries and convert them to leads
            </p>
          </div>
          <Button onClick={() => navigate("/enquiries/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Enquiry
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by project name, person, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.entries(priorityConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>
            Showing {enquiries.length} of {totalCount} enquiries
          </span>
        </div>

        {/* Enquiry Cards */}
        {enquiries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No enquiries found
              </h3>
              <p className="text-gray-500 mt-1">
                {searchQuery ||
                statusFilter !== "all" ||
                priorityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first enquiry to get started"}
              </p>
              {!searchQuery &&
                statusFilter === "all" &&
                priorityFilter === "all" && (
                  <Button
                    className="mt-4"
                    onClick={() => navigate("/enquiries/new")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Enquiry
                  </Button>
                )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enquiries.map((enquiry) => {
              const status = statusConfig[enquiry.status] || statusConfig.new;
              const priority =
                priorityConfig[enquiry.priority] || priorityConfig.medium;

              return (
                <Card
                  key={enquiry.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/enquiries/${enquiry.id}`)}
                >
                  <CardContent className="p-5">
                    {/* Top row: Number + Status + Priority */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">
                          {enquiry.enquiry_number}
                        </span>
                        <Badge
                          className={`${status.class} ring-1 ring-inset text-xs`}
                        >
                          {status.label}
                        </Badge>
                        <Badge
                          className={`${priority.class} text-xs`}
                          variant="secondary"
                        >
                          {priority.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Project Name */}
                    <h3 className="font-semibold text-base text-gray-900 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {enquiry.project_name}
                    </h3>

                    {/* Details preview */}
                    {enquiry.details && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {enquiry.details}
                      </p>
                    )}

                    {/* Info rows */}
                    <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{enquiry.person_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          {formatDate(enquiry.date || enquiry.created_at)}
                        </span>
                      </div>
                      {enquiry.budget && (
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                          <span>
                            {formatCurrency(enquiry.budget, enquiry.currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Entity connections */}
                    {enquiry.entity_connections?.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        {enquiry.entity_connections.slice(0, 2).map((ec, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs font-normal"
                          >
                            {ec.entity_name || ec.entity_id}
                          </Badge>
                        ))}
                        {enquiry.entity_connections.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{enquiry.entity_connections.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer: Source + counts + actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>
                          {sourceLabels[enquiry.source] || enquiry.source}
                        </span>
                        {enquiry.remarks_count > 0 && (
                          <span className="flex items-center gap-0.5">
                            <StickyNote className="h-3 w-3" />
                            {enquiry.remarks_count}
                          </span>
                        )}
                        {enquiry.comments_count > 0 && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" />
                            {enquiry.comments_count}
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/enquiries/${enquiry.id}`)}
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {enquiry.status !== "converted" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                navigate(`/enquiries/edit/${enquiry.id}`)
                              }
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => handleConvert(enquiry)}
                              title="Convert to Lead"
                            >
                              <ArrowRightCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(enquiry)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{enquiryToDelete?.project_name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Lead Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Lead</DialogTitle>
            <DialogDescription>
              Convert enquiry{" "}
              <strong>{enquiryToConvert?.enquiry_number}</strong> —{" "}
              <strong>{enquiryToConvert?.project_name}</strong> into a new lead?
              This will change the enquiry status to "Converted".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmConvert}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Convert to Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Enquiries;
