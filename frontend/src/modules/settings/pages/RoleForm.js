import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchRoleById,
  createRole,
  updateRole,
  fetchPermissions,
} from "../api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Build a human-readable label from a permission codename.
 * e.g. "users:view" → "View", "inventory:stock_in" → "Stock In"
 */
function actionLabel(codename) {
  const action = codename.split(":")[1] || codename;
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resourceLabel(codename) {
  const resource = codename.split(":")[0] || codename;
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

const RoleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    permissions: [],
    is_active: true,
  });

  // Fetch permissions from API
  const { data: apiPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: fetchPermissions,
  });

  // Fetch role data if editing
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["role", id],
    queryFn: () => fetchRoleById(id),
    enabled: isEditing,
  });

  useEffect(() => {
    if (roleData && isEditing) {
      setFormData({
        name: roleData.name || "",
        display_name: roleData.display_name || "",
        description: roleData.description || "",
        permissions: roleData.permissions || [],
        is_active: roleData.is_active ?? true,
      });
    }
  }, [roleData, isEditing]);

  // Group permissions by resource (e.g. "users", "leads", "orders")
  const permissionsByCategory = useMemo(() => {
    const grouped = {};
    const perms = Array.isArray(apiPermissions) ? apiPermissions : [];
    for (const perm of perms) {
      const codename = perm.codename || perm.name || "";
      const resource = resourceLabel(codename);
      if (!grouped[resource]) grouped[resource] = [];
      grouped[resource].push({
        value: codename,
        label: actionLabel(codename),
      });
    }
    return grouped;
  }, [apiPermissions]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return updateRole(id, data);
      } else {
        return createRole(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["roles"]);
      toast.success(`Role ${isEditing ? "updated" : "created"} successfully!`);
      navigate("/settings/roles");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${isEditing ? "update" : "create"} role`,
      );
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const selectAllInCategory = (category) => {
    const categoryPermissions = (permissionsByCategory[category] || []).map(
      (p) => p.value,
    );

    const allSelected = categoryPermissions.every((p) =>
      formData.permissions.includes(p),
    );

    if (allSelected) {
      // Deselect all in category
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter(
          (p) => !categoryPermissions.includes(p),
        ),
      }));
    } else {
      // Select all in category
      setFormData((prev) => ({
        ...prev,
        permissions: [
          ...new Set([...prev.permissions, ...categoryPermissions]),
        ],
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (!formData.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error("At least one permission must be selected");
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      display_name: formData.display_name.trim(),
      description: formData.description.trim() || null,
      permissions: formData.permissions,
      is_active: formData.is_active,
    };

    mutation.mutate(submitData);
  };

  if ((isEditing && roleLoading) || permsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/settings/roles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditing ? "Edit Role" : "Create New Role"}
            </h1>
            <p className="text-gray-600">
              {isEditing
                ? "Update role information and permissions"
                : "Define a new role with specific permissions"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter role name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) =>
                      handleInputChange("display_name", e.target.value)
                    }
                    placeholder="Enter display name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Describe this role and its purpose"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      handleInputChange("is_active", checked)
                    }
                  />
                  <Label htmlFor="is_active">Active Role</Label>
                </div>

                {/* Summary */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm">Permission Summary</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.permissions.length} permission
                    {formData.permissions.length !== 1 ? "s" : ""} selected
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full"
                  >
                    {mutation.isPending
                      ? "Saving..."
                      : isEditing
                        ? "Update Role"
                        : "Create Role"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/settings/roles")}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <p className="text-sm text-gray-600">
                Select the permissions this role should have. Users with this
                role will inherit these permissions.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(
                  ([category, permissions]) => {
                    const categoryPermissions = permissions.map((p) => p.value);
                    const allSelected = categoryPermissions.every((p) =>
                      formData.permissions.includes(p),
                    );
                    const someSelected = categoryPermissions.some((p) =>
                      formData.permissions.includes(p),
                    );

                    return (
                      <div key={category} className="space-y-3">
                        {/* Category Header */}
                        <div className="flex items-center justify-between pb-2 border-b">
                          <h4 className="font-semibold text-sm text-gray-900">
                            {category}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => selectAllInCategory(category)}
                            className="text-xs"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>

                        {/* Permissions in Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {permissions.map((permission) => (
                            <div
                              key={permission.value}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={permission.value}
                                checked={formData.permissions.includes(
                                  permission.value,
                                )}
                                onCheckedChange={() =>
                                  handlePermissionToggle(permission.value)
                                }
                              />
                              <Label
                                htmlFor={permission.value}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {permission.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default RoleForm;
