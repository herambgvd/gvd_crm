import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchMovementCategories,
  createMovementCategory,
  updateMovementCategory,
  deleteMovementCategory,
} from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
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
import { Switch } from "../../../components/ui/switch";
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
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";

const MovementCategories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    direction: "out",
    affects_stock: true,
    is_active: true,
  });

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["movementCategories", searchQuery],
    queryFn: () =>
      fetchMovementCategories({ search: searchQuery, page_size: 100 }),
  });

  const categories = data?.items || [];

  const createMutation = useMutation({
    mutationFn: createMovementCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(["movementCategories"]);
      toast.success("Category created successfully!");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMovementCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["movementCategories"]);
      toast.success("Category updated successfully!");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMovementCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(["movementCategories"]);
      toast.success("Category deleted successfully!");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete category");
    },
  });

  const openCreate = () => {
    setEditCategory(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      direction: "out",
      affects_stock: true,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (category) => {
    setEditCategory(category);
    setFormData({
      name: category.name || "",
      code: category.code || "",
      description: category.description || "",
      direction: category.direction || "out",
      affects_stock: category.affects_stock !== false,
      is_active: category.is_active !== false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditCategory(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      direction: "out",
      affects_stock: true,
      is_active: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required");
      return;
    }

    if (editCategory) {
      updateMutation.mutate({ id: editCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  const getDirectionIcon = (direction) => {
    switch (direction) {
      case "in":
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case "out":
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/inventory/config")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Movement Categories
              </h1>
              <p className="text-gray-600">
                Manage stock movement types (Demo, POC, Faulty, etc.)
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Tag className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">{categories.length}</p>
                <p className="text-xs text-gray-500">Total Categories</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {categories.filter((c) => c.direction === "out").length}
                </p>
                <p className="text-xs text-gray-500">Outgoing Types</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {categories.filter((c) => c.direction === "in").length}
                </p>
                <p className="text-xs text-gray-500">Incoming Types</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No movement categories yet. Create your first one!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Affects Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {category.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(category.direction)}
                          <span className="capitalize">
                            {category.direction}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.affects_stock !== false ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            category.is_active !== false
                              ? "default"
                              : "secondary"
                          }
                        >
                          {category.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editCategory ? "Edit Category" : "New Movement Category"}
              </DialogTitle>
              <DialogDescription>
                {editCategory
                  ? "Update category information"
                  : "Create a new stock movement category"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Demo Unit"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. DEMO"
                    maxLength={20}
                    required
                  />
                </div>
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
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, direction: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        Out (Stock goes out)
                      </div>
                    </SelectItem>
                    <SelectItem value="in">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                        In (Stock comes in)
                      </div>
                    </SelectItem>
                    <SelectItem value="transfer">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                        Transfer (Internal move)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="affects_stock"
                    checked={formData.affects_stock}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        affects_stock: checked,
                      }))
                    }
                  />
                  <Label htmlFor="affects_stock">Affects Stock Quantity</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{categoryToDelete?.name}"? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
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

export default MovementCategories;
