import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layout } from "../../../components";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
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
import { CalendarIcon, Upload, X, FileText, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../../lib/utils";
import {
  fetchPayment,
  createPayment as createPaymentApi,
  updatePayment as updatePaymentApi,
} from "../api";
import { fetchPurchaseOrders } from "../../purchase-orders/api";

const PaymentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    purchase_order_id: "",
    amount: "",
    payment_mode: "",
    payment_date: new Date(),
    transaction_reference: "",
    notes: "",
    status: "pending",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch purchase orders for selection
  const { data: purchaseOrdersResponse } = useQuery({
    queryKey: ["purchase-orders-all"],
    queryFn: () => fetchPurchaseOrders({ page_size: 500 }),
  });

  // Fetch existing payment data for editing
  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => fetchPayment(id),
    enabled: isEditing,
  });

  // Create payment mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const formDataObj = new FormData();

      // Add payment data
      Object.keys(data).forEach((key) => {
        if (data[key] !== null && data[key] !== "") {
          if (key === "payment_date") {
            formDataObj.append(key, data[key].toISOString());
          } else {
            formDataObj.append(key, data[key]);
          }
        }
      });

      // Add receipt file if present
      if (receiptFile) {
        formDataObj.append("receipt_file", receiptFile);
      }

      return await createPaymentApi(formDataObj);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment created successfully");
      navigate("/sales/payments");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create payment");
    },
  });

  // Update payment mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const formDataObj = new FormData();

      // Add payment data
      Object.keys(data).forEach((key) => {
        if (data[key] !== null && data[key] !== "") {
          if (key === "payment_date") {
            formDataObj.append(key, data[key].toISOString());
          } else {
            formDataObj.append(key, data[key]);
          }
        }
      });

      // Add receipt file if present
      if (receiptFile) {
        formDataObj.append("receipt_file", receiptFile);
      }

      return await updatePaymentApi(id, formDataObj);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment", id] });
      toast.success("Payment updated successfully");
      navigate("/sales/payments");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update payment");
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditing && payment) {
      setFormData({
        purchase_order_id: payment.purchase_order_id || "",
        amount: payment.amount.toString(),
        payment_mode: payment.payment_mode || "",
        payment_date: new Date(payment.payment_date),
        transaction_reference: payment.transaction_reference || "",
        notes: payment.notes || "",
        status: payment.status || "pending",
      });

      // Set receipt preview if exists
      if (payment.receipt_file) {
        setReceiptPreview(payment.receipt_file);
      }
    }
  }, [isEditing, payment]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed",
        );
        return;
      }

      setReceiptFile(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setReceiptPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview("pdf");
      }
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (!formData.purchase_order_id) {
      toast.error("Please select a purchase order");
      setIsSubmitting(false);
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      setIsSubmitting(false);
      return;
    }

    if (!formData.payment_mode) {
      toast.error("Please select a payment mode");
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "outline", color: "text-yellow-600" },
      completed: { variant: "secondary", color: "text-green-600" },
      failed: { variant: "destructive", color: "text-red-600" },
    };
    const config = statusConfig[status] || {
      variant: "outline",
      color: "text-gray-600",
    };
    return (
      <Badge variant={config.variant} className={config.color}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  if (isEditing && isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const purchaseOrders = purchaseOrdersResponse?.items || [];

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sales/payments")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? "Edit Payment" : "Create Payment"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Update payment details and receipt"
                : "Add a new payment record"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Payment Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="purchase_order_id">Purchase Order *</Label>
                    <Select
                      value={formData.purchase_order_id}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          purchase_order_id: value,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Purchase Order" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            <div className="flex flex-col">
                              <span>{po.po_number}</span>
                              <span className="text-sm text-muted-foreground">
                                {po.vendor_name} -{" "}
                                {formatCurrency(po.total_amount)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_mode">Payment Mode *</Label>
                    <Select
                      value={formData.payment_mode}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_mode: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Payment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.payment_date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.payment_date
                            ? format(formData.payment_date, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.payment_date}
                          onSelect={(date) =>
                            setFormData((prev) => ({
                              ...prev,
                              payment_date: date,
                            }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="transaction_reference">
                      Transaction Reference
                    </Label>
                    <Input
                      id="transaction_reference"
                      placeholder="Enter transaction reference/ID"
                      value={formData.transaction_reference}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          transaction_reference: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      rows={4}
                      placeholder="Add any additional notes about this payment..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Receipt Upload and Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Receipt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Upload Receipt</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="receipt-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            receipt
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, PDF up to 10MB
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* File Preview */}
                  {receiptPreview && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Receipt Preview</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeFile}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        {receiptPreview === "pdf" ? (
                          <div className="flex items-center justify-center h-32 bg-gray-50">
                            <FileText className="h-8 w-8 text-gray-400" />
                            <span className="ml-2 text-sm text-gray-600">
                              PDF File
                            </span>
                          </div>
                        ) : receiptPreview.startsWith("data:") ? (
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            className="w-full h-auto max-h-64 object-contain"
                          />
                        ) : (
                          <img
                            src={`${
                              process.env.REACT_APP_BACKEND_URL ||
                              "http://localhost:8000"
                            }/api/payments/${id}/receipt`}
                            alt="Current receipt"
                            className="w-full h-auto max-h-64 object-contain"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Summary */}
              {formData.purchase_order_id && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const selectedPO = purchaseOrders.find(
                        (po) => po.id === formData.purchase_order_id,
                      );
                      if (!selectedPO) return null;

                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>PO Number:</span>
                            <span className="font-medium">
                              {selectedPO.po_number}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vendor:</span>
                            <span className="font-medium">
                              {selectedPO.vendor_name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>PO Total:</span>
                            <span className="font-medium">
                              {formatCurrency(selectedPO.total_amount)}
                            </span>
                          </div>
                          <hr />
                          <div className="flex justify-between">
                            <span>Payment Amount:</span>
                            <span className="font-semibold text-lg">
                              {formData.amount
                                ? formatCurrency(parseFloat(formData.amount))
                                : "₹0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span>{getStatusBadge(formData.status)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/sales/payments")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Payment"
              ) : (
                "Create Payment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
export default PaymentForm;
