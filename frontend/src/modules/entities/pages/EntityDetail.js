import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchEntity,
  fetchTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent } from "../../../components/ui/card";
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
import {
  ArrowLeft,
  Edit2,
  Plus,
  Trash2,
  UserCheck,
  Phone,
  Mail,
  Star,
} from "lucide-react";
import { toast } from "sonner";

const ENTITY_TYPE_LABELS = {
  consultant: "Consultant",
  dealer: "Dealer",
  si: "System Integrator",
  distributor: "Distributor",
  manufacturer: "Manufacturer",
  end_customer: "End Customer",
  other: "Other",
};

const BLANK_MEMBER = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  is_primary_contact: false,
  notes: "",
};

const EntityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("info");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState(BLANK_MEMBER);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: entity, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: () => fetchEntity(id),
    enabled: !!id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", id],
    queryFn: () => fetchTeamMembers(id),
    enabled: !!id && activeTab === "team",
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMemberMutation = useMutation({
    mutationFn: (data) => createTeamMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["team-members", id]);
      toast.success("Team member added");
      setMemberDialogOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to add member"),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, data }) => updateTeamMember(id, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["team-members", id]);
      toast.success("Team member updated");
      setMemberDialogOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to update member"),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId) => deleteTeamMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries(["team-members", id]);
      toast.success("Team member removed");
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to remove member"),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingMember(null);
    setMemberForm(BLANK_MEMBER);
    setMemberDialogOpen(true);
  };

  const openEditDialog = (member) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name || "",
      designation: member.designation || "",
      email: member.email || "",
      phone: member.phone || "",
      is_primary_contact: member.is_primary_contact || false,
      notes: member.notes || "",
    });
    setMemberDialogOpen(true);
  };

  const openDeleteDialog = (member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleMemberSubmit = () => {
    if (!memberForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (editingMember) {
      updateMemberMutation.mutate({ memberId: editingMember.id, data: memberForm });
    } else {
      createMemberMutation.mutate(memberForm);
    }
  };

  const setF = (field) => (e) =>
    setMemberForm({ ...memberForm, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!entity) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">Entity not found.</div>
      </Layout>
    );
  }

  const tabs = [
    { id: "info", label: "Entity Info" },
    { id: "team", label: "Team Members" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/entities")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Entities
          </Button>
          <Button variant="outline" onClick={() => navigate(`/entities/edit/${id}`)}>
            <Edit2 className="mr-2 h-4 w-4" /> Edit Entity
          </Button>
        </div>

        {/* Entity header card */}
        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{entity.company_name}</h1>
                <p className="text-gray-500 mt-1">{entity.contact_person}</p>
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                entity.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}>
                {entity.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
              {entity.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" /> {entity.phone}
                </div>
              )}
              {entity.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" /> {entity.email}
                </div>
              )}
              {entity.city && <div className="text-gray-600">{entity.city}{entity.state ? `, ${entity.state}` : ""}</div>}
              {entity.gstin && <div className="text-gray-600">GSTIN: {entity.gstin}</div>}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "info" && (
          <Card className="border border-gray-200">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                ["Company Name", entity.company_name],
                ["Contact Person", entity.contact_person],
                ["Phone", entity.phone],
                ["Alternate Phone", entity.alternate_phone],
                ["Email", entity.email],
                ["Address", entity.address],
                ["City", entity.city],
                ["State", entity.state],
                ["Pincode", entity.pincode],
                ["Country", entity.country],
                ["GSTIN", entity.gstin],
                ["PAN", entity.pan],
                ["Website", entity.website],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ) : null
              )}
              {entity.notes && (
                <div className="md:col-span-2">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Notes</p>
                  <p className="mt-0.5">{entity.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Team Members</h2>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Member
              </Button>
            </div>

            {teamMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                <UserCheck className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p>No team members yet.</p>
                <Button className="mt-3" onClick={openCreateDialog}>Add First Member</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamMembers.map((m) => (
                  <Card key={m.id} className="border border-gray-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{m.name}</p>
                            {m.is_primary_contact && (
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          {m.designation && <p className="text-sm text-gray-500">{m.designation}</p>}
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            {m.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</p>}
                            {m.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</p>}
                          </div>
                          {m.notes && <p className="text-xs text-gray-400 mt-2">{m.notes}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(m)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => openDeleteDialog(m)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Team Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={memberForm.name} onChange={setF("name")} placeholder="Full name" />
            </div>
            <div>
              <Label>Designation / Role</Label>
              <Input value={memberForm.designation} onChange={setF("designation")} placeholder="e.g., Sales Manager" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={memberForm.phone} onChange={setF("phone")} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={memberForm.email} onChange={setF("email")} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="primary_contact"
                checked={memberForm.is_primary_contact}
                onChange={setF("is_primary_contact")}
                className="h-4 w-4"
              />
              <Label htmlFor="primary_contact">Primary contact for this entity</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={memberForm.notes} onChange={setF("notes")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMemberSubmit}
              disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
            >
              {editingMember ? "Update" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToDelete?.name}</strong> from this entity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMemberMutation.mutate(memberToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default EntityDetail;
