import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchUserById, createUser, updateUser, fetchRoles } from "../api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    password: "",
    confirmPassword: "",
    role_ids: [],
    is_active: true,
    is_email_verified: false,
  });

  // Fetch user data if editing
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUserById(id),
    enabled: isEditing,
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  useEffect(() => {
    if (userData && isEditing) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        department: userData.department || "",
        designation: userData.designation || "",
        password: "",
        confirmPassword: "",
        role_ids: userData.role_ids || [],
        is_active: userData.is_active ?? true,
        is_email_verified: userData.is_email_verified ?? false,
      });
    }
  }, [userData, isEditing]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return updateUser(id, data);
      } else {
        return createUser(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success(`User ${isEditing ? "updated" : "created"} successfully!`);
      navigate("/settings/users");
    },
    onError: (error) => {
      let errorMessage = `Failed to ${isEditing ? "update" : "create"} user`;

      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle FastAPI validation errors
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Multiple validation errors
            errorMessage = errorData.detail
              .map((err) => `${err.loc?.join?.(" ") || "Field"}: ${err.msg}`)
              .join(", ");
          } else {
            // Single error message
            errorMessage = errorData.detail;
          }
        }
      }

      toast.error(errorMessage);
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRoleToggle = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Validate name has at least first name
    const nameParts = formData.name.trim().split(" ");
    if (nameParts.length < 1 || nameParts[0].length < 1) {
      toast.error("Please enter a valid name");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!isEditing) {
      if (!formData.password) {
        toast.error("Password is required for new users");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    } else if (formData.password) {
      // If editing and password is provided, validate it
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    }

    const submitData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      department: formData.department.trim() || null,
      designation: formData.designation.trim() || null,
      role_ids: formData.role_ids,
      is_active: formData.is_active,
      is_email_verified: formData.is_email_verified,
    };

    // Only include password if it's provided
    if (formData.password) {
      submitData.password = formData.password;
    }

    mutation.mutate(submitData);
  };

  if (isEditing && userLoading) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/settings/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? "Edit User" : "Create New User"}
            </h1>
            <p className="text-gray-600">
              {isEditing
                ? "Update user information and permissions"
                : "Add a new user to the system"}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        handleInputChange("department", e.target.value)
                      }
                      placeholder="Enter department"
                    />
                  </div>

                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) =>
                        handleInputChange("designation", e.target.value)
                      }
                      placeholder="Enter job designation"
                    />
                  </div>
                </div>

                {/* Security & Settings */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="password">
                      {isEditing
                        ? "New Password (leave blank to keep current)"
                        : "Password *"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      placeholder={
                        isEditing ? "Enter new password" : "Enter password"
                      }
                      required={!isEditing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">
                      {isEditing
                        ? "Confirm New Password"
                        : "Confirm Password *"}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      placeholder="Confirm password"
                      required={!isEditing || formData.password}
                    />
                  </div>

                  {/* Status Checkboxes */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          handleInputChange("is_active", checked)
                        }
                      />
                      <Label htmlFor="is_active">Active User</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_email_verified"
                        checked={formData.is_email_verified}
                        onCheckedChange={(checked) =>
                          handleInputChange("is_email_verified", checked)
                        }
                      />
                      <Label htmlFor="is_email_verified">Email Verified</Label>
                    </div>
                  </div>

                  {/* Roles */}
                  {roles && roles.length > 0 && (
                    <div>
                      <Label className="text-base font-semibold">Roles</Label>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={formData.role_ids.includes(role.id)}
                              onCheckedChange={() => handleRoleToggle(role.id)}
                            />
                            <Label
                              htmlFor={`role-${role.id}`}
                              className="text-sm"
                            >
                              {role.name}
                              {role.description && (
                                <span className="text-gray-500 ml-2">
                                  ({role.description})
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/settings/users")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="min-w-[100px]"
                >
                  {mutation.isPending
                    ? "Saving..."
                    : isEditing
                      ? "Update User"
                      : "Create User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UserForm;
