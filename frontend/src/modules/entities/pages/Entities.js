import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchEntities, deleteEntity } from "../api";
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
    const variants = {
      consultant: "bg-blue-50 text-blue-700 ring-blue-600/20",
      dealer: "bg-green-50 text-green-700 ring-green-600/20",
      si: "bg-purple-50 text-purple-700 ring-purple-600/20",
      distributor: "bg-orange-50 text-orange-700 ring-orange-600/20",
    };
    const labels = {
      consultant: "Consultant",
      dealer: "Dealer",
      si: "System Integrator",
      distributor: "Distributor",
    };
    return (
      <Badge className={`${variants[type]} ring-1 ring-inset`}>
        {labels[type]}
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
      <div className="space-y-6" data-testid="entities-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Entity Master
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage consultants, dealers, system integrators, and distributors
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import
            </Button>
            <Button
              onClick={() => navigate("/entities/new")}
              data-testid="create-entity-btn"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Entity
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by company name, contact person, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={entityTypeFilter}
                  onValueChange={setEntityTypeFilter}
                >
                  <SelectTrigger>
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
              </div>
              <div className="w-full md:w-32">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 / page</SelectItem>
                    <SelectItem value="24">24 / page</SelectItem>
                    <SelectItem value="48">48 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Showing{" "}
              {entities.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
              entities
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEntities.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  {totalCount === 0
                    ? "No entities found. Create your first entity!"
                    : "No entities match your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedEntities.map((entity) => (
              <Card
                key={entity.id}
                className="border border-gray-200 hover:shadow-md transition-all"
                data-testid="entity-card"
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <h3 className="font-semibold text-lg font-heading">
                            {entity.company_name}
                          </h3>
                        </div>
                        {getEntityTypeBadge(entity.entity_type)}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/entities/${entity.id}`)}
                          data-testid="view-entity-btn"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/entities/edit/${entity.id}`)
                          }
                          data-testid="edit-entity-btn"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entity)}
                          data-testid="delete-entity-btn"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-medium">Contact:</span>
                        <span>{entity.contact_person}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono text-xs">
                          {entity.phone}
                        </span>
                      </div>
                      {entity.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="font-mono text-xs">
                            {entity.email}
                          </span>
                        </div>
                      )}
                      {entity.city && entity.state && (
                        <div className="text-gray-600">
                          <span>
                            {entity.city}, {entity.state}
                          </span>
                        </div>
                      )}
                      {entity.gstin && (
                        <div className="text-gray-600">
                          <span className="font-medium">GSTIN:</span>{" "}
                          <span className="font-mono text-xs">
                            {entity.gstin}
                          </span>
                        </div>
                      )}
                    </div>
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

      </div>

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="entity"
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ["entities"] })}
      />
    </Layout>
  );
};

export default Entities;
