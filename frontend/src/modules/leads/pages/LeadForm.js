import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  createLead,
  updateLead,
  fetchLead,
  deleteLead,
  createLeadInvolvement,
} from "../api";
import { searchCustomers, createCustomer, fetchCustomer } from "../../customers/api";
import { searchEntities, createEntity, fetchEntity } from "../../entities/api";
import { SOPSelector } from "../../workflow-engine";
import { assignSOP } from "../../workflow-engine/api";
import { Button } from "../../../components/ui/button";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
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
import { ArrowLeft, Plus, Trash2, Search, X, UserCheck } from "lucide-react";
import { toast } from "sonner";

// ─── Inline Customer Create Modal ──────────────────────────────────────────────
const BLANK_CUSTOMER = {
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  gstin: "",
};

const BLANK_ENTITY = {
  entity_type: "consultant",
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  gstin: "",
};

function CustomerCreateModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(BLANK_CUSTOMER);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      toast.success("Customer created!");
      onCreated(data);
      onClose();
      setForm(BLANK_CUSTOMER);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to create customer"),
  });

  const handleSubmit = () => {
    if (!form.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!form.contact_person.trim()) {
      toast.error("Contact person is required");
      return;
    }
    mutation.mutate({ ...form, status: "active" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Company Name *</Label>
            <Input
              className="h-9 text-sm"
              value={form.company_name}
              onChange={set("company_name")}
              placeholder="Company / Organisation"
            />
          </div>
          <div>
            <Label className="text-xs">Contact Person *</Label>
            <Input
              className="h-9 text-sm"
              value={form.contact_person}
              onChange={set("contact_person")}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              className="h-9 text-sm"
              value={form.phone}
              onChange={set("phone")}
              placeholder="9876543210"
            />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              className="h-9 text-sm"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input
              className="h-9 text-sm"
              value={form.city}
              onChange={set("city")}
            />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input
              className="h-9 text-sm"
              value={form.state}
              onChange={set("state")}
            />
          </div>
          <div>
            <Label className="text-xs">GSTIN</Label>
            <Input
              className="h-9 text-sm"
              value={form.gstin}
              onChange={set("gstin")}
              placeholder="29ABCDE1234F1Z5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntityCreateModal({
  open,
  onClose,
  onCreated,
  defaultType = "consultant",
}) {
  const [form, setForm] = useState({
    ...BLANK_ENTITY,
    entity_type: defaultType,
  });
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  React.useEffect(() => {
    if (open) setForm({ ...BLANK_ENTITY, entity_type: defaultType });
  }, [open, defaultType]);

  const mutation = useMutation({
    mutationFn: (data) => createEntity(data),
    onSuccess: (data) => {
      toast.success("Entity created!");
      onCreated(data);
      onClose();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to create entity"),
  });

  const handleSubmit = () => {
    if (!form.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!form.contact_person.trim()) {
      toast.error("Contact person is required");
      return;
    }
    mutation.mutate({ ...form, status: "active" });
  };

  const typeLabel =
    defaultType === "consultant" ? "Consultant" : "Bidder Entity";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New {typeLabel}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {defaultType !== "consultant" && (
            <div className="col-span-2">
              <Label className="text-xs">Entity Type *</Label>
              <Select
                value={form.entity_type}
                onValueChange={(v) => setForm({ ...form, entity_type: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="si">System Integrator</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-2">
            <Label className="text-xs">Company Name *</Label>
            <Input
              className="h-9 text-sm"
              value={form.company_name}
              onChange={set("company_name")}
              placeholder="Company name"
            />
          </div>
          <div>
            <Label className="text-xs">Contact Person *</Label>
            <Input
              className="h-9 text-sm"
              value={form.contact_person}
              onChange={set("contact_person")}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              className="h-9 text-sm"
              value={form.phone}
              onChange={set("phone")}
              placeholder="9876543210"
            />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              className="h-9 text-sm"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input
              className="h-9 text-sm"
              value={form.city}
              onChange={set("city")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bidder Multi-select ───────────────────────────────────────────────────────
function BidderSelect({ selectedIds, onChange, externalEntities = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // Store full entity objects so chips display names, not IDs
  const [selectedEntities, setSelectedEntities] = useState([]);

  // Merge externally added entities (e.g. from inline create modal)
  useEffect(() => {
    if (externalEntities.length > 0) {
      setSelectedEntities((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newOnes = externalEntities.filter((e) => !existingIds.has(e.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
  }, [externalEntities]);

  const doSearch = useCallback(
    async (q) => {
      if (!q || q.length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await searchEntities(q, 15);
        setResults(data.filter((e) => !selectedIds.includes(e.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [selectedIds],
  );

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const addBidder = (entity) => {
    const next = [...selectedEntities, entity];
    setSelectedEntities(next);
    onChange(next.map((e) => e.id));
    setQuery("");
    setResults([]);
  };

  const removeBidder = (entityId) => {
    const next = selectedEntities.filter((e) => e.id !== entityId);
    setSelectedEntities(next);
    onChange(next.map((e) => e.id));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entity by name..."
          className="pl-9"
        />
        {searching && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">
            Searching...
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div className="relative z-10 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-y-auto">
          {results.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => addBidder(e)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span>{e.company_name}</span>
              <span className="text-xs text-gray-400">{e.entity_type}</span>
            </button>
          ))}
        </div>
      )}

      {selectedEntities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEntities.map((entity) => (
            <span
              key={entity.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
            >
              {entity.company_name}
              <button type="button" onClick={() => removeBidder(entity.id)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main LeadForm ─────────────────────────────────────────────────────────────
const LeadForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    source: "",
    project_name: "",
    customer_id: "",
    is_consultant_involved: false,
    consultant_entity_id: "",
    bidder_entity_ids: [],
    priority: "medium",
    expected_value: "",
    expected_close_date: "",
    notes: "",
    sop_id: "",
  });

  const [additionalInfo, setAdditionalInfo] = useState([
    { key: "", value: "" },
  ]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [consultantModalOpen, setConsultantModalOpen] = useState(false);
  const [bidderModalOpen, setBidderModalOpen] = useState(false);
  const [externalBidders, setExternalBidders] = useState([]);

  // Autocomplete state
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [consultantQuery, setConsultantQuery] = useState("");
  const [consultantResults, setConsultantResults] = useState([]);
  const [selectedConsultant, setSelectedConsultant] = useState(null);

  // ── Load existing lead ─────────────────────────────────────────────────────
  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        source: lead.source || "",
        project_name: lead.project_name || "",
        customer_id: lead.customer_id || "",
        is_consultant_involved: lead.is_consultant_involved || false,
        consultant_entity_id: lead.consultant_entity_id || "",
        bidder_entity_ids: lead.bidder_entity_ids || [],
        priority: lead.priority || "medium",
        expected_value: lead.expected_value ?? "",
        expected_close_date: lead.expected_close_date
          ? lead.expected_close_date.split("T")[0]
          : "",
        notes: lead.notes || "",
      });

      if (
        lead.additional_information &&
        typeof lead.additional_information === "object"
      ) {
        const info = Object.entries(lead.additional_information).map(
          ([key, value]) => ({ key, value }),
        );
        setAdditionalInfo(info.length > 0 ? info : [{ key: "", value: "" }]);
      }

      // Populate customer name in search field
      if (lead.customer_id) {
        if (lead.customer_name) {
          setCustomerQuery(lead.customer_name);
          setSelectedCustomer({ id: lead.customer_id, company_name: lead.customer_name });
        } else {
          fetchCustomer(lead.customer_id).then((c) => {
            setCustomerQuery(c.company_name || "");
            setSelectedCustomer(c);
          }).catch(() => {});
        }
      }

      // Populate consultant name in search field
      if (lead.is_consultant_involved && lead.consultant_entity_id) {
        fetchEntity(lead.consultant_entity_id).then((e) => {
          setConsultantQuery(e.company_name || "");
          setSelectedConsultant(e);
        }).catch(() => {});
      }
    }
  }, [lead]);

  // ── Customer search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!customerQuery || customerQuery.length < 1) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await searchCustomers(customerQuery, 10);
        setCustomerResults(data);
      } catch {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setFormData((prev) => ({ ...prev, customer_id: c.id }));
    setCustomerQuery(c.company_name);
    setCustomerResults([]);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setFormData((prev) => ({ ...prev, customer_id: "" }));
    setCustomerQuery("");
  };

  // ── Consultant search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !formData.is_consultant_involved ||
      !consultantQuery ||
      consultantQuery.length < 1
    ) {
      setConsultantResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await searchEntities(consultantQuery, 10, "consultant");
        setConsultantResults(data);
      } catch {
        setConsultantResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [consultantQuery, formData.is_consultant_involved]);

  const selectConsultant = (e) => {
    setSelectedConsultant(e);
    setFormData((prev) => ({ ...prev, consultant_entity_id: e.id }));
    setConsultantQuery(e.company_name);
    setConsultantResults([]);
  };

  const clearConsultant = () => {
    setSelectedConsultant(null);
    setFormData((prev) => ({ ...prev, consultant_entity_id: "" }));
    setConsultantQuery("");
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const sopId = data.sop_id;
      delete data.sop_id;

      const lead = await createLead(data);

      // Assign SOP to set initial state
      if (sopId) {
        await assignSOP("lead", lead.id, { sop_id: sopId });
      }

      // Auto-create involvement records for consultant and bidders
      const involvementPromises = [];
      if (data.is_consultant_involved && data.consultant_entity_id) {
        involvementPromises.push(
          createLeadInvolvement({
            lead_id: lead.id,
            entity_id: data.consultant_entity_id,
            involvement_type: "consultant",
            status: "active",
          }),
        );
      }
      for (const entityId of data.bidder_entity_ids || []) {
        involvementPromises.push(
          createLeadInvolvement({
            lead_id: lead.id,
            entity_id: entityId,
            involvement_type: "si",
            status: "active",
          }),
        );
      }
      if (involvementPromises.length > 0) {
        await Promise.allSettled(involvementPromises);
      }
      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      queryClient.invalidateQueries(["workflow-stats"]);
      toast.success("Lead created successfully!");
      navigate("/leads");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to create lead"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      queryClient.invalidateQueries(["lead-stats"]);
      toast.success("Lead updated successfully!");
      navigate("/leads");
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Failed to update lead";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      queryClient.invalidateQueries(["lead-stats"]);
      toast.success("Lead deleted!");
      navigate("/leads");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to delete lead"),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isEdit && !formData.sop_id) {
      toast.error("Please select a workflow (SOP) for this lead");
      return;
    }

    const submitData = { ...formData };

    // Remove sop_id during edit — not part of LeadUpdate schema
    if (isEdit) delete submitData.sop_id;

    if (
      submitData.expected_value !== "" &&
      submitData.expected_value !== null
    ) {
      submitData.expected_value = Number(submitData.expected_value);
    } else {
      delete submitData.expected_value;
    }
    if (!submitData.expected_close_date) delete submitData.expected_close_date;
    if (!submitData.is_consultant_involved)
      submitData.consultant_entity_id = null;

    // Additional info → dict
    const infoObject = {};
    additionalInfo.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) infoObject[key.trim()] = value.trim();
    });
    if (Object.keys(infoObject).length > 0)
      submitData.additional_information = infoObject;

    if (isEdit) updateMutation.mutate(submitData);
    else createMutation.mutate(submitData);
  };

  // ── Additional info helpers ────────────────────────────────────────────────
  const addInfoRow = () =>
    setAdditionalInfo([...additionalInfo, { key: "", value: "" }]);
  const removeInfoRow = (i) =>
    setAdditionalInfo(additionalInfo.filter((_, idx) => idx !== i));
  const updateInfoRow = (i, field, val) => {
    const updated = [...additionalInfo];
    updated[i][field] = val;
    setAdditionalInfo(updated);
  };

  const set = (field) => (value) =>
    setFormData({ ...formData, [field]: value });

  if (isLoadingLead) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/leads")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Leads
          </Button>
          {isEdit && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Info */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isEdit ? "Edit Lead" : "New Lead"}
              </p>

              <div
                className={`grid gap-3 ${!isEdit ? "grid-cols-3" : "grid-cols-2"}`}
              >
                {!isEdit && (
                  <SOPSelector
                    module="sales"
                    value={formData.sop_id}
                    onChange={(val) => set("sop_id")(val)}
                    label="SOP *"
                  />
                )}
                <div>
                  <Label className="text-xs">Source *</Label>
                  <Input
                    className="h-9 text-sm"
                    value={formData.source}
                    onChange={(e) => set("source")(e.target.value)}
                    placeholder="Website, Referral, Cold Call"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Project Name</Label>
                  <Input
                    className="h-9 text-sm"
                    value={formData.project_name}
                    onChange={(e) => set("project_name")(e.target.value)}
                    placeholder="Office CCTV Installation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={set("priority")}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Expected Value (₹)</Label>
                  <Input
                    className="h-9 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.expected_value}
                    onChange={(e) => set("expected_value")(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Expected Close Date</Label>
                  <Input
                    className="h-9 text-sm"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => set("expected_close_date")(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Customer */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setCustomerModalOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> New
                </Button>
              </div>
              <div className="relative">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-green-50/50">
                    <div>
                      <p className="text-sm font-medium">
                        {selectedCustomer.company_name}
                      </p>
                      {selectedCustomer.contact_person && (
                        <p className="text-[11px] text-muted-foreground">
                          {selectedCustomer.contact_person}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={clearCustomer}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-9 text-sm pl-9"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Search customer..."
                    />
                  </>
                )}
              </div>
              {customerResults.length > 0 && !selectedCustomer && (
                <div className="border rounded-md bg-background shadow-sm max-h-36 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">{c.company_name}</span>
                      {c.contact_person && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {c.contact_person}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Stakeholders */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Stakeholders
              </p>

              {/* Consultant */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_consultant_involved}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        is_consultant_involved: e.target.checked,
                        consultant_entity_id: "",
                      });
                      setSelectedConsultant(null);
                      setConsultantQuery("");
                    }}
                    className="h-3.5 w-3.5 rounded"
                  />
                  <span className="text-xs font-medium">
                    Consultant involved?
                  </span>
                </label>

                {formData.is_consultant_involved && (
                  <div className="pl-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Select Consultant
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setConsultantModalOpen(true)}
                      >
                        <Plus className="h-2.5 w-2.5 mr-0.5" /> New
                      </Button>
                    </div>
                    <div className="relative">
                      {selectedConsultant ? (
                        <div className="flex items-center justify-between border rounded-md px-3 py-1.5 bg-blue-50/50 text-sm">
                          <span className="font-medium">
                            {selectedConsultant.company_name}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={clearConsultant}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <UserCheck className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            className="h-8 text-sm pl-9"
                            value={consultantQuery}
                            onChange={(e) => setConsultantQuery(e.target.value)}
                            placeholder="Search consultant..."
                          />
                        </>
                      )}
                    </div>
                    {consultantResults.length > 0 && !selectedConsultant && (
                      <div className="border rounded-md bg-background shadow-sm max-h-32 overflow-y-auto">
                        {consultantResults.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => selectConsultant(e)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50"
                          >
                            {e.company_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bidders */}
              <div className="pt-2 border-t border-border/40 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Bidders</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setBidderModalOpen(true)}
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" /> New Bidder
                  </Button>
                </div>
                <BidderSelect
                  selectedIds={formData.bidder_entity_ids}
                  externalEntities={externalBidders}
                  onChange={(ids) =>
                    setFormData({ ...formData, bidder_entity_ids: ids })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Additional Info + Notes */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Additional
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={addInfoRow}
                >
                  <Plus className="h-2.5 w-2.5 mr-0.5" /> Add Field
                </Button>
              </div>
              {additionalInfo.map((info, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="Key"
                    value={info.key}
                    onChange={(e) => updateInfoRow(idx, "key", e.target.value)}
                  />
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="Value"
                    value={info.value}
                    onChange={(e) =>
                      updateInfoRow(idx, "value", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeInfoRow(idx)}
                    disabled={additionalInfo.length === 1}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="text-sm resize-none"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => set("notes")(e.target.value)}
                  placeholder="Additional context..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/leads")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEdit
                  ? "Update Lead"
                  : "Create Lead"}
            </Button>
          </div>
        </form>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the lead
                <strong className="block mt-2 text-foreground">
                  {lead?.project_name || lead?.source}
                </strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Inline Customer Create */}
      <CustomerCreateModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={(newCustomer) => selectCustomer(newCustomer)}
      />

      {/* Inline Consultant Create */}
      <EntityCreateModal
        open={consultantModalOpen}
        onClose={() => setConsultantModalOpen(false)}
        defaultType="consultant"
        onCreated={(entity) => {
          setSelectedConsultant(entity);
          setFormData((prev) => ({ ...prev, consultant_entity_id: entity.id }));
          setConsultantQuery(entity.company_name);
        }}
      />

      {/* Inline Bidder Create */}
      <EntityCreateModal
        open={bidderModalOpen}
        onClose={() => setBidderModalOpen(false)}
        defaultType="si"
        onCreated={(entity) => {
          setFormData((prev) => ({
            ...prev,
            bidder_entity_ids: [...(prev.bidder_entity_ids || []), entity.id],
          }));
          setExternalBidders((prev) => [...prev, entity]);
          toast.success(`${entity.company_name} added as bidder`);
        }}
      />
    </Layout>
  );
};

export default LeadForm;
