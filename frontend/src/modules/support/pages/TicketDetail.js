import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchTicket } from "../api";
import {
  StateBadge,
  TransitionActions,
  TransitionTimeline,
} from "../../workflow-engine";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
} from "../../../components/ui/card";
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
} from "lucide-react";

const TicketDetail = () => {
  const { id: ticketId } = useParams();
  const navigate = useNavigate();

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const getPriorityBadge = (priority) => {
    const variants = {
      Low: "bg-slate-50 text-slate-700 ring-slate-600/20",
      Medium: "bg-blue-50 text-blue-700 ring-blue-600/20",
      High: "bg-orange-50 text-orange-700 ring-orange-600/20",
      Critical: "bg-red-50 text-red-700 ring-red-600/20",
    };
    return variants[priority] || variants.Medium;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!ticketData?.ticket) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Ticket not found</h3>
          <p className="text-muted-foreground mb-4">
            The ticket you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/support/tickets")}>
            Back to Tickets
          </Button>
        </div>
      </Layout>
    );
  }

  const { ticket } = ticketData;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/support/tickets")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {ticket.ticket_number || ticket.id}
              </h1>
              <p className="text-muted-foreground mt-1">
                {ticket.customer_name} • {ticket.project_name}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StateBadge
                  stateName={ticket.current_state_name}
                  stateColor={null}
                />
                <Badge className={getPriorityBadge(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
            </div>
          </div>

          {/* Workflow Transition Actions */}
          {ticket.sop_id && (
            <div className="ml-4">
              <TransitionActions
                recordType="ticket"
                recordId={ticket.id}
                invalidateKeys={[["support-ticket", ticketId], ["support-tickets"]]}
              />
            </div>
          )}
        </div>

        {/* Ticket Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Status & Priority */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <StateBadge
                  stateName={ticket.current_state_name}
                  stateColor={null}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge className={getPriorityBadge(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SLA:</span>
                  <span>{ticket.sla_category}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Product</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {ticket.ticket_type}
                </div>
                <div>
                  <span className="font-medium">Category:</span>{" "}
                  {ticket.product_category}
                </div>
                <div>
                  <span className="font-medium">Name:</span>{" "}
                  {ticket.product_name}
                </div>
                <div>
                  <span className="font-medium">Model:</span>{" "}
                  {ticket.model_number}
                </div>
                {ticket.firmware_software_version && (
                  <div>
                    <span className="font-medium">Version:</span>{" "}
                    {ticket.firmware_software_version}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location & Assignment */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location & Assignment</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Site:</span>{" "}
                  {ticket.location_site}
                </div>
                <div>
                  <span className="font-medium">Created By:</span>{" "}
                  {ticket.created_by_name || ticket.created_by}
                </div>
                {ticket.assigned_to && (
                  <div>
                    <span className="font-medium">Assigned To:</span>{" "}
                    {ticket.assigned_to_name || ticket.assigned_to}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Timeline</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
                {ticket.closed_at && (
                  <div>
                    <span className="font-medium">Closed:</span>{" "}
                    {new Date(ticket.closed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow History */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Workflow History</h3>
          <TransitionTimeline recordType="ticket" recordId={ticketId} />
        </div>
      </div>
    </Layout>
  );
};

export default TicketDetail;
