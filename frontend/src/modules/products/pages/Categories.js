import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchCategoryTree,
  fetchProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  fetchAllCategories,
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
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Tag,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Categories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_category_id: "",
  });

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch category tree (parents with nested subcategories)
  const { data: categoryTree = [], isLoading: treeLoading } = useQuery({
    queryKey: ["categoryTree"],
    queryFn: fetchCategoryTree,
    staleTime: 30 * 1000,
  });

  // Flat list for search results
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["categorySearch", searchQuery],
    queryFn: () =>
      fetchProductCategories({
        page: 1,
        page_size: 100,
        search: searchQuery,
      }),
    enabled: !!searchQuery,
    keepPreviousData: true,
  });

  // All categories for the parent selector in the form
  const { data: allCategories = [] } = useQuery({
    queryKey: ["productCategories"],
    queryFn: fetchAllCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Get only parent categories (no parent_category_id) for the dropdown
  const parentCategories = allCategories.filter((c) => !c.parent_category_id);

  const isLoading = searchQuery ? searchLoading : treeLoading;

  const totalCategories = allCategories.length;
  const totalParents = parentCategories.length;
  const totalSubs = totalCategories - totalParents;

  const invalidateAll = () => {
    queryClient.invalidateQueries(["categoryTree"]);
    queryClient.invalidateQueries(["productCategories"]);
    queryClient.invalidateQueries(["productCategories-list"]);
    queryClient.invalidateQueries(["categorySearch"]);
  };

  const createMutation = useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => {
      invalidateAll();
      toast.success("Category created successfully!");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProductCategory(id, data),
    onSuccess: () => {
      invalidateAll();
      toast.success("Category updated successfully!");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      invalidateAll();
      toast.success("Category deleted successfully!");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete category");
    },
  });

  const toggleExpand = (id) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const expanded = {};
    categoryTree.forEach((cat) => {
      expanded[cat.id] = true;
    });
    setExpandedCategories(expanded);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  const openCreateParent = () => {
    setEditCategory(null);
    setFormData({ name: "", description: "", parent_category_id: "" });
    setDialogOpen(true);
  };

  const openCreateSub = (parentId) => {
    setEditCategory(null);
    setFormData({ name: "", description: "", parent_category_id: parentId });
    setDialogOpen(true);
  };

  const openEdit = (category) => {
    setEditCategory(category);
    setFormData({
      name: category.name || "",
      description: category.description || "",
      parent_category_id: category.parent_category_id || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditCategory(null);
    setFormData({ name: "", description: "", parent_category_id: "" });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      parent_category_id: formData.parent_category_id || null,
    };

    if (editCategory) {
      updateMutation.mutate({ id: editCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
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

  // Find parent name for a subcategory
  const getParentName = (parentId) => {
    const parent = allCategories.find((c) => c.id === parentId);
    return parent?.name || "Unknown";
  };

  // Render a single subcategory row
  const CategoryRow = ({ category }) => (
    <div className="flex items-center justify-between p-3 ml-8 border-l-2 border-gray-200 pl-4 rounded-r-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <Tag className="h-4 w-4 text-blue-400" />
        <div>
          <span className="font-medium text-sm">{category.name}</span>
          {category.description && (
            <p className="text-xs text-gray-500 mt-0.5">
              {category.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={category.is_active ? "default" : "secondary"}
          className="text-xs"
        >
          {category.is_active ? "Active" : "Inactive"}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(category)}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
    </div>
  );

  // Render search results (flat list with parent info)
  const renderSearchResults = () => {
    const results = searchData?.items || [];
    if (results.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No categories match "{searchQuery}"
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="p-2">
          {results.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="font-medium text-sm">{cat.name}</span>
                  {cat.parent_category_id && (
                    <span className="text-xs text-gray-400 ml-2">
                      under {getParentName(cat.parent_category_id)}
                    </span>
                  )}
                  {cat.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={cat.parent_category_id ? "outline" : "default"}
                  className="text-xs"
                >
                  {cat.parent_category_id ? "Subcategory" : "Category"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(cat)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  // Render the category tree
  const renderTree = () => {
    if (categoryTree.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No categories yet. Create your first category!
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {categoryTree.map((parent) => {
          const isExpanded = expandedCategories[parent.id];
          const subCount = parent.subcategories?.length || 0;

          return (
            <Card key={parent.id} className="overflow-hidden">
              <div className="p-2">
                {/* Parent category header */}
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(parent.id)}
                      className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                    >
                      {subCount > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )
                      ) : (
                        <div className="w-5" />
                      )}
                    </button>
                    <FolderTree className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-semibold text-sm">
                        {parent.name}
                      </span>
                      {parent.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {parent.description}
                        </p>
                      )}
                    </div>
                    {subCount > 0 && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {subCount} sub
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={parent.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {parent.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreateSub(parent.id)}
                      title="Add subcategory"
                    >
                      <Plus className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(parent)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(parent)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Subcategories */}
                {isExpanded && subCount > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {parent.subcategories.map((sub) => (
                      <CategoryRow key={sub.id} category={sub} />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
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
              <h1 className="text-xl font-semibold tracking-tight">
                Product Categories
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage categories and subcategories
              </p>
            </div>
          </div>
          <Button onClick={openCreateParent}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">{totalCategories}</p>
                <p className="text-xs text-gray-500">Total Categories</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">{totalParents}</p>
                <p className="text-xs text-gray-500">Parent Categories</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <ChevronRight className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">{totalSubs}</p>
                <p className="text-xs text-gray-500">Subcategories</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          {!searchQuery && categoryTree.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading && !categoryTree.length && !searchData ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : searchQuery ? (
          renderSearchResults()
        ) : (
          renderTree()
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editCategory ? "Edit Category" : "New Category"}
              </DialogTitle>
              <DialogDescription>
                {editCategory
                  ? "Update category information"
                  : formData.parent_category_id
                    ? `Add a subcategory under "${getParentName(formData.parent_category_id)}"`
                    : "Add a new top-level product category"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Camera"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Category description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Parent Category</Label>
                <Select
                  value={formData.parent_category_id || "_none_"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      parent_category_id: value === "_none_" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">
                      None (Top-level category)
                    </SelectItem>
                    {parentCategories
                      .filter((c) => c.id !== editCategory?.id)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Leave as "None" for a top-level category, or select a parent
                  to make this a subcategory.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editCategory
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the category{" "}
                <strong>"{categoryToDelete?.name}"</strong>.
                {!categoryToDelete?.parent_category_id && (
                  <span className="block mt-2 text-amber-600">
                    Note: Subcategories under this category will become
                    orphaned.
                  </span>
                )}
                <span className="block mt-1">
                  Products using this category will not be affected.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Categories;
