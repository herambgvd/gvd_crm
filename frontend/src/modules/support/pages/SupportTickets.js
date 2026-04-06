import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchTickets, deleteTicket } from "../api";
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
  Eye,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TicketIcon,
  Upload,
  Package,
  FolderOpen,
  Tag,
  MapPin,
  Calendar,
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
import { ImportWizard } from "../../import-wizard";

const SupportTickets = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [importOpen, setImportOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState(null);
  const [selectedSopId, setSelectedSopId] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stateFilter, selectedSopId, priorityFilter]);

  const handleSopChange = useCallback((sopId) => {
    setSelectedSopId(sopId);
    setStateFilter(null);
  }, []);

  const handlePriorityChange = useCallback((v) => {
    setPriorityFilter(v);
    setCurrentPage(1);
  }, []);

  // ── Queries ──
  const { data: ticketData, isLoading } = useQuery({
    queryKey: [
      "support-tickets",
      currentPage,
      pageSize,
      stateFilter,
      selectedSopId,
      priorityFilter,
      searchQuery,
    ],
    queryFn: () =>
      fetchTickets({
        page: currentPage,
        page_size: pageSize,
        sop_id: selectedSopId || undefined,
        current_state_id: stateFilter || undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        search: searchQuery || undefined,
      }),
  });

  const tickets = ticketData?.items || [];
  const totalPages = ticketData?.total_pages || 0;
  const totalTickets = ticketData?.total || 0;

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-stats"] });
      toast.success("Ticket deleted!");
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete");
      setDeleteDialogOpen(false);
    },
  });

  // ── Handlers ──
  const handleDelete = (ticket) => {
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = () => {
    if (ticketToDelete) deleteMutation.mutate(ticketToDelete.id);
  };

  // ── Style helpers ──
  const getPriorityBadge = (priority) =>
    ({
      Low: "bg-slate-50 text-slate-700 ring-slate-600/20",
      Medium: "bg-blue-50 text-blue-700 ring-blue-600/20",
      High: "bg-orange-50 text-orange-700 ring-orange-600/20",
      Critical: "bg-red-50 text-red-700 ring-red-600/20",
    })[priority] || "bg-blue-50 text-blue-700 ring-blue-600/20";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header + Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Support Tickets
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage technical support tickets and track resolution progress
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/support/tickets/new")}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Ticket
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select
                value={priorityFilter}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="h-8 text-xs w-full md:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {totalTickets} tickets
            </span>
          </div>
        </div>

        {/* Dynamic Stats Cards from Workflow Engine */}
        <StateStatsBar
          module="support"
          selectedSopId={selectedSopId}
          onSopChange={handleSopChange}
          onStateFilter={setStateFilter}
          activeStateFilter={stateFilter}
        />

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                  <TicketIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || stateFilter || priorityFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first support ticket to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="border border-gray-200 hover:shadow-md transition-all"
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl font-heading text-blue-600">
                          {ticket.ticket_number}
                        </h3>
                        {ticket.customer_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            {ticket.customer_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getPriorityBadge(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ticket)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {ticket.product_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package className="h-3 w-3" />
                          <span>{ticket.product_name}</span>
                        </div>
                      )}
                      {ticket.project_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FolderOpen className="h-3 w-3" />
                          <span>{ticket.project_name}</span>
                        </div>
                      )}
                      {ticket.ticket_type && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Tag className="h-3 w-3" />
                          <span>{ticket.ticket_type}</span>
                        </div>
                      )}
                      {ticket.location_site && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{ticket.location_site}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <StateBadge
                        stateName={ticket.current_state_name}
                        stateColor={null}
                      />
                    </div>

                    <div className="flex items-center text-xs text-gray-500 font-mono">
                      <Calendar className="h-3 w-3 mr-1" />
                      {ticket.created_at
                        ? new Date(ticket.created_at).toLocaleDateString()
                        : "N/A"}
                    </div>

                    {/* Workflow Transition Actions */}
                    {ticket.sop_id && (
                      <div className="pt-3 border-t">
                        <TransitionActions
                          recordType="ticket"
                          recordId={ticket.id}
                          invalidateKeys={[["support-tickets"]]}
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalTickets} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete ticket{" "}
                {ticketToDelete?.ticket_number}? This action cannot be undone.
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
      </div>

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="ticket"
        onImportComplete={() =>
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
        }
      />
    </Layout>
  );
};

export default SupportTickets;
