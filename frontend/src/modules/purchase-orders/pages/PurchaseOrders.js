import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
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
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { fetchPurchaseOrders, deletePurchaseOrder } from "../api";

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPOToDelete] = useState(null);
  const itemsPerPage = 10;

  const {
    data: purchaseOrdersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchaseOrders", searchTerm, currentPage],
    queryFn: () =>
      fetchPurchaseOrders({
        page: currentPage,
        page_size: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
      }),
  });
  const purchaseOrders = purchaseOrdersData?.items || [];
  const totalPages = purchaseOrdersData?.total_pages || 1;
  const totalCount = purchaseOrdersData?.total || 0;

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase Order deleted successfully");
      setDeleteDialogOpen(false);
      setPOToDelete(null);
    },
    onError: (error) => {
      toast.error(`Error deleting purchase order: ${error.message}`);
    },
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      sent: { color: "bg-blue-100 text-blue-800", label: "Sent" },
      approved: { color: "bg-green-100 text-green-800", label: "Approved" },
      received: { color: "bg-purple-100 text-purple-800", label: "Received" },
      completed: {
        color: "bg-emerald-100 text-emerald-800",
        label: "Completed",
      },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>;
  };

  const confirmDelete = () => {
    if (poToDelete) {
      deleteMutation.mutate(poToDelete.id);
    }
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

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">
            Error loading purchase orders:{" "}
            {typeof error?.message === "string"
              ? error.message
              : "An error occurred"}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Purchase Orders</h1>
          <Button onClick={() => navigate("/purchase-orders/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by PO number, vendor, or status..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {totalCount} purchase order
            {totalCount !== 1 ? "s" : ""} found
          </div>
        </div>

        {/* Purchase Orders Grid */}
        {purchaseOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Purchase Orders Found
              </h3>
              <p className="text-gray-500 text-center mb-4">
                {searchTerm
                  ? "No purchase orders match your search criteria."
                  : "Get started by creating your first purchase order."}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate("/purchase-orders/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First PO
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {po.po_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Vendor: {po.vendor_name || "Not specified"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(po.status)}
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          ₹{po.total_amount?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created:{" "}
                          {new Date(po.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {po.delivery_date && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Delivery Date:</span>{" "}
                        {po.delivery_date}
                      </p>
                    </div>
                  )}

                  {po.notes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {po.notes.length > 100
                          ? `${po.notes.substring(0, 100)}...`
                          : po.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      {po.document_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(po.document_url, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Document
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/purchase-orders/edit/${po.id}`)
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
                            onClick={() => setPOToDelete(po)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Purchase Order
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this purchase
                              order? This action cannot be undone.
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                <strong>
                                  {po.po_number} - ₹
                                  {po.total_amount?.toLocaleString()}
                                </strong>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={confirmDelete}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending
                                ? "Deleting..."
                                : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PurchaseOrders;
