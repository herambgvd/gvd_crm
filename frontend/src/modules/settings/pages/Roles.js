import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchRoles, deleteRole } from "../api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
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
import { Plus, Edit, Trash2, Shield, Settings } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Roles = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries(["roles"]);
      toast.success("Role deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete role");
    },
  });

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Role Management
            </h1>
            <p className="text-gray-600">Manage user roles and permissions</p>
          </div>
          <Button onClick={() => navigate("/settings/roles/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>

        {/* Roles Grid */}
        {!roles || roles.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No roles
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new role.
                </p>
                <div className="mt-6">
                  <Button onClick={() => navigate("/settings/roles/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Role
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg font-semibold">
                          {role.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {role.is_system_role && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                          >
                            System Role
                          </Badge>
                        )}
                        <Badge
                          variant={role.is_active ? "default" : "secondary"}
                          className={`text-xs ${
                            role.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {role.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  {role.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  {/* Permissions */}
                  {role.permissions && role.permissions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        Permissions ({role.permissions.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <Badge
                            key={permission}
                            variant="outline"
                            className="text-xs px-2 py-1"
                          >
                            {permission
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-1"
                          >
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="text-xs text-gray-500">
                    Created: {format(new Date(role.created_at), "MMM dd, yyyy")}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        navigate(`/settings/roles/edit/${role.id}`)
                      }
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {!role.is_system_role && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Role</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the role "
                              {role.name}"? Users assigned to this role will
                              lose these permissions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(role.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {role.is_system_role && (
                    <div className="text-xs text-amber-600 bg-amber-50 rounded-md p-2 border border-amber-200">
                      <Settings className="inline h-3 w-3 mr-1" />
                      System roles cannot be deleted
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Permissions Legend */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Common Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <strong>read_users:</strong> View users
              </div>
              <div>
                <strong>write_users:</strong> Create/edit users
              </div>
              <div>
                <strong>delete_users:</strong> Delete users
              </div>
              <div>
                <strong>manage_roles:</strong> Role management
              </div>
              <div>
                <strong>read_leads:</strong> View leads
              </div>
              <div>
                <strong>write_leads:</strong> Create/edit leads
              </div>
              <div>
                <strong>read_boqs:</strong> View BOQs
              </div>
              <div>
                <strong>write_boqs:</strong> Create/edit BOQs
              </div>
              <div>
                <strong>read_invoices:</strong> View invoices
              </div>
              <div>
                <strong>write_invoices:</strong> Create/edit invoices
              </div>
              <div>
                <strong>read_reports:</strong> View reports
              </div>
              <div>
                <strong>admin_access:</strong> Full admin access
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Roles;
