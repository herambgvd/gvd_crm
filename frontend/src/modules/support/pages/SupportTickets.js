import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchTickets,
  deleteTicket,
} from "../api";
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

const SupportTickets = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Support Tickets
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage technical support tickets and track resolution progress
            </p>
          </div>
          <Button onClick={() => navigate("/support/tickets/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {/* Dynamic Stats Cards from Workflow Engine */}
        <StateStatsBar
          module="support"
          selectedSopId={selectedSopId}
          onSopChange={handleSopChange}
          onStateFilter={setStateFilter}
          activeStateFilter={stateFilter}
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={priorityFilter}
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {ticket.ticket_number}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {ticket.customer_name}
                      </p>
                    </div>
                    <Badge className={getPriorityBadge(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <StateBadge
                      stateName={ticket.current_state_name}
                      stateColor={null}
                    />
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {ticket.product_name && (
                      <div>
                        <span className="font-medium">Product:</span>{" "}
                        {ticket.product_name}
                      </div>
                    )}
                    {ticket.project_name && (
                      <div>
                        <span className="font-medium">Project:</span>{" "}
                        {ticket.project_name}
                      </div>
                    )}
                    {ticket.ticket_type && (
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {ticket.ticket_type}
                      </div>
                    )}
                    {ticket.location_site && (
                      <div>
                        <span className="font-medium">Location:</span>{" "}
                        {ticket.location_site}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    Created:{" "}
                    {ticket.created_at
                      ? new Date(ticket.created_at).toLocaleDateString()
                      : "N/A"}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(ticket)}
                      className="ml-auto text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Workflow Transition Actions */}
                  {ticket.sop_id && (
                    <div className="pt-3 border-t mt-3">
                      <TransitionActions
                        recordType="ticket"
                        recordId={ticket.id}
                        invalidateKeys={[["support-tickets"]]}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>

        {tickets.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <TicketIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No tickets found</h3>
            <p className="text-muted-foreground">
              {searchQuery || stateFilter || priorityFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first support ticket to get started"}
            </p>
          </div>
        )}

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
    </Layout>
  );
};

export default SupportTickets;
