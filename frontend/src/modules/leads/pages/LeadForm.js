import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createLead, updateLead, fetchLead, deleteLead, createLeadInvolvement } from "../api";
import { searchCustomers, createCustomer } from "../../customers/api";
import { searchEntities } from "../../entities/api";
import { SOPSelector } from "../../workflow-engine";
import { assignSOP } from "../../workflow-engine/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Search, X, UserCheck } from "lucide-react";
import { toast } from "sonner";

// ─── Inline Customer Create Modal ──────────────────────────────────────────────
const BLANK_CUSTOMER = {
  company_name: "", contact_person: "", phone: "", email: "",
  city: "", state: "", gstin: "",
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
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to create customer"),
  });

  const handleSubmit = () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    mutation.mutate({ ...form, entity_type: "end_customer", status: "active" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Company Name *</Label>
            <Input value={form.company_name} onChange={set("company_name")} placeholder="Company / Organisation" />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input value={form.contact_person} onChange={set("contact_person")} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={set("city")} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={form.state} onChange={set("state")} />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input value={form.gstin} onChange={set("gstin")} placeholder="29ABCDE1234F1Z5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Create Customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bidder Multi-select ───────────────────────────────────────────────────────
function BidderSelect({ selectedIds, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // Store full entity objects so chips display names, not IDs
  const [selectedEntities, setSelectedEntities] = useState([]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await searchEntities(q, 15);
      setResults(data.filter((e) => !selectedIds.includes(e.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [selectedIds]);

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
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</span>
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

  const [additionalInfo, setAdditionalInfo] = useState([{ key: "", value: "" }]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

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

      if (lead.additional_information && typeof lead.additional_information === "object") {
        const info = Object.entries(lead.additional_information).map(([key, value]) => ({ key, value }));
        setAdditionalInfo(info.length > 0 ? info : [{ key: "", value: "" }]);
      }
    }
  }, [lead]);

  // ── Customer search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!customerQuery || customerQuery.length < 1) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const data = await searchCustomers(customerQuery, 10);
        setCustomerResults(data);
      } catch { setCustomerResults([]); }
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
    if (!formData.is_consultant_involved || !consultantQuery || consultantQuery.length < 1) {
      setConsultantResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await searchEntities(consultantQuery, 10, "consultant");
        setConsultantResults(data);
      } catch { setConsultantResults([]); }
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
          })
        );
      }
      for (const entityId of (data.bidder_entity_ids || [])) {
        involvementPromises.push(
          createLeadInvolvement({
            lead_id: lead.id,
            entity_id: entityId,
            involvement_type: "si",
            status: "active",
          })
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
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to create lead"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      queryClient.invalidateQueries(["lead-stats"]);
      toast.success("Lead updated successfully!");
      navigate("/leads");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to update lead"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      queryClient.invalidateQueries(["lead-stats"]);
      toast.success("Lead deleted!");
      navigate("/leads");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to delete lead"),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isEdit && !formData.sop_id) {
      toast.error("Please select a workflow (SOP) for this lead");
      return;
    }

    const submitData = { ...formData };

    if (submitData.expected_value !== "" && submitData.expected_value !== null) {
      submitData.expected_value = Number(submitData.expected_value);
    } else {
      delete submitData.expected_value;
    }
    if (!submitData.expected_close_date) delete submitData.expected_close_date;
    if (!submitData.is_consultant_involved) submitData.consultant_entity_id = null;

    // Additional info → dict
    const infoObject = {};
    additionalInfo.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) infoObject[key.trim()] = value.trim();
    });
    if (Object.keys(infoObject).length > 0) submitData.additional_information = infoObject;

    if (isEdit) updateMutation.mutate(submitData);
    else createMutation.mutate(submitData);
  };

  // ── Additional info helpers ────────────────────────────────────────────────
  const addInfoRow = () => setAdditionalInfo([...additionalInfo, { key: "", value: "" }]);
  const removeInfoRow = (i) => setAdditionalInfo(additionalInfo.filter((_, idx) => idx !== i));
  const updateInfoRow = (i, field, val) => {
    const updated = [...additionalInfo];
    updated[i][field] = val;
    setAdditionalInfo(updated);
  };

  const set = (field) => (value) => setFormData({ ...formData, [field]: value });

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
      <div className="w-full px-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/leads")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads
          </Button>
          {isEdit && (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
            </Button>
          )}
        </div>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">
              {isEdit ? "Edit Lead" : "Create New Lead"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* SOP Selection (only for new leads) */}
              {!isEdit && (
                <div className="grid grid-cols-2 gap-4">
                  <SOPSelector
                    module="sales"
                    value={formData.sop_id}
                    onChange={(val) => set("sop_id")(val)}
                    label="Select Workflow (SOP) *"
                  />
                </div>
              )}

              {/* Source + Project Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source *</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => set("source")(e.target.value)}
                    placeholder="e.g., Website, Referral, Cold Call"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="project_name">Project Name</Label>
                  <Input
                    id="project_name"
                    value={formData.project_name}
                    onChange={(e) => set("project_name")(e.target.value)}
                    placeholder="e.g., Office CCTV Installation"
                  />
                </div>
              </div>

              {/* Customer selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Customer *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCustomerModalOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> New Customer
                  </Button>
                </div>
                <div className="relative">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-green-50">
                      <div>
                        <p className="text-sm font-medium">{selectedCustomer.company_name}</p>
                        {selectedCustomer.contact_person && (
                          <p className="text-xs text-gray-500">{selectedCustomer.contact_person}</p>
                        )}
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={clearCustomer}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        placeholder="Search customer by name..."
                        className="pl-9"
                      />
                    </>
                  )}
                </div>

                {customerResults.length > 0 && !selectedCustomer && (
                  <div className="border border-gray-200 rounded-md bg-white shadow-sm mt-1 max-h-40 overflow-y-auto z-10 relative">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <p className="font-medium">{c.company_name}</p>
                        {c.contact_person && <p className="text-xs text-gray-400">{c.contact_person}</p>}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Select an existing customer or create a new one above.
                </p>
              </div>

              {/* Consultant Involvement */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_consultant_involved"
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
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_consultant_involved" className="cursor-pointer">
                    Consultant involved in this lead?
                  </Label>
                </div>

                {formData.is_consultant_involved && (
                  <div className="ml-7">
                    <Label className="text-sm text-gray-600 mb-1 block">Select Consultant</Label>
                    <div className="relative">
                      {selectedConsultant ? (
                        <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-blue-50">
                          <div>
                            <p className="text-sm font-medium">{selectedConsultant.company_name}</p>
                            {selectedConsultant.contact_person && (
                              <p className="text-xs text-gray-500">{selectedConsultant.contact_person}</p>
                            )}
                          </div>
                          <Button type="button" size="sm" variant="ghost" onClick={clearConsultant}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            value={consultantQuery}
                            onChange={(e) => setConsultantQuery(e.target.value)}
                            placeholder="Search consultant..."
                            className="pl-9"
                          />
                        </>
                      )}
                    </div>
                    {consultantResults.length > 0 && !selectedConsultant && (
                      <div className="relative z-10 border border-gray-200 rounded-md bg-white shadow-sm mt-1 max-h-40 overflow-y-auto">
                        {consultantResults.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => selectConsultant(e)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            {e.company_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bidder(s) */}
              <div>
                <Label className="block mb-2">Bidder(s) Involved</Label>
                <p className="text-xs text-gray-400 mb-2">
                  Select one or more bidding entities (dealers, SIs, distributors, etc.)
                </p>
                <BidderSelect
                  selectedIds={formData.bidder_entity_ids}
                  onChange={(ids) => setFormData({ ...formData, bidder_entity_ids: ids })}
                />
              </div>

              {/* Priority + Expected Value + Close Date */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={set("priority")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
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
                  <Label htmlFor="expected_value">Expected Value (₹)</Label>
                  <Input
                    id="expected_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.expected_value}
                    onChange={(e) => set("expected_value")(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="expected_close_date">Expected Close Date</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => set("expected_close_date")(e.target.value)}
                  />
                </div>
              </div>

              {/* Additional Info (key-value pairs) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Additional Information</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addInfoRow}>
                    <Plus className="h-4 w-4 mr-1" /> Add Info
                  </Button>
                </div>
                <div className="space-y-2">
                  {additionalInfo.map((info, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="Key (e.g., Budget)"
                        value={info.key}
                        onChange={(e) => updateInfoRow(idx, "key", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value (e.g., 5 Lakhs)"
                        value={info.value}
                        onChange={(e) => updateInfoRow(idx, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInfoRow(idx)}
                        disabled={additionalInfo.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => set("notes")(e.target.value)}
                  rows={3}
                  placeholder="Any additional context or details..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/leads")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {isEdit ? "Update Lead" : "Create Lead"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
    </Layout>
  );
};

export default LeadForm;
