import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchTicket,
  getTicketMetrics,
} from "../api";
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
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  FileText,
  Settings,
  Wrench,
  ArrowUpRight,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

// Sub-components for different tabs
import IssueLoggingTab from "../components/IssueLoggingTab";
import SystemEnvironmentTab from "../components/SystemEnvironmentTab";
import TroubleshootingActionsTab from "../components/TroubleshootingActionsTab";
import EscalationTab from "../components/EscalationTab";
import ResolutionTab from "../components/ResolutionTab";
import CustomerFeedbackTab from "../components/CustomerFeedbackTab";

const TicketDetail = () => {
  const { id: ticketId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const { data: metrics } = useQuery({
    queryKey: ["support-ticket-metrics", ticketId],
    queryFn: () => getTicketMetrics(ticketId),
    enabled: !!ticketData?.ticket,
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
                  {ticket.created_by}
                </div>
                {ticket.assigned_to && (
                  <div>
                    <span className="font-medium">Assigned To:</span>{" "}
                    {ticket.assigned_to}
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
                {metrics?.resolution_time_hours && (
                  <div>
                    <span className="font-medium">Resolution Time:</span>{" "}
                    {metrics.resolution_time_hours.toFixed(1)} hrs
                  </div>
                )}
                {ticket.resolved_at && (
                  <div>
                    <span className="font-medium">Resolved:</span>{" "}
                    {new Date(ticket.resolved_at).toLocaleDateString()}
                  </div>
                )}
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

        {/* Ticket Lifecycle Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger
              value="timeline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="issue-logging"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Issue Logging
            </TabsTrigger>
            <TabsTrigger value="system-env" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger
              value="troubleshooting"
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Troubleshooting
            </TabsTrigger>
            <TabsTrigger value="escalation" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Escalation
            </TabsTrigger>
            <TabsTrigger value="resolution" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolution
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <h3 className="font-semibold text-lg">Workflow History</h3>
            <TransitionTimeline recordType="ticket" recordId={ticketId} />
          </TabsContent>

          <TabsContent value="issue-logging">
            <IssueLoggingTab
              ticketId={ticketId}
              issueLogging={ticketData.issue_logging}
              ticketStatus={ticket.status}
            />
          </TabsContent>

          <TabsContent value="system-env">
            <SystemEnvironmentTab
              ticketId={ticketId}
              systemEnvironment={ticketData.system_environment}
              ticketStatus={ticket.status}
            />
          </TabsContent>

          <TabsContent value="troubleshooting">
            <TroubleshootingActionsTab
              ticketId={ticketId}
              actions={ticketData.troubleshooting_actions}
              ticketStatus={ticket.status}
            />
          </TabsContent>

          <TabsContent value="escalation">
            <EscalationTab
              ticketId={ticketId}
              escalation={ticketData.escalation}
              ticketStatus={ticket.status}
            />
          </TabsContent>

          <TabsContent value="resolution">
            <ResolutionTab
              ticketId={ticketId}
              resolution={ticketData.resolution}
              ticketStatus={ticket.status}
            />
          </TabsContent>

          <TabsContent value="feedback">
            <CustomerFeedbackTab
              ticketId={ticketId}
              feedback={ticketData.customer_feedback}
              ticketStatus={ticket.status}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default TicketDetail;
