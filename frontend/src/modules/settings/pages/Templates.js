import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchTemplates, deleteTemplate } from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
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
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Image,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import TemplateViewer from "../../../components/TemplateViewer";

const Templates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewerTemplate, setViewerTemplate] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const itemsPerPage = 9;

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTemplates(),
  });

  // Filter and search logic
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description &&
          template.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));
      const matchesType =
        selectedType === "all" || template.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [templates, searchTerm, selectedType]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTemplates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTemplates, currentPage]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType]);

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries(["templates"]);
      toast.success("Template deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete template");
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
              Template Management
            </h1>
            <p className="text-gray-600">
              Manage document templates for BOQs, invoices, and reports
            </p>
          </div>
          <Button onClick={() => navigate("/settings/templates/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="boq">BOQ</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="sales_order">Sales Order</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="warranty">Warranty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              <div className="flex items-center text-sm text-gray-500 min-w-fit">
                {filteredTemplates.length} template
                {filteredTemplates.length !== 1 ? "s" : ""} found
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {paginatedTemplates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  {templates?.length === 0
                    ? "No templates"
                    : "No templates match your filters"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {templates?.length === 0
                    ? "Get started by creating a new document template."
                    : "Try adjusting your search or filter criteria."}
                </p>
                {templates?.length === 0 && (
                  <div className="mt-6">
                    <Button onClick={() => navigate("/settings/templates/new")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Template
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-lg font-semibold">
                            {template.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {template.type ? template.type.replace("_", " ") : "Unknown"}
                          </Badge>
                          {template.is_default && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Default
                            </Badge>
                          )}
                          <Badge
                            variant={
                              template.is_active ? "default" : "secondary"
                            }
                            className={`text-xs ${
                              template.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                          >
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Description */}
                    {template.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {/* Header & Footer Images */}
                    <div className="space-y-2">
                      {template.header_image_url && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Image className="h-4 w-4" />
                            <span>Header image attached</span>
                          </div>
                          <img
                            src={`http://localhost:8000${template.header_image_url}`}
                            alt="Header preview"
                            className="w-full h-16 object-cover rounded border"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      {template.footer_image_url && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Image className="h-4 w-4" />
                            <span>Footer image attached</span>
                          </div>
                          <img
                            src={`http://localhost:8000${template.footer_image_url}`}
                            alt="Footer preview"
                            className="w-full h-16 object-cover rounded border"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Company Details */}
                    {template.company_name && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {template.company_name}
                        </p>
                        {template.company_address && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {template.company_address}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Contact Info */}
                    {(template.company_phone || template.company_email) && (
                      <div className="space-y-1">
                        {template.company_phone && (
                          <p className="text-xs text-gray-600">
                            📞 {template.company_phone}
                          </p>
                        )}
                        {template.company_email && (
                          <p className="text-xs text-gray-600">
                            ✉️ {template.company_email}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Terms & Conditions */}
                    {template.terms_and_conditions && (
                      <div className="text-xs text-gray-500">
                        <p className="font-medium">Terms & Conditions:</p>
                        <p className="line-clamp-2">
                          {template.terms_and_conditions}
                        </p>
                      </div>
                    )}

                    {/* Created Date */}
                    <div className="text-xs text-gray-500">
                      Created:{" "}
                      {format(new Date(template.created_at), "MMM dd, yyyy")}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setViewerTemplate(template);
                          setIsViewerOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          navigate(`/settings/templates/edit/${template.id}`)
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
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the template "
                              {template.name}"? This action cannot be undone and
                              will affect any documents using this template.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(template.id)}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrentPage = pageNum === currentPage;

                    // Show first page, last page, current page, and pages adjacent to current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={isCurrentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return (
                        <span key={pageNum} className="px-2">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Template Types Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Template Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <strong>BOQ Template:</strong> Used for Bill of Quantities
                documents with product listings and calculations
              </div>
              <div>
                <strong>Invoice Template:</strong> Used for generating
                professional invoices with company branding
              </div>
              <div>
                <strong>Report Template:</strong> Used for various business
                reports with consistent formatting
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Viewer */}
      <TemplateViewer
        template={viewerTemplate}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onEdit={(templateId) =>
          navigate(`/settings/templates/edit/${templateId}`)
        }
      />
    </Layout>
  );
};

export default Templates;
