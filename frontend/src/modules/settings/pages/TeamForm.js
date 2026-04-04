import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchTeam, fetchUsers, createTeam, updateTeam } from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TeamForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader_id: undefined,
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
        leader_id: team.leader_id ? String(team.leader_id) : undefined,
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
      leader_id: formData.leader_id || null,
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

          {/* Leader Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Team Leader</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <>
                  <Select
                    key={`leader-select-${formData.leader_id || "none"}`}
                    value={formData.leader_id}
                    onValueChange={(val) => {
                      if (val !== undefined && val !== "") {
                        setFormData((prev) => ({ ...prev, leader_id: val }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => {
                        const userId = String(user.id);
                        return (
                          <SelectItem key={user.id} value={userId}>
                            {user.name ||
                              `${user.first_name} ${user.last_name}`}{" "}
                            ({user.email})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="text-sm text-gray-500">Loading users...</div>
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
