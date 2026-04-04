import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { Layout } from "../../../components";
import {
  StateBadge,
  TransitionActions,
  TransitionTimeline,
} from "../../workflow-engine";
import {
  fetchLead,
  updateLead,
  fetchLeadAssignments,
  createAssignment,
  deleteAssignment,
  fetchLeadRemarks,
  createRemark,
  updateRemark,
  deleteRemark,
  fetchLeadComments,
  createComment,
  deleteComment,
  fetchLeadDocuments,
  uploadLeadDocument,
  deleteLeadDocument,
  fetchLeadInvolvements,
  createLeadInvolvement,
  updateLeadInvolvement,
  deleteLeadInvolvement,
} from "../api";
import { fetchBOQs, deleteBOQ } from "../../boqs/api";
import {
  fetchSalesOrders,
  deleteSalesOrder,
  updateSalesOrder,
} from "../../sales-orders/api";
import { fetchInvoices } from "../../invoices/api";
import {
  fetchPurchaseOrders,
  deletePurchaseOrder,
} from "../../purchase-orders/api";
import { fetchPayments } from "../../payments/api";
import { fetchWarranties } from "../../warranties/api";
import { fetchUsers } from "../../settings/api";
import { fetchEntities, searchEntities } from "../../entities/api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
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
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  ArrowLeft,
  Building,
  Building2,
  Mail,
  Phone,
  Plus,
  FileText,
  ShoppingCart,
  Receipt,
  CreditCard,
  Shield,
  User,
  StickyNote,
  Paperclip,
  UserPlus,
  MessageSquare,
  Trash2,
  Download,
  Edit,
  X,
  Search,
  Truck,
  Settings,
  Eye,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import BOQVersionHistory from "../../boqs/pages/BOQVersionHistory";

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State for new modules
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState("");
  const [assignRole, setAssignRole] = React.useState("");
  const [assignNotes, setAssignNotes] = React.useState("");

  const [remarkDialogOpen, setRemarkDialogOpen] = React.useState(false);
  const [remarkTitle, setRemarkTitle] = React.useState("");
  const [remarkDescription, setRemarkDescription] = React.useState("");
  const [remarkType, setRemarkType] = React.useState("milestone");
  const [editingRemark, setEditingRemark] = React.useState(null);

  const [newComment, setNewComment] = React.useState("");

  const [docDialogOpen, setDocDialogOpen] = React.useState(false);
  const [docFile, setDocFile] = React.useState(null);
  const [docDescription, setDocDescription] = React.useState("");

  // Version History state
  const [versionHistoryOpen, setVersionHistoryOpen] = React.useState(false);
  const [selectedBOQId, setSelectedBOQId] = React.useState(null);

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState(null);
  const [deleteType, setDeleteType] = React.useState(null);

  // Involvement state
  const [involvementDialogOpen, setInvolvementDialogOpen] =
    React.useState(false);
  const [selectedEntityId, setSelectedEntityId] = React.useState("");
  const [involvementType, setInvolvementType] = React.useState("consultant");
  const [assignedBOQs, setAssignedBOQs] = React.useState([]);
  const [assignedSalesOrders, setAssignedSalesOrders] = React.useState([]);
  const [assignedInvoices, setAssignedInvoices] = React.useState([]);
  const [assignedPayments, setAssignedPayments] = React.useState([]);
  const [assignedWarranties, setAssignedWarranties] = React.useState([]);
  const [involvementStatus, setInvolvementStatus] = React.useState("active");
  const [involvementNotes, setInvolvementNotes] = React.useState("");
  const [additionalInfo, setAdditionalInfo] = React.useState("");
  const [additionalInfoPairs, setAdditionalInfoPairs] = React.useState([
    { key: "", value: "" },
  ]);
  const [editingInvolvement, setEditingInvolvement] = React.useState(null);
  // Entity search for involvement dialog
  const [entitySearchQuery, setEntitySearchQuery] = React.useState("");
  const [entitySearchResults, setEntitySearchResults] = React.useState([]);
  const [entitySearching, setEntitySearching] = React.useState(false);
  const [selectedEntityObj, setSelectedEntityObj] = React.useState(null); // full entity object

  // Tab lazy loading
  const [activeTab, setActiveTab] = React.useState("boqs");
  // BOQ bidder filter
  const [boqBidderFilter, setBoqBidderFilter] = React.useState("all");

  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead(id),
  });

  const { data: allBOQs } = useQuery({
    queryKey: ["boqs"],
    queryFn: fetchBOQs,
    enabled: !!id,
  });

  const { data: allOrders } = useQuery({
    queryKey: ["salesOrders", id],
    queryFn: () => fetchSalesOrders({ lead_id: id, page_size: 100 }),
    enabled: !!id,
  });

  const { data: allInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
    enabled: !!id,
  });

  const { data: allPurchaseOrders } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: fetchPurchaseOrders,
    enabled: !!id,
  });

  const { data: allPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
    enabled: !!id,
  });

  const { data: allWarranties } = useQuery({
    queryKey: ["warranties"],
    queryFn: fetchWarranties,
    enabled: !!id,
  });

  // New module queries
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: !!id,
  });

  const { data: assignments } = useQuery({
    queryKey: ["lead-assignments", id],
    queryFn: () => fetchLeadAssignments(id),
    enabled: !!id,
  });

  const { data: remarks } = useQuery({
    queryKey: ["lead-remarks", id],
    queryFn: () => fetchLeadRemarks(id),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["lead-comments", id],
    queryFn: () => fetchLeadComments(id),
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["lead-documents", id],
    queryFn: () => fetchLeadDocuments(id),
    enabled: !!id,
  });

  // Involvement queries — always loaded (shown in info card + involvement tab)
  const {
    data: entities,
  } = useQuery({
    queryKey: ["entities"],
    queryFn: () => fetchEntities(),
    enabled: !!id,
  });

  const { data: involvements } = useQuery({
    queryKey: ["lead-involvements", id],
    queryFn: () => fetchLeadInvolvements(id),
    enabled: !!id,
  });

  // Entity search for involvement dialog
  React.useEffect(() => {
    if (!involvementDialogOpen || !entitySearchQuery || entitySearchQuery.length < 1) {
      setEntitySearchResults([]);
      return;
    }
    const typeFilter = involvementType === "consultant" ? "consultant"
      : involvementType === "distributor" ? "distributor" : null;
    setEntitySearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchEntities(entitySearchQuery, 15, typeFilter);
        setEntitySearchResults(data);
      } catch { setEntitySearchResults([]); }
      finally { setEntitySearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [entitySearchQuery, involvementType, involvementDialogOpen]);

  // Mutations for new modules
  const assignMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-assignments", id]);
      toast.success("User assigned successfully!");
      setAssignDialogOpen(false);
      setSelectedUser("");
      setAssignRole("");
      setAssignNotes("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to assign user");
    },
  });

  const deleteAssignMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-assignments", id]);
      toast.success("Assignment removed!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to remove assignment",
      );
    },
  });

  const remarkMutation = useMutation({
    mutationFn: createRemark,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-remarks", id]);
      toast.success("Remark added successfully!");
      setRemarkDialogOpen(false);
      setRemarkTitle("");
      setRemarkDescription("");
      setRemarkType("milestone");
      setEditingRemark(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to add remark");
    },
  });

  const updateRemarkMutation = useMutation({
    mutationFn: ({ remarkId, data }) => updateRemark(remarkId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-remarks", id]);
      toast.success("Remark updated successfully!");
      setRemarkDialogOpen(false);
      setRemarkTitle("");
      setRemarkDescription("");
      setRemarkType("milestone");
      setEditingRemark(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update remark");
    },
  });

  const deleteRemarkMutation = useMutation({
    mutationFn: deleteRemark,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-remarks", id]);
      toast.success("Remark deleted!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete remark");
    },
  });

  const commentMutation = useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-comments", id]);
      toast.success("Comment added!");
      setNewComment("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to add comment");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-comments", id]);
      toast.success("Comment deleted!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete comment");
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ file, leadId, description }) =>
      uploadLeadDocument(file, leadId, description),
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-documents", id]);
      toast.success("Document uploaded successfully!");
      setDocDialogOpen(false);
      setDocFile(null);
      setDocDescription("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to upload document");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: deleteLeadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-documents", id]);
      toast.success("Document deleted!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete document");
    },
  });

  // Status transitions are now handled by the Workflow Engine

  const deleteBOQMutation = useMutation({
    mutationFn: deleteBOQ,
    onSuccess: () => {
      queryClient.invalidateQueries(["boqs"]);
      toast.success("BOQ deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete BOQ");
    },
  });

  const deleteSalesOrderMutation = useMutation({
    mutationFn: deleteSalesOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(["salesOrders"]);
      toast.success("Proforma Invoice deleted successfully!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to delete Proforma Invoice",
      );
    },
  });

  const deletePurchaseOrderMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(["purchaseOrders"]);
      toast.success("Purchase Order deleted successfully!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to delete Purchase Order",
      );
    },
  });

  // Involvement mutations
  const createInvolvementMutation = useMutation({
    mutationFn: createLeadInvolvement,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-involvements", id]);
      toast.success("Involvement added successfully!");
      setInvolvementDialogOpen(false);
      resetInvolvementForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to add involvement");
    },
  });

  const updateInvolvementMutation = useMutation({
    mutationFn: ({ involvementId, data }) =>
      updateLeadInvolvement(involvementId, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries(["lead-involvements", id]);
      // Sync lead.consultant_entity_id when consultant involvement is updated
      if (variables.data.involvement_type === "consultant" && variables.data.entity_id) {
        try {
          await updateLead(id, {
            consultant_entity_id: variables.data.entity_id,
            is_consultant_involved: true,
          });
          queryClient.invalidateQueries(["lead", id]);
        } catch { /* non-critical */ }
      }
      toast.success("Involvement updated successfully!");
      setInvolvementDialogOpen(false);
      resetInvolvementForm();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update involvement",
      );
    },
  });

  const deleteInvolvementMutation = useMutation({
    mutationFn: deleteLeadInvolvement,
    onSuccess: () => {
      queryClient.invalidateQueries(["lead-involvements", id]);
      toast.success("Involvement removed!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to remove involvement",
      );
    },
  });

  // Handlers
  const handleAssignUser = () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }
    assignMutation.mutate({
      lead_id: id,
      user_id: selectedUser,
      role: assignRole,
      notes: assignNotes,
    });
  };

  const handleAddRemark = () => {
    if (!remarkTitle) {
      toast.error("Please enter a title");
      return;
    }

    if (editingRemark) {
      // Update existing remark
      updateRemarkMutation.mutate({
        remarkId: editingRemark.id,
        data: {
          title: remarkTitle,
          content: remarkDescription,
          type: remarkType,
        },
      });
    } else {
      // Create new remark
      remarkMutation.mutate({
        lead_id: id,
        title: remarkTitle,
        content: remarkDescription || remarkTitle,
        type: remarkType,
        entity_type: "lead",
      });
    }
  };

  const handleEditRemark = (remark) => {
    setEditingRemark(remark);
    setRemarkTitle(remark.title);
    setRemarkDescription(remark.content || "");
    setRemarkType(remark.type || "milestone");
    setRemarkDialogOpen(true);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    commentMutation.mutate({
      lead_id: id,
      comment: newComment,
    });
  };

  const handleUploadDocument = () => {
    if (!docFile) {
      toast.error("Please select a file");
      return;
    }
    uploadDocMutation.mutate({
      file: docFile,
      leadId: id,
      description: docDescription,
    });
  };

  // Involvement handlers
  const resetInvolvementForm = () => {
    setSelectedEntityId("");
    setSelectedEntityObj(null);
    setEntitySearchQuery("");
    setEntitySearchResults([]);
    setInvolvementType("consultant");
    setAssignedBOQs([]);
    setAssignedSalesOrders([]);
    setAssignedInvoices([]);
    setAssignedPayments([]);
    setAssignedWarranties([]);
    setInvolvementStatus("active");
    setInvolvementNotes("");
    setAdditionalInfo("");
    setAdditionalInfoPairs([{ key: "", value: "" }]);
    setEditingInvolvement(null);
  };

  const handleAddInvolvement = () => {
    // Validation
    if (!selectedEntityId) {
      toast.error("Please select an entity");
      return;
    }

    // Check for duplicate involvements (client-side validation)
    if (!editingInvolvement) {
      if (
        involvementType === "consultant" ||
        involvementType === "distributor"
      ) {
        // For consultant and distributor, only one per lead
        const existingInvolvement = involvements?.find(
          (inv) => inv.involvement_type === involvementType,
        );
        if (existingInvolvement) {
          toast.error(
            `A ${involvementType} is already assigned to this lead. Only one ${involvementType} per lead is allowed.`,
          );
          return;
        }
      } else if (involvementType === "si") {
        // For SI, multiple allowed but check for duplicate entity
        const existingInvolvement = involvements?.find(
          (inv) =>
            inv.involvement_type === "si" && inv.entity_id === selectedEntityId,
        );
        if (existingInvolvement) {
          toast.error(
            `This entity is already assigned as System Integrator to this lead. Each entity can only be assigned once per involvement type.`,
          );
          return;
        }
      }
    }

    // Convert key-value pairs to object
    const additionalInfoObject = {};
    additionalInfoPairs.forEach((pair) => {
      if (pair.key && pair.key.trim() && pair.value && pair.value.trim()) {
        additionalInfoObject[pair.key.trim()] = pair.value.trim();
      }
    });

    const involvementData = {
      lead_id: id,
      entity_id: selectedEntityId,
      involvement_type: involvementType,
      assigned_boqs: assignedBOQs || [],
      sales_order_ids: assignedSalesOrders || [],
      invoice_ids: assignedInvoices || [],
      payment_ids: assignedPayments || [],
      warranty_ids: assignedWarranties || [],
      status: involvementStatus,
      additional_information: additionalInfoObject,
    };

    if (editingInvolvement) {
      updateInvolvementMutation.mutate({
        involvementId: editingInvolvement.id,
        data: involvementData,
      });
    } else {
      createInvolvementMutation.mutate(involvementData);
    }
  };

  const handleEditInvolvement = (involvement) => {
    setEditingInvolvement(involvement);
    setSelectedEntityId(involvement.entity_id);
    // Pre-populate entity display so the search box shows current entity name
    setSelectedEntityObj({ id: involvement.entity_id, company_name: involvement.entity_name || involvement.entity_id });
    setEntitySearchQuery(involvement.entity_name || "");
    setInvolvementType(involvement.involvement_type);
    setAssignedBOQs(involvement.assigned_boqs || []);
    setAssignedSalesOrders(involvement.sales_order_ids || []);
    setAssignedInvoices(involvement.invoice_ids || []);
    setAssignedPayments(involvement.payment_ids || []);
    setAssignedWarranties(involvement.warranty_ids || []);
    setInvolvementStatus(involvement.status);
    setInvolvementNotes(involvement.notes || "");

    // Convert additional_information object to key-value pairs
    if (
      involvement.additional_information &&
      typeof involvement.additional_information === "object"
    ) {
      const pairs = Object.entries(involvement.additional_information).map(
        ([key, value]) => ({
          key,
          value: String(value),
        }),
      );
      setAdditionalInfoPairs(
        pairs.length > 0 ? pairs : [{ key: "", value: "" }],
      );
    } else {
      setAdditionalInfoPairs([{ key: "", value: "" }]);
    }

    setEditingInvolvement(involvement);
    setInvolvementDialogOpen(true);
  };

  // Delete confirmation handlers
  const handleDeleteConfirmation = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteType === "sales_order") {
      deleteSalesOrderMutation.mutate(itemToDelete.id);
    } else if (deleteType === "boq") {
      deleteBOQMutation.mutate(itemToDelete.id);
    } else if (deleteType === "purchase_order") {
      deletePurchaseOrderMutation.mutate(itemToDelete.id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
    setDeleteType(null);
  };

  const allLeadBOQs = allBOQs?.items?.filter((b) => b.lead_id === id) || [];
  // Filter BOQs by bidder entity via involvements
  const boqs = boqBidderFilter === "all"
    ? allLeadBOQs
    : allLeadBOQs.filter((b) => {
        const inv = involvements?.find((i) => i.id === boqBidderFilter || i.entity_id === boqBidderFilter);
        return inv ? inv.assigned_boqs?.includes(b.id) : false;
      });
  const salesOrders = allOrders?.items || [];

  // Filter Purchase Orders based on PI (Sales Order) relationship
  const salesOrderIds = salesOrders.map((so) => so.id);
  const purchaseOrders =
    allPurchaseOrders?.items?.filter((po) =>
      salesOrderIds.includes(po.pi_id),
    ) || [];

  const orderIds = salesOrders.map((o) => o.id);
  const invoices =
    allInvoices?.items?.filter((inv) => {
      const order = allOrders?.items?.find((o) => o.id === inv.sales_order_id);
      return order && orderIds.includes(order.id);
    }) || [];

  const invoiceIds = invoices.map((inv) => inv.id);
  const payments =
    allPayments?.items?.filter((p) => invoiceIds.includes(p.invoice_id)) || [];

  const warranties =
    allWarranties?.items?.filter((w) => orderIds.includes(w.sales_order_id)) ||
    [];

  const getStatusBadge = (status, type = "lead") => {
    const variants = {
      lead: {
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
      },
      boq: {
        draft: "bg-gray-50 text-gray-700 ring-gray-600/20",
        submitted: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
        approved: "bg-green-50 text-green-700 ring-green-600/20",
        revised: "bg-orange-50 text-orange-700 ring-orange-600/20",
      },
      order: {
        pending: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
        confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
        in_progress: "bg-purple-50 text-purple-700 ring-purple-600/20",
        completed: "bg-green-50 text-green-700 ring-green-600/20",
        cancelled: "bg-red-50 text-red-700 ring-red-600/20",
      },
      invoice: {
        unpaid: "bg-red-50 text-red-700 ring-red-600/20",
        partial: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
        paid: "bg-green-50 text-green-700 ring-green-600/20",
      },
      purchase_order: {
        draft: "bg-gray-50 text-gray-700 ring-gray-600/20",
        pending: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
        approved: "bg-green-50 text-green-700 ring-green-600/20",
        completed: "bg-blue-50 text-blue-700 ring-blue-600/20",
        cancelled: "bg-red-50 text-red-700 ring-red-600/20",
      },
    };
    const colorClass = variants[type]?.[status] || "bg-gray-50 text-gray-700 ring-gray-600/20";
    return (
      <Badge className={`${colorClass} ring-1 ring-inset`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (isLoadingLead) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Lead not found</p>
        </div>
      </Layout>
    );
  }

  const consultants = involvements?.filter((inv) => inv.involvement_type === "consultant") || [];
  const bidders = involvements?.filter((inv) => inv.involvement_type === "si") || [];

  const InfoItem = ({ label, children }) =>
    children ? (
      <div className="text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="font-medium mt-0.5">{children}</div>
      </div>
    ) : null;

  return (
    <Layout>
      <div data-testid="lead-detail-page">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/leads")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Leads
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/leads/edit/${id}`)}>
            Edit Lead
          </Button>
        </div>

        {/* 30:70 split layout */}
        <div className="grid grid-cols-[280px_1fr] gap-5 items-start">
          {/* ── LEFT SIDEBAR ── */}
          <div className="sticky top-4">
            <Card className="border-border/60 overflow-hidden">
              {/* Header section */}
              <div className="p-4 pb-3 bg-gradient-to-b from-muted/40 to-transparent">
                <h1 className="text-sm font-semibold tracking-tight leading-snug">
                  {lead.project_name || "Untitled Project"}
                </h1>
                {lead.customer_name && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="h-3 w-3 flex-shrink-0" />
                    {lead.customer_name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <StateBadge stateName={lead.current_state_name} stateColor={null} />
                  <Badge variant="outline" className="capitalize text-[10px] h-5">{lead.priority}</Badge>
                </div>
              </div>

              {/* Transition actions */}
              {lead.sop_id && (
                <div className="px-4 pb-3 border-b border-border/40">
                  <TransitionActions
                    recordType="lead"
                    recordId={lead.id}
                    invalidateKeys={[["lead", id], ["leads"]]}
                  />
                </div>
              )}

              {/* Details list */}
              <div className="p-4 space-y-2">
                {lead.expected_value && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Value</span>
                    <span className="text-xs font-semibold text-green-600">
                      ₹{Number(lead.expected_value).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {lead.expected_close_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Close Date</span>
                    <span className="text-xs font-medium">
                      {new Date(lead.expected_close_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
                {lead.source && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Source</span>
                    <span className="text-xs font-medium">{lead.source}</span>
                  </div>
                )}

                {consultants.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Consultant</span>
                    <p className="text-xs font-medium mt-0.5 leading-snug">
                      {consultants.map((c) => c.entity_name || c.entity_id).join(", ")}
                    </p>
                  </div>
                )}
                {bidders.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bidders</span>
                    <p className="text-xs font-medium mt-0.5 leading-snug">
                      {bidders.map((b) => b.entity_name || b.entity_id).join(", ")}
                    </p>
                  </div>
                )}
                {lead.notes && (
                  <div className="pt-2 mt-1 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</span>
                    <p className="text-xs mt-0.5 leading-relaxed text-foreground/80">{lead.notes}</p>
                  </div>
                )}
                {lead.additional_information &&
                  typeof lead.additional_information === "object" &&
                  Object.keys(lead.additional_information).length > 0 && (
                    <div className="pt-2 mt-1 border-t border-border/30 space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Additional</span>
                      {Object.entries(lead.additional_information).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </Card>
          </div>

          {/* ── RIGHT CONTENT ── */}
          <div>
            <Tabs defaultValue="timeline" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="w-full flex overflow-x-auto h-auto p-0.5 gap-0.5 mb-3 bg-muted/50 rounded-lg">
                <TabsTrigger value="timeline" className="text-[11px] py-1.5 px-2">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="boqs" className="text-[11px] py-1.5 px-2">
                  BOQs ({boqs.length})
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-[11px] py-1.5 px-2">
                  PI ({salesOrders.length})
                </TabsTrigger>
                <TabsTrigger value="invoices" className="text-[11px] py-1.5 px-2">
                  PO ({purchaseOrders.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-[11px] py-1.5 px-2">
                  Payments ({payments.length})
                </TabsTrigger>
                <TabsTrigger value="warranties" className="text-[11px] py-1.5 px-2">
                  Warranties ({warranties.length})
                </TabsTrigger>
                <TabsTrigger value="involvement" className="text-[11px] py-1.5 px-2">
                  Inv. ({involvements?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="remarks" className="text-[11px] py-1.5 px-2">
                  Remarks ({remarks?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-[11px] py-1.5 px-2">
                  Docs ({documents?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="assign" className="text-[11px] py-1.5 px-2">
                  Assign ({assignments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-[11px] py-1.5 px-2">
                  Comments ({comments?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Workflow Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4 mt-4">
                <h3 className="font-semibold text-lg">Workflow History</h3>
                <TransitionTimeline recordType="lead" recordId={id} />
              </TabsContent>

              {/* BOQs Tab */}
              <TabsContent value="boqs" className="space-y-4 mt-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">BOQs</h3>
                    {involvements?.filter((inv) => inv.involvement_type === "si").length > 0 && (
                      <Select value={boqBidderFilter} onValueChange={setBoqBidderFilter}>
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <SelectValue placeholder="Filter by bidder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Bidders</SelectItem>
                          {involvements.filter((inv) => inv.involvement_type === "si").map((inv) => (
                            <SelectItem key={inv.id} value={inv.entity_id}>
                              {inv.entity_name || inv.entity_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/boqs/new?lead_id=${id}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create BOQ
                  </Button>
                </div>
                {boqs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No BOQs created yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {boqs.map((boq) => (
                      <Card
                        key={boq.id}
                        className="border hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          {/* Header with BOQ Number and Version */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-semibold text-sm truncate">
                                {boq.boq_number || `BOQ #${boq.id.slice(0, 8)}`}
                              </span>
                              <div className="flex items-center gap-1">
                                {/* Show version badge if BOQ has been updated */}
                                {boq.version && boq.version > 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5"
                                  >
                                    v{boq.version}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBOQId(boq.id);
                                    setVersionHistoryOpen(true);
                                  }}
                                  title="View Version History"
                                >
                                  <Info className="h-3 w-3 text-blue-600" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Entity (To) */}
                          {boq.to_data?.company_name && (
                            <p className="text-xs text-blue-700 font-medium mb-1 truncate">
                              To: {boq.to_data.company_name}
                            </p>
                          )}

                          {/* Project Info */}
                          {boq.project_name && (
                            <p className="text-xs text-gray-600 mb-2 truncate">
                              Project: {boq.project_name}
                            </p>
                          )}

                          {/* Items and Amount */}
                          <div className="space-y-2 mb-3">
                            <p className="text-sm text-gray-600">
                              {boq.items.length} items
                            </p>
                            <p className="font-mono font-semibold text-lg text-green-600">
                              ₹{(boq.total_amount ?? 0).toLocaleString()}
                            </p>
                          </div>

                          {/* Channel */}
                          {boq.channel && (
                            <div className="mb-3">
                              <Badge variant="outline" className="text-xs">
                                {boq.channel}
                              </Badge>
                            </div>
                          )}

                          {/* Dates */}
                          <div className="text-xs text-gray-500 space-y-1 mb-4">
                            <p className="truncate">
                              Created:{" "}
                              {format(new Date(boq.created_at), "MMM dd, yyyy")}
                            </p>
                            {boq.version && boq.version > 1 && (
                              <p className="text-orange-600 font-medium truncate">
                                Updated:{" "}
                                {format(
                                  new Date(boq.updated_at),
                                  "MMM dd, yyyy",
                                )}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-8"
                              onClick={() =>
                                window.open(`/boqs/view/${boq.id}`, "_blank")
                              }
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                navigate(`/boqs/edit/${boq.id}?lead_id=${id}`)
                              }
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            {user?.role === "admin" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete BOQ
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this BOQ?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteBOQMutation.mutate(boq.id)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Sales Orders Tab */}
              <TabsContent value="orders" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Proforma Invoices</h3>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/sales-orders/new?lead_id=${id}`)}
                    disabled={boqs.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create PI
                  </Button>
                </div>
                {boqs.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No BOQs available</p>
                    <p className="text-sm text-gray-400">
                      Create a BOQ first to generate Proforma Invoices
                    </p>
                  </div>
                ) : salesOrders.length === 0 ? (
                  <div className="text-center py-8 bg-blue-50 rounded-lg border border-dashed border-blue-200">
                    <ShoppingCart className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      No Proforma Invoices created yet
                    </p>
                    <p className="text-sm text-gray-400">
                      Click "Create PI" to generate from existing BOQs
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {salesOrders.map((order) => (
                      <Card
                        key={order.id}
                        className="border hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold font-mono text-blue-600">
                                  {order.pi_number || order.order_number}
                                </span>
                                {getStatusBadge(order.status, "order")}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                For: {order.to_data?.company_name || order.to_data?.name || "—"}
                              </p>
                              {order.boq_id && (
                                <p className="text-xs text-gray-500 mb-1">
                                  BOQ:{" "}
                                  {(() => {
                                    const b = boqs.find((b) => b.id === order.boq_id);
                                    return b ? (b.boq_number || b.name || order.boq_id.slice(-8)) : order.boq_id.slice(-8);
                                  })()}
                                </p>
                              )}
                              <p className="font-mono font-semibold text-lg text-green-600">
                                ₹{(order.total_amount ?? 0).toLocaleString()}
                              </p>
                              {order.items && order.items.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {order.items.length} item
                                  {order.items.length > 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                // Navigate to the sales order page which has proper preview
                                window.open(
                                  `/sales-orders/${order.id}`,
                                  "_blank",
                                );
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Edit PI"
                              onClick={() =>
                                navigate(`/sales-orders/${order.id}`)
                              }
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            {user?.role === "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Delete PI"
                                onClick={() =>
                                  handleDeleteConfirmation(order, "sales_order")
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>

                          {order.delivery_timeline && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500">
                                <Truck className="h-3 w-3 inline mr-1" />
                                Delivery: {order.delivery_timeline}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Purchase Orders Tab */}
              <TabsContent value="invoices" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Purchase Orders</h3>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(`/purchase-orders/new?lead_id=${id}`)
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create PO
                  </Button>
                </div>
                {purchaseOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No purchase orders created yet
                  </p>
                ) : (
                  purchaseOrders.map((po) => (
                    <Card key={po.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold font-mono">
                                {po.po_number}
                              </span>
                              {getStatusBadge(po.status, "purchase_order")}
                            </div>
                            <p className="text-sm text-gray-600">
                              Vendor: {po.vendor_name}
                            </p>
                            <p className="font-mono font-semibold">
                              ₹{(po.total_amount ?? 0).toLocaleString()}
                            </p>
                            {po.delivery_date && (
                              <p className="text-sm text-gray-600">
                                Delivery:{" "}
                                {format(
                                  new Date(po.delivery_date),
                                  "MMM dd, yyyy",
                                )}
                              </p>
                            )}
                            {po.advance_amount > 0 && (
                              <p className="text-sm text-gray-600">
                                Advance: ₹{po.advance_amount.toLocaleString()} |
                                Pending: ₹{po.pending_amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/purchase-orders/${po.id}?lead_id=${id}`,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/purchase-orders/${po.id}/edit?lead_id=${id}`,
                                )
                              }
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() =>
                                handleDeleteConfirmation(po, "purchase_order")
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Payments</h3>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/payments/new?lead_id=${id}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
                {payments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No payments recorded yet
                  </p>
                ) : (
                  payments.map((payment) => (
                    <Card key={payment.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <p className="font-mono font-semibold">
                              ₹{(payment.amount ?? 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">
                              {payment.payment_method.replace("_", " ")}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(
                                new Date(payment.payment_date),
                                "MMM dd, yyyy",
                              )}
                            </p>
                            {payment.transaction_id && (
                              <p className="text-xs font-mono text-gray-500">
                                TXN: {payment.transaction_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Warranties Tab */}
              <TabsContent value="warranties" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Warranties</h3>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/warranties/new?lead_id=${id}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Warranty
                  </Button>
                </div>
                {warranties.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No warranties registered yet
                  </p>
                ) : (
                  warranties.map((warranty) => (
                    <Card key={warranty.id} className="border">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <p className="font-semibold">
                            {warranty.product_name}
                          </p>
                          <p className="text-sm font-mono text-gray-600">
                            SN: {warranty.serial_number}
                          </p>
                          <p className="text-sm text-gray-600">
                            {warranty.warranty_period_months} months
                          </p>
                          <p className="text-sm text-gray-600">
                            {format(
                              new Date(warranty.warranty_start_date),
                              "MMM dd, yyyy",
                            )}{" "}
                            -{" "}
                            {format(
                              new Date(warranty.warranty_end_date),
                              "MMM dd, yyyy",
                            )}
                          </p>
                          <Badge
                            className={
                              warranty.status === "active"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-50 text-gray-700"
                            }
                          >
                            {warranty.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Involvement Tab */}
              <TabsContent value="involvement" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Lead Involvement</h3>
                  <Button
                    size="sm"
                    onClick={() => setInvolvementDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Involvement
                  </Button>
                </div>

                {/* Involvement Data Display */}
                {!involvements || involvements.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No Involvement Added Yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Add consultants, distributors, and system integrators to
                      this lead.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Consultant Column */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="h-5 w-5 text-blue-500" />
                          Consultant
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {involvements
                          ?.filter(
                            (inv) => inv.involvement_type === "consultant",
                          )
                          .map((involvement) => (
                            <div
                              key={involvement.id}
                              className="space-y-3 p-3 border rounded-lg"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">
                                    {involvement.entity_name ||
                                      "Unknown Entity"}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {involvement.entity_city}
                                  </p>
                                  <div className="mt-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        involvement.status === "win"
                                          ? "bg-green-50 text-green-800 border-green-200"
                                          : involvement.status === "lose"
                                            ? "bg-red-50 text-red-800 border-red-200"
                                            : involvement.status ===
                                                "negotiation"
                                              ? "bg-orange-50 text-orange-800 border-orange-200"
                                              : "bg-blue-50 text-blue-800 border-blue-200"
                                      }
                                    >
                                      {involvement.status}
                                    </Badge>
                                  </div>
                                  {involvement.assigned_boqs &&
                                    involvement.assigned_boqs.length > 0 && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {involvement.assigned_boqs.length}{" "}
                                        BOQ(s) assigned
                                      </p>
                                    )}
                                  {involvement.notes && (
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                      \"{involvement.notes}\"
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      handleEditInvolvement(involvement)
                                    }
                                    title="Edit"
                                  >
                                    <Edit className="h-3 w-3 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      deleteInvolvementMutation.mutate(
                                        involvement.id,
                                      )
                                    }
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        {!involvements?.filter(
                          (inv) => inv.involvement_type === "consultant",
                        ).length && (
                          <p className="text-gray-500 text-sm text-center py-4">
                            No consultant assigned
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Distributor Column */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Truck className="h-5 w-5 text-orange-500" />
                          Distributor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {involvements
                          ?.filter(
                            (inv) => inv.involvement_type === "distributor",
                          )
                          .map((involvement) => (
                            <div
                              key={involvement.id}
                              className="space-y-3 p-3 border rounded-lg"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">
                                    {involvement.entity_name ||
                                      "Unknown Entity"}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {involvement.entity_city}
                                  </p>
                                  <div className="mt-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        involvement.status === "win"
                                          ? "bg-green-50 text-green-800 border-green-200"
                                          : involvement.status === "lose"
                                            ? "bg-red-50 text-red-800 border-red-200"
                                            : involvement.status ===
                                                "negotiation"
                                              ? "bg-orange-50 text-orange-800 border-orange-200"
                                              : "bg-blue-50 text-blue-800 border-blue-200"
                                      }
                                    >
                                      {involvement.status}
                                    </Badge>
                                  </div>
                                  {involvement.assigned_boqs &&
                                    involvement.assigned_boqs.length > 0 && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {involvement.assigned_boqs.length}{" "}
                                        BOQ(s) assigned
                                      </p>
                                    )}
                                  {involvement.notes && (
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                      \"{involvement.notes}\"
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      handleEditInvolvement(involvement)
                                    }
                                    title="Edit"
                                  >
                                    <Edit className="h-3 w-3 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      deleteInvolvementMutation.mutate(
                                        involvement.id,
                                      )
                                    }
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        {!involvements?.filter(
                          (inv) => inv.involvement_type === "distributor",
                        ).length && (
                          <p className="text-gray-500 text-sm text-center py-4">
                            No distributor assigned
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* System Integrators Column */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="h-5 w-5 text-purple-500" />
                          System Integrators
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {involvements
                            ?.filter((inv) => inv.involvement_type === "si")
                            .map((involvement) => (
                              <div
                                key={involvement.id}
                                className="border rounded-lg p-3"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm">
                                      {involvement.entity_name ||
                                        "Unknown Entity"}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {involvement.entity_city}
                                    </p>
                                    <div className="mt-2">
                                      <Badge
                                        variant="outline"
                                        className={
                                          involvement.status === "win"
                                            ? "bg-green-50 text-green-800 border-green-200"
                                            : involvement.status === "lose"
                                              ? "bg-red-50 text-red-800 border-red-200"
                                              : involvement.status ===
                                                  "negotiation"
                                                ? "bg-orange-50 text-orange-800 border-orange-200"
                                                : "bg-blue-50 text-blue-800 border-blue-200"
                                        }
                                      >
                                        {involvement.status}
                                      </Badge>
                                    </div>
                                    {involvement.assigned_boqs &&
                                      involvement.assigned_boqs.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {involvement.assigned_boqs.length}{" "}
                                          BOQ(s) assigned
                                        </p>
                                      )}
                                    {involvement.notes && (
                                      <p className="text-xs text-gray-500 mt-1 italic">
                                        \"{involvement.notes}\"
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() =>
                                        handleEditInvolvement(involvement)
                                      }
                                      title="Edit"
                                    >
                                      <Edit className="h-3 w-3 text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() =>
                                        deleteInvolvementMutation.mutate(
                                          involvement.id,
                                        )
                                      }
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          {!involvements?.filter(
                            (inv) => inv.involvement_type === "si",
                          ).length && (
                            <p className="text-gray-500 text-sm text-center py-4">
                              No system integrators assigned
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Add/Edit Involvement Dialog */}
                <Dialog
                  open={involvementDialogOpen}
                  onOpenChange={(open) => {
                    setInvolvementDialogOpen(open);
                    if (!open) {
                      resetInvolvementForm();
                    }
                  }}
                >
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingInvolvement
                          ? "Edit Involvement"
                          : "Add Involvement"}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="involvement-type">Type *</Label>
                          <Select
                            value={involvementType}
                            onValueChange={(val) => {
                              setInvolvementType(val);
                              // Clear entity selection when type changes
                              setSelectedEntityObj(null);
                              setSelectedEntityId("");
                              setEntitySearchQuery("");
                              setEntitySearchResults([]);
                            }}
                          >
                            <SelectTrigger id="involvement-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultant">
                                Consultant
                              </SelectItem>
                              <SelectItem value="distributor">
                                Distributor
                              </SelectItem>
                              <SelectItem value="si">
                                System Integrator
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Entity *</Label>
                          {selectedEntityObj ? (
                            <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-blue-50">
                              <span className="text-sm font-medium truncate">{selectedEntityObj.company_name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEntityObj(null);
                                  setSelectedEntityId("");
                                  setEntitySearchQuery("");
                                  setEntitySearchResults([]);
                                }}
                                className="ml-2 flex-shrink-0"
                              >
                                <X className="h-4 w-4 text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                value={entitySearchQuery}
                                onChange={(e) => setEntitySearchQuery(e.target.value)}
                                placeholder={`Search ${involvementType === "si" ? "system integrator" : involvementType}...`}
                                className="pl-9"
                              />
                              {entitySearching && (
                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</span>
                              )}
                              {entitySearchResults.length > 0 && (
                                <div className="absolute z-50 w-full border border-gray-200 rounded-md bg-white shadow-md mt-1 max-h-40 overflow-y-auto">
                                  {entitySearchResults.map((e) => (
                                    <button
                                      key={e.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedEntityObj(e);
                                        setSelectedEntityId(e.id);
                                        setEntitySearchQuery(e.company_name);
                                        setEntitySearchResults([]);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                                    >
                                      <span>{e.company_name}</span>
                                      <span className="text-xs text-gray-400">{e.city}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="status-select">Status *</Label>
                          <Select
                            value={involvementStatus}
                            onValueChange={setInvolvementStatus}
                          >
                            <SelectTrigger id="status-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="negotiation">
                                In Negotiation
                              </SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="win">Won</SelectItem>
                              <SelectItem value="lose">Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Business Connections */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">
                          Business Connections
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {/* BOQs */}
                            <div>
                              <Label
                                htmlFor="assigned-boqs"
                                className="text-sm font-medium"
                              >
                                BOQs
                              </Label>
                              <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                {boqs.length === 0 ? (
                                  <p className="text-gray-500 text-xs">
                                    No BOQs available
                                  </p>
                                ) : (
                                  boqs.map((boq) => (
                                    <div
                                      key={boq.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`boq-${boq.id}`}
                                        checked={assignedBOQs.includes(boq.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAssignedBOQs([
                                              ...assignedBOQs,
                                              boq.id,
                                            ]);
                                          } else {
                                            setAssignedBOQs(
                                              assignedBOQs.filter(
                                                (id) => id !== boq.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <label
                                        htmlFor={`boq-${boq.id}`}
                                        className="text-xs"
                                      >
                                        {boq.boq_number ||
                                          `BOQ-${boq.id.slice(0, 6)}`}{" "}
                                        (₹{(boq.total_amount ?? 0).toLocaleString()})
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Sales Orders */}
                            <div>
                              <Label
                                htmlFor="assigned-sales-orders"
                                className="text-sm font-medium"
                              >
                                Sales Orders
                              </Label>
                              <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                {salesOrders.length === 0 ? (
                                  <p className="text-gray-500 text-xs">
                                    No sales orders available
                                  </p>
                                ) : (
                                  salesOrders.map((order) => (
                                    <div
                                      key={order.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`order-${order.id}`}
                                        checked={assignedSalesOrders.includes(
                                          order.id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAssignedSalesOrders([
                                              ...assignedSalesOrders,
                                              order.id,
                                            ]);
                                          } else {
                                            setAssignedSalesOrders(
                                              assignedSalesOrders.filter(
                                                (id) => id !== order.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <label
                                        htmlFor={`order-${order.id}`}
                                        className="text-xs"
                                      >
                                        {order.order_number ||
                                          `SO-${order.id.slice(0, 6)}`}{" "}
                                        (₹{(order.total_amount ?? 0).toLocaleString()})
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Invoices */}
                            <div>
                              <Label
                                htmlFor="assigned-invoices"
                                className="text-sm font-medium"
                              >
                                Invoices
                              </Label>
                              <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                {invoices.length === 0 ? (
                                  <p className="text-gray-500 text-xs">
                                    No invoices available
                                  </p>
                                ) : (
                                  invoices.map((invoice) => (
                                    <div
                                      key={invoice.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`invoice-${invoice.id}`}
                                        checked={assignedInvoices.includes(
                                          invoice.id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAssignedInvoices([
                                              ...assignedInvoices,
                                              invoice.id,
                                            ]);
                                          } else {
                                            setAssignedInvoices(
                                              assignedInvoices.filter(
                                                (id) => id !== invoice.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <label
                                        htmlFor={`invoice-${invoice.id}`}
                                        className="text-xs"
                                      >
                                        {invoice.invoice_number ||
                                          `INV-${invoice.id.slice(0, 6)}`}{" "}
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Payments */}
                            <div>
                              <Label
                                htmlFor="assigned-payments"
                                className="text-sm font-medium"
                              >
                                Payments
                              </Label>
                              <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                {payments.length === 0 ? (
                                  <p className="text-gray-500 text-xs">
                                    No payments available
                                  </p>
                                ) : (
                                  payments.map((payment) => (
                                    <div
                                      key={payment.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`payment-${payment.id}`}
                                        checked={assignedPayments.includes(
                                          payment.id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAssignedPayments([
                                              ...assignedPayments,
                                              payment.id,
                                            ]);
                                          } else {
                                            setAssignedPayments(
                                              assignedPayments.filter(
                                                (id) => id !== payment.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <label
                                        htmlFor={`payment-${payment.id}`}
                                        className="text-xs"
                                      >
                                        {payment.payment_number ||
                                          `PAY-${payment.id.slice(0, 6)}`}{" "}
                                        (₹
                                        {payment.amount?.toLocaleString() ||
                                          "0"}
                                        )
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Warranties */}
                            <div>
                              <Label
                                htmlFor="assigned-warranties"
                                className="text-sm font-medium"
                              >
                                Warranties
                              </Label>
                              <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                {warranties.length === 0 ? (
                                  <p className="text-gray-500 text-xs">
                                    No warranties available
                                  </p>
                                ) : (
                                  warranties.map((warranty) => (
                                    <div
                                      key={warranty.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`warranty-${warranty.id}`}
                                        checked={assignedWarranties.includes(
                                          warranty.id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAssignedWarranties([
                                              ...assignedWarranties,
                                              warranty.id,
                                            ]);
                                          } else {
                                            setAssignedWarranties(
                                              assignedWarranties.filter(
                                                (id) => id !== warranty.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <label
                                        htmlFor={`warranty-${warranty.id}`}
                                        className="text-xs"
                                      >
                                        {warranty.warranty_number ||
                                          `WRR-${warranty.id.slice(0, 6)}`}{" "}
                                        ({warranty.warranty_period} months)
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div>
                        <Label>Additional Information</Label>
                        <div className="space-y-2">
                          {additionalInfoPairs.map((pair, index) => (
                            <div
                              key={index}
                              className="flex gap-2 items-center"
                            >
                              <Input
                                placeholder="Key (e.g., contact_person)"
                                value={pair.key}
                                onChange={(e) => {
                                  const newPairs = [...additionalInfoPairs];
                                  newPairs[index].key = e.target.value;
                                  setAdditionalInfoPairs(newPairs);
                                }}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Value (e.g., John Doe)"
                                value={pair.value}
                                onChange={(e) => {
                                  const newPairs = [...additionalInfoPairs];
                                  newPairs[index].value = e.target.value;
                                  setAdditionalInfoPairs(newPairs);
                                }}
                                className="flex-1"
                              />
                              {additionalInfoPairs.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newPairs = additionalInfoPairs.filter(
                                      (_, i) => i !== index,
                                    );
                                    setAdditionalInfoPairs(newPairs);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdditionalInfoPairs([
                                ...additionalInfoPairs,
                                { key: "", value: "" },
                              ]);
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Field
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Add any additional information as key-value pairs
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setInvolvementDialogOpen(false); resetInvolvementForm(); }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddInvolvement}
                        disabled={createInvolvementMutation.isPending || updateInvolvementMutation.isPending}
                      >
                        {editingInvolvement ? "Update Involvement" : "Add Involvement"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Assign Tab */}
              <TabsContent value="assign" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Assigned Users</h3>
                  <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign User
                  </Button>
                </div>
                {!assignments || assignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No users assigned yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <Card key={assignment.id} className="border">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-semibold">
                                  {assignment.user_name}
                                </span>
                                {assignment.role && (
                                  <Badge variant="outline">
                                    {assignment.role}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {assignment.user_email}
                              </p>
                              {assignment.notes && (
                                <p className="text-sm text-gray-600 italic">
                                  {assignment.notes}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Assigned by {assignment.assigned_by_name} on{" "}
                                {format(
                                  new Date(assignment.assigned_at || assignment.created_at),
                                  "MMM dd, yyyy",
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteAssignMutation.mutate(assignment.id)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Assign User Dialog */}
                <Dialog
                  open={assignDialogOpen}
                  onOpenChange={setAssignDialogOpen}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign User to Lead</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="user-select">User *</Label>
                        <Select
                          value={selectedUser}
                          onValueChange={setSelectedUser}
                        >
                          <SelectTrigger id="user-select">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users?.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="assign-role">Role</Label>
                        <Input
                          id="assign-role"
                          placeholder="e.g., Sales Manager, Technical Lead"
                          value={assignRole}
                          onChange={(e) => setAssignRole(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="assign-notes">Notes</Label>
                        <Textarea
                          id="assign-notes"
                          placeholder="Additional notes..."
                          value={assignNotes}
                          onChange={(e) => setAssignNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAssignUser} disabled={assignMutation.isPending}>
                        Assign
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Remarks Tab */}
              <TabsContent value="remarks" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Remarks & Milestones
                  </h3>
                  <Button size="sm" onClick={() => setRemarkDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Remark
                  </Button>
                </div>
                {!remarks || remarks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No remarks added yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {remarks.map((remark) => (
                      <Card key={remark.id} className="border">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <StickyNote className="h-4 w-4 text-blue-500" />
                                <span className="font-semibold">
                                  {remark.title}
                                </span>
                                <Badge variant="secondary">
                                  {remark.type}
                                </Badge>
                              </div>
                              {remark.content && (
                                <p className="text-sm text-gray-600">
                                  {remark.content}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                By {remark.author_name || remark.created_by_name} on{" "}
                                {format(
                                  new Date(remark.created_at),
                                  "MMM dd, yyyy HH:mm",
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRemark(remark)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteRemarkMutation.mutate(remark.id)
                                }
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Add Remark Dialog */}
                <Dialog
                  open={remarkDialogOpen}
                  onOpenChange={(open) => {
                    setRemarkDialogOpen(open);
                    if (!open) {
                      setEditingRemark(null);
                      setRemarkTitle("");
                      setRemarkDescription("");
                      setRemarkType("milestone");
                    }
                  }}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingRemark ? "Edit Remark" : "Add Remark"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="remark-type">Type</Label>
                        <Select
                          value={remarkType}
                          onValueChange={setRemarkType}
                        >
                          <SelectTrigger id="remark-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="milestone">Milestone</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="achievement">
                              Achievement
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="remark-title">Title *</Label>
                        <Input
                          id="remark-title"
                          placeholder="e.g., Initial Meeting Complete"
                          value={remarkTitle}
                          onChange={(e) => setRemarkTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="remark-desc">Description</Label>
                        <Textarea
                          id="remark-desc"
                          placeholder="Additional details..."
                          value={remarkDescription}
                          onChange={(e) => setRemarkDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRemarkDialogOpen(false)}>Cancel</Button>
                      <Button
                        onClick={handleAddRemark}
                        disabled={remarkMutation.isPending || updateRemarkMutation.isPending}
                      >
                        {editingRemark ? "Update Remark" : "Add Remark"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Comments & Discussion
                  </h3>
                </div>

                {/* Timeline Container */}
                <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                  {!comments || comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-16">
                      No comments yet. Start the discussion!
                    </p>
                  ) : (
                    <div className="space-y-6 relative">
                      {/* Timeline Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                      {comments.map((comment, index) => (
                        <div key={comment.id} className="relative flex gap-3">
                          {/* Avatar Circle */}
                          <div className="relative z-10 flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                              {(comment.author_name || comment.created_by_name)?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                          </div>

                          {/* Comment Bubble */}
                          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-3 relative">
                            {/* Arrow pointing to avatar */}
                            <div className="absolute left-0 top-3 w-0 h-0 -ml-2 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent"></div>

                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-semibold text-sm text-gray-900">
                                  {comment.author_name || comment.created_by_name}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {format(
                                    new Date(comment.created_at),
                                    "MMM dd, HH:mm",
                                  )}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteCommentMutation.mutate(comment.id)
                                }
                                className="h-6 w-6 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>

                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {comment.content || comment.comment}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Comment Form - Fixed at bottom */}
                <Card className="border-blue-200 bg-blue-50/50 sticky bottom-0">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Type your comment here..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleAddComment}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Post Comment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Documents</h3>
                  <Button size="sm" onClick={() => setDocDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                {!documents || documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="border">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-gray-500" />
                                <span className="font-semibold">
                                  {doc.file_name}
                                </span>
                                {doc.file_size != null && (
                                  <Badge variant="outline" className="text-xs">
                                    {(doc.file_size / 1024).toFixed(1)} KB
                                  </Badge>
                                )}
                              </div>
                              {doc.description && (
                                <p className="text-sm text-gray-600">
                                  {doc.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Uploaded by {doc.uploaded_by_name}
                                {(doc.uploaded_at || doc.created_at) && (
                                  <> on {format(new Date(doc.uploaded_at || doc.created_at), "MMM dd, yyyy")}</>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Download"
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDocMutation.mutate(doc.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Upload Document Dialog */}
                <Dialog
                  open={docDialogOpen}
                  onOpenChange={(open) => {
                    setDocDialogOpen(open);
                    if (!open) { setDocFile(null); setDocDescription(""); }
                  }}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="doc-file">File *</Label>
                        <Input
                          id="doc-file"
                          type="file"
                          onChange={(e) => setDocFile(e.target.files[0])}
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-desc">Description</Label>
                        <Textarea
                          id="doc-desc"
                          placeholder="Brief description of the document..."
                          value={docDescription}
                          onChange={(e) => setDocDescription(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleUploadDocument} disabled={uploadDocMutation.isPending}>
                        Upload
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </div>
        </div>{/* end 30:70 grid */}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete{" "}
                {deleteType === "sales_order"
                  ? "Proforma Invoice"
                  : deleteType === "purchase_order"
                    ? "Purchase Order"
                    : "BOQ"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this{" "}
                {deleteType === "sales_order"
                  ? "Proforma Invoice"
                  : deleteType === "purchase_order"
                    ? "Purchase Order"
                    : "BOQ"}
                ? This action cannot be undone.
              </AlertDialogDescription>
              {itemToDelete && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <strong>
                    {deleteType === "sales_order"
                      ? `${
                          itemToDelete.pi_number ||
                          itemToDelete.order_number ||
                          "PI"
                        } - ₹${itemToDelete.total_amount?.toLocaleString()}`
                      : deleteType === "purchase_order"
                        ? `${
                            itemToDelete.po_number || "PO"
                          } - ₹${itemToDelete.total_amount?.toLocaleString()}`
                        : `${
                            itemToDelete.boq_number || "BOQ"
                          } - ₹${itemToDelete.total_amount?.toLocaleString()}`}
                  </strong>
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={
                  deleteSalesOrderMutation.isPending ||
                  deleteBOQMutation.isPending ||
                  deletePurchaseOrderMutation.isPending
                }
              >
                {deleteSalesOrderMutation.isPending ||
                deleteBOQMutation.isPending ||
                deletePurchaseOrderMutation.isPending
                  ? "Deleting..."
                  : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Version History Modal */}
        <BOQVersionHistory
          boqId={selectedBOQId}
          isOpen={versionHistoryOpen}
          onClose={() => {
            setVersionHistoryOpen(false);
            setSelectedBOQId(null);
          }}
        />
      </div>
    </Layout>
  );
};

export default LeadDetail;
