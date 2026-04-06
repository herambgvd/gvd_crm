import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchEntities, deleteEntity, bulkDeleteEntities } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Building,
  Phone,
  Mail,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ImportWizard } from "../../import-wizard";

const Entities = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [importOpen, setImportOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [entityToView, setEntityToView] = useState(null);

  // Filter and pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const entityTypes = [
    { value: "consultant", label: "Consultant" },
    { value: "dealer", label: "Dealer" },
    { value: "si", label: "System Integrator" },
    { value: "distributor", label: "Distributor" },
  ];

  // Build query params for server-side pagination
  const queryParams = {
    page: currentPage,
    page_size: pageSize,
    ...(entityTypeFilter !== "all" && { entity_type: entityTypeFilter }),
    ...(searchQuery && { search: searchQuery }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["entities", queryParams],
    queryFn: () => fetchEntities(queryParams),
    keepPreviousData: true,
  });

  const entities = data?.items || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.total_pages || 1;
  const paginatedEntities = entities;

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entityTypeFilter]);

  const deleteMutation = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => {
      queryClient.invalidateQueries(["entities"]);
      toast.success("Entity deleted successfully!");
      setDeleteDialogOpen(false);
      setEntityToDelete(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete entity");
      setDeleteDialogOpen(false);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteEntities(Array.from(ids)),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["entities"]);
      toast.success(`${data.deleted} entities deleted`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete entities");
      setBulkDeleteOpen(false);
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((e) => e.id)));
    }
  };

  const handleView = (entity) => {
    setEntityToView(entity);
    setViewDialogOpen(true);
  };

  const handleDelete = (entity) => {
    setEntityToDelete(entity);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entityToDelete) {
      deleteMutation.mutate(entityToDelete.id);
    }
  };

  const getEntityTypeBadge = (type) => {
    const normalized = (type || "").toLowerCase();
    const variants = {
      consultant: "bg-blue-50 text-blue-700 ring-blue-600/20",
      dealer: "bg-green-50 text-green-700 ring-green-600/20",
      si: "bg-purple-50 text-purple-700 ring-purple-600/20",
      distributor: "bg-orange-50 text-orange-700 ring-orange-600/20",
      end_customer: "bg-teal-50 text-teal-700 ring-teal-600/20",
    };
    const labels = {
      consultant: "Consultant",
      dealer: "Dealer",
      si: "System Integrator",
      distributor: "Distributor",
      end_customer: "End Customer",
    };
    return (
      <Badge className={`${variants[normalized] || "bg-gray-50 text-gray-700 ring-gray-600/20"} ring-1 ring-inset`}>
        {labels[normalized] || type}
      </Badge>
    );
  };

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
      <div className="space-y-4" data-testid="entities-page">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Entity Master
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage consultants, dealers, system integrators, and
                distributors
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/entities/new")}
                data-testid="create-entity-btn"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Entity
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search by company name, contact person, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select
                value={entityTypeFilter}
                onValueChange={setEntityTypeFilter}
              >
                <SelectTrigger className="h-8 text-xs w-full md:w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 text-xs w-full md:w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 / page</SelectItem>
                  <SelectItem value="24">24 / page</SelectItem>
                  <SelectItem value="48">48 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {entities.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </span>
          </div>
        </div>

        {/* Selection bar */}
        {entities.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedIds.size > 0 && selectedIds.size === entities.length
                }
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Select all"}
              </span>
            </label>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete {selectedIds.size}
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {paginatedEntities.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              {totalCount === 0
                ? "No entities found. Create your first entity!"
                : "No entities match your filters."}
            </div>
          ) : (
            paginatedEntities.map((entity) => (
              <Card
                key={entity.id}
                className="group border-border/60 hover:shadow-sm transition-all"
                data-testid="entity-card"
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entity.id)}
                      onChange={() => toggleSelect(entity.id)}
                      className="mt-0.5 rounded border-gray-300 h-3.5 w-3.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold truncate leading-snug">
                        {entity.company_name}
                      </h3>
                      <div className="mt-1">
                        {getEntityTypeBadge(entity.entity_type)}
                      </div>
                      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                        <p className="truncate">{entity.contact_person}</p>
                        {entity.phone && <p className="font-mono">{entity.phone}</p>}
                        {entity.email && <p className="truncate">{entity.email}</p>}
                        {entity.city && <p>{entity.city}{entity.state ? `, ${entity.state}` : ""}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-2 pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/entities/${entity.id}`)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/entities/edit/${entity.id}`)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(entity)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && totalPages > 1 && (
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Entity Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Entity Details</DialogTitle>
              <DialogDescription>
                Complete information about {entityToView?.company_name}
              </DialogDescription>
            </DialogHeader>
            {entityToView && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Entity Type</Label>
                    {getEntityTypeBadge(entityToView.entity_type)}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Company Name
                    </Label>
                    <p className="text-sm font-medium">
                      {entityToView.company_name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Contact Person
                    </Label>
                    <p className="text-sm">{entityToView.contact_person}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="text-sm font-mono">{entityToView.phone}</p>
                  </div>
                  {entityToView.email && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Email</Label>
                      <p className="text-sm font-mono">{entityToView.email}</p>
                    </div>
                  )}
                  {entityToView.gstin && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">GSTIN</Label>
                      <p className="text-sm font-mono">{entityToView.gstin}</p>
                    </div>
                  )}
                  {entityToView.city && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">City</Label>
                      <p className="text-sm">{entityToView.city}</p>
                    </div>
                  )}
                  {entityToView.state && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">State</Label>
                      <p className="text-sm">{entityToView.state}</p>
                    </div>
                  )}
                </div>
                {entityToView.address && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Address</Label>
                    <p className="text-sm text-gray-700">
                      {entityToView.address}
                    </p>
                  </div>
                )}
                {entityToView.notes && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Notes</Label>
                    <p className="text-sm text-gray-700">
                      {entityToView.notes}
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      navigate(`/entities/edit/${entityToView.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Entity
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                entity
                <strong className="block mt-2 text-foreground">
                  {entityToDelete?.company_name} ({entityToDelete?.entity_type})
                </strong>
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

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedIds.size} entities?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected entities. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                className="bg-red-600 hover:bg-red-700"
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending
                  ? "Deleting..."
                  : `Delete ${selectedIds.size}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="entity"
        onImportComplete={() =>
          queryClient.invalidateQueries({ queryKey: ["entities"] })
        }
      />
    </Layout>
  );
};

export default Entities;
