import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Layout } from "../../../components";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
} from "lucide-react";
import { fetchPayments, deletePayment } from "../api";

const Payments = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch payments
  const { data: paymentsResponse, isLoading } = useQuery({
    queryKey: ["payments", search, statusFilter, modeFilter, page],
    queryFn: () =>
      fetchPayments({
        page,
        page_size: pageSize,
        ...(search && { search }),
        ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
        ...(modeFilter && modeFilter !== "all" && { mode: modeFilter }),
      }),
  });

  // Delete payment mutation
  const deleteMutation = useMutation({
    mutationFn: (paymentId) => deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete payment");
    },
  });

  const payments = paymentsResponse?.items || [];
  const totalPages = paymentsResponse?.total_pages || 1;

  const handleDelete = (paymentId) => {
    deleteMutation.mutate(paymentId);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  const getModeBadge = (mode) => {
    const modeConfig = {
      cash: { variant: "outline", color: "text-green-600" },
      cheque: { variant: "outline", color: "text-blue-600" },
      bank_transfer: { variant: "outline", color: "text-purple-600" },
      upi: { variant: "outline", color: "text-orange-600" },
      card: { variant: "outline", color: "text-pink-600" },
    };
    const config = modeConfig[mode] || {
      variant: "outline",
      color: "text-gray-600",
    };
    const displayMode =
      mode === "bank_transfer"
        ? "Bank Transfer"
        : mode === "upi"
          ? "UPI"
          : mode?.charAt(0).toUpperCase() + mode?.slice(1);
    return (
      <Badge variant={config.variant} className={config.color}>
        {displayMode}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">
              Manage payment records and receipts
            </p>
          </div>
          <Button asChild>
            <Link to="/sales/payments/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments by PO number, amount, or notes..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={modeFilter}
                onValueChange={(value) => {
                  setModeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payments Table */}
            {isLoading ? (
              <div className="text-center py-8">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payments found</p>
                <Button asChild className="mt-4">
                  <Link to="/sales/payments/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first payment
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction Ref</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/sales/payments/${payment.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {payment.payment_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {payment.purchase_order?.po_number || "N/A"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {getModeBadge(payment.payment_mode)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {formatDate(payment.payment_date)}
                        </TableCell>
                        <TableCell>
                          {payment.transaction_reference || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/sales/payments/${payment.id}`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/sales/payments/${payment.id}/edit`)
                                }
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {payment.receipt_file && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    window.open(
                                      `${
                                        process.env.REACT_APP_BACKEND_URL ||
                                        "http://localhost:8000"
                                      }/api/payments/${payment.id}/receipt`,
                                      "_blank",
                                    );
                                  }}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Receipt
                                </DropdownMenuItem>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the payment record
                                      <strong>
                                        {" "}
                                        {payment.payment_number}
                                      </strong>{" "}
                                      and remove all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(payment.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Payment
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, paymentsResponse?.total || 0)} of{" "}
                  {paymentsResponse?.total || 0} results
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Payments;
