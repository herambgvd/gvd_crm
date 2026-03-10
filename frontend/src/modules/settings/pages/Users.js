import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchUsers, deleteUser } from "../api";
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
import { Plus, Edit, Trash2, User, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Users = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User deleted successfully!");
    },
    onError: (error) => {
      console.error("Delete user error:", error);
      let errorMessage = "Failed to delete user";

      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err) => `${err.loc?.join?.(" ") || "Error"}: ${err.msg}`)
              .join(", ");
          } else {
            errorMessage = errorData.detail;
          }
        }
      }

      toast.error(errorMessage);
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
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage system users and their access
            </p>
          </div>
          <Button onClick={() => navigate("/settings/users/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Users Grid */}
        {!users || users.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No users
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new user.
                </p>
                <div className="mt-6">
                  <Button onClick={() => navigate("/settings/users/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">
                        {user.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                          className={`text-xs ${
                            user.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {user.is_email_verified && (
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Department & Designation */}
                  {(user.department || user.designation) && (
                    <div className="space-y-1">
                      {user.designation && (
                        <p className="text-sm font-medium">
                          {user.designation}
                        </p>
                      )}
                      {user.department && (
                        <p className="text-xs text-gray-500">
                          {user.department}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Roles */}
                  {user.role_ids && user.role_ids.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Roles:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {user.role_ids.map((roleId, index) => (
                          <Badge
                            key={roleId}
                            variant="outline"
                            className="text-xs"
                          >
                            Role {index + 1}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Login */}
                  {user.last_login && (
                    <div className="text-xs text-gray-500">
                      Last login:{" "}
                      {format(new Date(user.last_login), "MMM dd, yyyy")}
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="text-xs text-gray-500">
                    Created: {format(new Date(user.created_at), "MMM dd, yyyy")}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        navigate(`/settings/users/edit/${user.id}`)
                      }
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
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
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.name}? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Users;
