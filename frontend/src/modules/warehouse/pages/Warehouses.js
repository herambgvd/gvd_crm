import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Plus,
  Edit,
  Trash2,
  Search,
  Warehouse,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const Warehouses = () => {
  const queryClient = useQueryClient();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const [formData, setFormData] = useState({
    unique_id: "",
    name: "",
    address: "",
    manager: "",
    contact_number: "",
  });

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch warehouses
  const { data, isLoading } = useQuery({
    queryKey: ["warehouses", currentPage, pageSize, searchQuery],
    queryFn: () =>
      fetchWarehouses({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
      }),
    keepPreviousData: true,
  });

  const warehouses = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries(["warehouses"]);
      toast.success("Warehouse created successfully!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create warehouse");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["warehouses"]);
      toast.success("Warehouse updated successfully!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update warehouse");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries(["warehouses"]);
      toast.success("Warehouse deleted successfully!");
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete warehouse");
    },
  });

  // Handlers
  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        unique_id: warehouse.unique_id,
        name: warehouse.name,
        address: warehouse.address || "",
        manager: warehouse.manager || "",
        contact_number: warehouse.contact_number || "",
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        unique_id: "",
        name: "",
        address: "",
        manager: "",
        contact_number: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWarehouse(null);
    setFormData({
      unique_id: "",
      name: "",
      address: "",
      manager: "",
      contact_number: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.unique_id || !formData.name) {
      toast.error("Unique ID and Name are required");
      return;
    }

    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (warehouseToDelete) {
      deleteMutation.mutate(warehouseToDelete.id);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  if (isLoading && !data) {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Warehouses</h1>
            <p className="text-muted-foreground">
              Manage warehouse locations ({total} total)
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            New Warehouse
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or manager..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of{" "}
              {total} warehouses
              {searchQuery && (
                <span className="ml-2 text-primary">(filtered)</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warehouses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Locations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Unique ID</th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Address</th>
                    <th className="text-left p-4 font-medium">Manager</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {warehouses.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-8 text-center text-muted-foreground"
                      >
                        <Warehouse className="mx-auto h-12 w-12 mb-2 opacity-20" />
                        <p>No warehouses found</p>
                        <p className="text-sm mt-1">
                          Create your first warehouse to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="hover:bg-muted/50">
                        <td className="p-4 font-medium">
                          {warehouse.unique_id}
                        </td>
                        <td className="p-4">{warehouse.name}</td>
                        <td className="p-4 text-muted-foreground">
                          {warehouse.address || "-"}
                        </td>
                        <td className="p-4">{warehouse.manager || "-"}</td>
                        <td className="p-4">
                          {warehouse.contact_number || "-"}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(warehouse)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(warehouse)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? "Edit Warehouse" : "New Warehouse"}
              </DialogTitle>
              <DialogDescription>
                {editingWarehouse
                  ? "Update warehouse information"
                  : "Add a new warehouse location"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unique_id">
                    Unique ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unique_id"
                    name="unique_id"
                    value={formData.unique_id}
                    onChange={handleInputChange}
                    placeholder="WH-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Main Warehouse"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address, city, state"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manager">Manager</Label>
                  <Input
                    id="manager"
                    name="manager"
                    value={formData.manager}
                    onChange={handleInputChange}
                    placeholder="Manager name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input
                    id="contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    placeholder="+91 1234567890"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isLoading || updateMutation.isLoading
                  }
                >
                  {editingWarehouse ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete warehouse{" "}
                <strong>{warehouseToDelete?.name}</strong>? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Warehouses;
