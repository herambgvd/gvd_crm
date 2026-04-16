import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchTeam,
  fetchUsers,
  createTeam,
  updateTeam,
  fetchTeamGrants,
  createTeamGrant,
  revokeTeamGrant,
} from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft, Save, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const TeamForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader_ids: [],
    member_ids: [],
    department: "",
  });

  // Fetch team if editing
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => fetchTeam(id),
    enabled: isEdit,
  });

  // Fetch all users for leader/member selection
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  // Populate form for editing
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        description: team.description || "",
        leader_ids: team.leader_ids || (team.leader_id ? [team.leader_id] : []),
        member_ids: (team.member_ids || []).map((id) => String(id)),
        department: team.department || "",
      });
    }
  }, [team]);

  const createMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries(["teams"]);
      toast.success("Team created successfully!");
      navigate("/settings/teams");
    },
    onError: (error) => {
      const msg = error.response?.data?.detail || "Failed to create team";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateTeam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["teams"]);
      toast.success("Team updated successfully!");
      navigate("/settings/teams");
    },
    onError: (error) => {
      const msg = error.response?.data?.detail || "Failed to update team";
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    const payload = {
      ...formData,
      leader_ids: formData.leader_ids || [],
      member_ids: formData.member_ids || [],
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleMemberToggle = (userId) => {
    const userIdStr = String(userId);
    setFormData((prev) => ({
      ...prev,
      member_ids: prev.member_ids.includes(userIdStr)
        ? prev.member_ids.filter((id) => id !== userIdStr)
        : [...prev.member_ids, userIdStr],
    }));
  };

  // ─── Data Access Grants ───────────────────────────────
  const { data: grants = [], isLoading: grantsLoading } = useQuery({
    queryKey: ["teamGrants", id],
    queryFn: () => fetchTeamGrants(id),
    enabled: isEdit,
  });

  const [grantForm, setGrantForm] = useState({ grantee_id: "", target_user_id: "" });

  const createGrantMutation = useMutation({
    mutationFn: () => createTeamGrant(id, grantForm.grantee_id, grantForm.target_user_id),
    onSuccess: () => {
      queryClient.invalidateQueries(["teamGrants", id]);
      setGrantForm({ grantee_id: "", target_user_id: "" });
      toast.success("Grant created");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create grant");
    },
  });

  const revokeGrantMutation = useMutation({
    mutationFn: (grantId) => revokeTeamGrant(id, grantId),
    onSuccess: () => {
      queryClient.invalidateQueries(["teamGrants", id]);
      toast.success("Grant revoked");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to revoke grant");
    },
  });

  // Build team member + leader list for grant dropdowns
  const teamMemberOptions = users.filter((u) => {
    const uid = String(u.id);
    return formData.member_ids.includes(uid) || formData.leader_ids.includes(uid);
  });

  const getUserName = (userId) => {
    const u = users.find((u) => String(u.id) === String(userId));
    return u ? u.name || `${u.first_name} ${u.last_name}` : `User #${userId}`;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && teamLoading) {
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
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings/teams")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Edit Team" : "Create Team"}
            </h1>
            <p className="text-gray-600">
              {isEdit
                ? "Update team details and membership"
                : "Set up a new team with members and leader"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Sales Team North"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of the team..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  placeholder="e.g. Sales, Engineering, Support"
                />
              </div>
            </CardContent>
          </Card>

          {/* Leader Selection (multiple) */}
          <Card>
            <CardHeader>
              <CardTitle>Team Leaders ({formData.leader_ids.length} selected)</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-sm text-gray-500">Loading users...</div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-md divide-y divide-border/40">
                  {users.map((user) => {
                    const uid = String(user.id);
                    const fullName = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
                    const isSelected = formData.leader_ids.includes(uid);
                    return (
                      <label key={uid} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setFormData((prev) => ({
                              ...prev,
                              leader_ids: isSelected
                                ? prev.leader_ids.filter((id) => id !== uid)
                                : [...prev.leader_ids, uid],
                            }));
                          }}
                          className="h-3.5 w-3.5 rounded"
                        />
                        <span className="font-medium">{fullName}</span>
                        <span className="text-muted-foreground text-xs">{user.email}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member Selection */}
          <Card>
            <CardHeader>
              <CardTitle>
                Team Members ({formData.member_ids.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No users available</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.member_ids.includes(String(user.id))}
                        onCheckedChange={() => handleMemberToggle(user.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {user.name || `${user.first_name} ${user.last_name}`}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Sharing — only when editing */}
          {isEdit && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Data Sharing</CardTitle>
                <CardDescription className="text-xs">
                  Allow team members to see each other's data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing grants */}
                {grantsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading grants...</p>
                ) : grants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data sharing grants yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {grants.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5"
                      >
                        <span className="text-xs">
                          <span className="font-medium">{getUserName(g.grantee_id)}</span>
                          {" "}&rarr; can see &rarr;{" "}
                          <span className="font-medium">{getUserName(g.target_user_id)}</span>'s data
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => revokeGrantMutation.mutate(g.id)}
                          disabled={revokeGrantMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add grant form */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Grantee (who can see)</Label>
                    <Select
                      value={grantForm.grantee_id}
                      onValueChange={(val) =>
                        setGrantForm((prev) => ({ ...prev, grantee_id: val }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMemberOptions.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                            {u.name || `${u.first_name} ${u.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Target (whose data)</Label>
                    <Select
                      value={grantForm.target_user_id}
                      onValueChange={(val) =>
                        setGrantForm((prev) => ({ ...prev, target_user_id: val }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMemberOptions.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                            {u.name || `${u.first_name} ${u.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={
                      !grantForm.grantee_id ||
                      !grantForm.target_user_id ||
                      grantForm.grantee_id === grantForm.target_user_id ||
                      createGrantMutation.isPending
                    }
                    onClick={() => createGrantMutation.mutate()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEdit ? "Update Team" : "Create Team"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/settings/teams")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TeamForm;
