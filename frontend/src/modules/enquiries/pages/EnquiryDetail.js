import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchEnquiry,
  convertEnquiryToLead,
  deleteEnquiry,
  fetchEnquiryRemarks,
  addEnquiryRemark,
  deleteEnquiryRemark,
  fetchEnquiryComments,
  addEnquiryComment,
  deleteEnquiryComment,
} from "../api";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
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
  ArrowLeft,
  Edit,
  Trash2,
  ArrowRightCircle,
  Calendar,
  User,
  Mail,
  Phone,
  IndianRupee,
  Building2,
  Tag,
  Clock,
  Star,
  Send,
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

const EnquiryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkImportant, setRemarkImportant] = useState(false);
  const [commentContent, setCommentContent] = useState("");

  // ─── Queries ──────────────────────────────────────

  const {
    data: enquiry,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["enquiry", id],
    queryFn: () => fetchEnquiry(id),
  });

  const { data: remarks = [] } = useQuery({
    queryKey: ["enquiry-remarks", id],
    queryFn: () => fetchEnquiryRemarks(id),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["enquiry-comments", id],
    queryFn: () => fetchEnquiryComments(id),
    enabled: !!id,
  });

  // ─── Mutations ────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => deleteEnquiry(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiries"]);
      toast.success("Enquiry deleted");
      navigate("/enquiries");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Delete failed"),
  });

  const convertMutation = useMutation({
    mutationFn: () => convertEnquiryToLead(id, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["enquiries"]);
      queryClient.invalidateQueries(["enquiry", id]);
      queryClient.invalidateQueries(["leads"]);
      toast.success("Converted to lead!");
      if (data?.lead?.id) {
        navigate(`/leads/${data.lead.id}`);
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Convert failed"),
  });

  const addRemarkMutation = useMutation({
    mutationFn: (data) => addEnquiryRemark(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiry-remarks", id]);
      queryClient.invalidateQueries(["enquiry", id]);
      setRemarkContent("");
      setRemarkImportant(false);
      toast.success("Remark added");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to add remark"),
  });

  const deleteRemarkMutation = useMutation({
    mutationFn: (remarkId) => deleteEnquiryRemark(id, remarkId),
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiry-remarks", id]);
      queryClient.invalidateQueries(["enquiry", id]);
      toast.success("Remark deleted");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => addEnquiryComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiry-comments", id]);
      queryClient.invalidateQueries(["enquiry", id]);
      setCommentContent("");
      toast.success("Comment added");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to add comment"),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => deleteEnquiryComment(id, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiry-comments", id]);
      queryClient.invalidateQueries(["enquiry", id]);
      toast.success("Comment deleted");
    },
  });

  // ─── Handlers ─────────────────────────────────────

  const handleAddRemark = (e) => {
    e.preventDefault();
    if (!remarkContent.trim()) return;
    addRemarkMutation.mutate({
      content: remarkContent.trim(),
      is_important: remarkImportant,
    });
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    addCommentMutation.mutate({ content: commentContent.trim() });
  };

  // ─── Helpers ──────────────────────────────────────

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount, currency = "INR") => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ─── Render ───────────────────────────────────────

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (isError || !enquiry) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-gray-500">Enquiry not found</p>
          <Button variant="outline" onClick={() => navigate("/enquiries")}>
            Back to Enquiries
          </Button>
        </div>
      </Layout>
    );
  }

  const status = statusConfig[enquiry.status] || statusConfig.new;
  const priority = priorityConfig[enquiry.priority] || priorityConfig.medium;
  const isConverted = enquiry.status === "converted";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/enquiries")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-mono text-gray-400">
                  {enquiry.enquiry_number}
                </span>
                <Badge className={`${status.class} ring-1 ring-inset`}>
                  {status.label}
                </Badge>
                <Badge className={priority.class} variant="secondary">
                  {priority.label}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold font-heading tracking-tight">
                {enquiry.project_name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isConverted && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/enquiries/edit/${id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => convertMutation.mutate()}
                  disabled={convertMutation.isPending}
                >
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                  {convertMutation.isPending
                    ? "Converting..."
                    : "Convert to Lead"}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            {enquiry.details && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {enquiry.details}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Entity Connections */}
            {enquiry.entity_connections?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Connected Entities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {enquiry.entity_connections.map((ec, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-sm">
                            {ec.entity_name || ec.entity_id}
                          </span>
                          {ec.entity_type && (
                            <Badge variant="outline" className="text-xs">
                              {ec.entity_type}
                            </Badge>
                          )}
                        </div>
                        {ec.role && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                            {ec.role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs: Remarks & Comments */}
            <Tabs defaultValue="remarks">
              <TabsList>
                <TabsTrigger
                  value="remarks"
                  className="flex items-center gap-1"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Remarks ({enquiry.remarks_count || remarks.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="comments"
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comments ({enquiry.comments_count || comments.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Remarks Tab */}
              <TabsContent value="remarks" className="space-y-4 mt-4">
                <form onSubmit={handleAddRemark} className="space-y-3">
                  <Textarea
                    value={remarkContent}
                    onChange={(e) => setRemarkContent(e.target.value)}
                    placeholder="Add a remark..."
                    rows={2}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={remarkImportant}
                        onChange={(e) => setRemarkImportant(e.target.checked)}
                        className="rounded"
                      />
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      Mark as important
                    </label>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        !remarkContent.trim() || addRemarkMutation.isPending
                      }
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Add Remark
                    </Button>
                  </div>
                </form>

                {(Array.isArray(remarks) ? remarks : []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No remarks yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(remarks) ? remarks : []).map((remark) => (
                      <div
                        key={remark.id}
                        className={`p-3 rounded-lg border ${
                          remark.is_important
                            ? "border-yellow-200 bg-yellow-50/50"
                            : "border-gray-100 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {remark.is_important && (
                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              )}
                              <span className="text-xs font-medium text-gray-600">
                                {remark.created_by_name || "User"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(remark.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {remark.content}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                            onClick={() =>
                              deleteRemarkMutation.mutate(remark.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="space-y-4 mt-4">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !commentContent.trim() || addCommentMutation.isPending
                    }
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Post
                  </Button>
                </form>

                {(Array.isArray(comments) ? comments : []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No comments yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(comments) ? comments : []).map(
                      (comment) => (
                        <div
                          key={comment.id}
                          className="p-3 rounded-lg border border-gray-100 bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-600">
                                  {comment.created_by_name || "User"}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDateTime(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-500"
                              onClick={() =>
                                deleteCommentMutation.mutate(comment.id)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column — Sidebar Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Date"
                  value={formatDate(enquiry.date)}
                />
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Person"
                  value={enquiry.person_name}
                />
                {enquiry.person_email && (
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={
                      <a
                        href={`mailto:${enquiry.person_email}`}
                        className="text-primary hover:underline"
                      >
                        {enquiry.person_email}
                      </a>
                    }
                  />
                )}
                {enquiry.person_phone && (
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={
                      <a
                        href={`tel:${enquiry.person_phone}`}
                        className="text-primary hover:underline"
                      >
                        {enquiry.person_phone}
                      </a>
                    }
                  />
                )}
                <InfoRow
                  icon={<IndianRupee className="h-4 w-4" />}
                  label="Budget"
                  value={formatCurrency(enquiry.budget, enquiry.currency)}
                />
                <InfoRow
                  icon={<Tag className="h-4 w-4" />}
                  label="Source"
                  value={sourceLabels[enquiry.source] || enquiry.source}
                />
                {enquiry.assigned_to_name && (
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="Assigned To"
                    value={enquiry.assigned_to_name}
                  />
                )}
                <InfoRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Created"
                  value={
                    <span>
                      {formatDateTime(enquiry.created_at)}
                      {enquiry.created_by_name && (
                        <span className="text-gray-400 block text-xs">
                          by {enquiry.created_by_name}
                        </span>
                      )}
                    </span>
                  }
                />
                {enquiry.updated_at && (
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Updated"
                    value={formatDateTime(enquiry.updated_at)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            {enquiry.tags?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {enquiry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Converted Lead Link */}
            {isConverted && enquiry.converted_lead_id && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardContent className="p-4">
                  <p className="text-sm text-purple-700 mb-2 font-medium">
                    Converted to Lead
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      navigate(`/leads/${enquiry.converted_lead_id}`)
                    }
                  >
                    View Lead
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this enquiry? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

// ─── Helper Component ──────────────────────────────

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="text-gray-400 mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  </div>
);

export default EnquiryDetail;
