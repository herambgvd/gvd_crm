import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchStockMovement,
  updateMovementShipping,
  updateMovementReceiving,
  fetchMovementComments,
  createMovementComment,
} from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  Truck,
  Package,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  User,
  MapPin,
  Hash,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MovementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [showReceivingDialog, setShowReceivingDialog] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [shippingData, setShippingData] = useState({
    ship_date: "",
    carrier: "",
    tracking_number: "",
    shipped_by: "",
  });

  const [receivingData, setReceivingData] = useState({
    received_date: "",
    received_by: "",
    condition: "good",
  });

  // Fetch movement details
  const {
    data: movement,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stockMovement", id],
    queryFn: () => fetchStockMovement(id),
  });

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ["movementComments", id],
    queryFn: () => fetchMovementComments(id),
    enabled: Boolean(id),
  });
  const comments = commentsData?.items || [];

  // Mutations
  const shippingMutation = useMutation({
    mutationFn: (data) => updateMovementShipping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["stockMovement", id]);
      toast.success("Shipping info updated!");
      setShowShippingDialog(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update shipping info",
      );
    },
  });

  const receivingMutation = useMutation({
    mutationFn: (data) => updateMovementReceiving(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["stockMovement", id]);
      toast.success("Receiving info updated!");
      setShowReceivingDialog(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update receiving info",
      );
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data) => createMovementComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["movementComments", id]);
      toast.success("Comment added!");
      setCommentText("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to add comment");
    },
  });

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...shippingData,
      ship_date: shippingData.ship_date
        ? new Date(shippingData.ship_date).toISOString()
        : null,
    };
    shippingMutation.mutate(payload);
  };

  const handleReceivingSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...receivingData,
      received_date: receivingData.received_date
        ? new Date(receivingData.received_date).toISOString()
        : null,
    };
    receivingMutation.mutate(payload);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate({ comment: commentText });
  };

  const openShippingDialog = () => {
    setShippingData({
      ship_date: movement?.ship_date
        ? new Date(movement.ship_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      carrier: movement?.carrier || "",
      tracking_number: movement?.tracking_number || "",
      shipped_by: movement?.shipped_by || "",
    });
    setShowShippingDialog(true);
  };

  const openReceivingDialog = () => {
    setReceivingData({
      received_date: movement?.received_date
        ? new Date(movement.received_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      received_by: movement?.received_by || "",
      condition: movement?.condition || "good",
    });
    setShowReceivingDialog(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      shipped: "bg-blue-100 text-blue-800",
      received: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>
        {status?.toUpperCase()}
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

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load movement details</p>
          <Button
            className="mt-4"
            onClick={() => navigate("/inventory/movements")}
          >
            Back to Movements
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/inventory/movements")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {movement?.uid || `Movement #${id?.slice(-6)}`}
                </h1>
                {getStatusBadge(movement?.status)}
              </div>
              <p className="text-gray-600">
                {movement?.category_name || "Stock Movement"} •{" "}
                {movement?.request_date
                  ? format(new Date(movement.request_date), "MMM dd, yyyy")
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/inventory/movements/edit/${id}`)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="shipping">
              <Truck className="mr-2 h-4 w-4" /> Shipping
            </TabsTrigger>
            <TabsTrigger value="receiving">
              <Package className="mr-2 h-4 w-4" /> Receiving
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="mr-2 h-4 w-4" /> Comments (
              {comments.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Movement Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Movement Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium">
                        {movement?.category_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Direction</p>
                      <Badge
                        variant={
                          movement?.direction === "in"
                            ? "success"
                            : movement?.direction === "out"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {movement?.direction?.toUpperCase() || "-"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Request Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {movement?.request_date
                          ? format(new Date(movement.request_date), "PPP")
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">UID/Reference</p>
                      <p className="font-medium flex items-center gap-1">
                        <Hash className="h-4 w-4 text-gray-400" />
                        {movement?.uid || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">From Location</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {movement?.location_from || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">To Location</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {movement?.location_to || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Product</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Product</p>
                      <p className="font-medium flex items-center gap-1">
                        <Box className="h-4 w-4 text-gray-400" />
                        {movement?.product_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium text-lg">
                        {movement?.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium">
                        {movement?.product_category_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Subcategory</p>
                      <p className="font-medium">
                        {movement?.product_subcategory_name || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entity & Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Entity & Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Connected Entity</p>
                    <p className="font-medium">
                      {movement?.entity_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Assigned Users</p>
                    {movement?.assigned_users?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {movement.assigned_users.map((user, idx) => (
                          <Badge key={idx} variant="outline">
                            <User className="mr-1 h-3 w-3" />
                            {user.name ||
                              `${user.first_name} ${user.last_name}`}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No users assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {movement?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {movement.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shipping Information</CardTitle>
                  <CardDescription>
                    Track shipping details for this movement
                  </CardDescription>
                </div>
                <Button onClick={openShippingDialog}>
                  <Truck className="mr-2 h-4 w-4" />
                  {movement?.ship_date ? "Update Shipping" : "Mark as Shipped"}
                </Button>
              </CardHeader>
              <CardContent>
                {movement?.ship_date ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Ship Date</p>
                      <p className="font-medium">
                        {format(new Date(movement.ship_date), "PPP")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Carrier</p>
                      <p className="font-medium">{movement.carrier || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tracking Number</p>
                      <p className="font-medium">
                        {movement.tracking_number || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shipped By</p>
                      <p className="font-medium">
                        {movement.shipped_by || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p>No shipping information yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receiving Tab */}
          <TabsContent value="receiving">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Receiving Information</CardTitle>
                  <CardDescription>
                    Track receiving details for this movement
                  </CardDescription>
                </div>
                <Button
                  onClick={openReceivingDialog}
                  disabled={!movement?.ship_date}
                >
                  <Package className="mr-2 h-4 w-4" />
                  {movement?.received_date
                    ? "Update Receiving"
                    : "Mark as Received"}
                </Button>
              </CardHeader>
              <CardContent>
                {movement?.received_date ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Received Date</p>
                      <p className="font-medium">
                        {format(new Date(movement.received_date), "PPP")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Received By</p>
                      <p className="font-medium">
                        {movement.received_by || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Condition</p>
                      <Badge
                        className={
                          movement.condition === "good"
                            ? "bg-green-100 text-green-800"
                            : movement.condition === "damaged"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {movement.condition?.toUpperCase() || "-"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p>
                      {movement?.ship_date
                        ? "Not received yet"
                        : "Item must be shipped first"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>
                  Communication and notes about this movement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment Form */}
                <form
                  onSubmit={handleCommentSubmit}
                  className="flex gap-2 items-start"
                >
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="submit"
                    disabled={!commentText.trim() || commentMutation.isPending}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>

                {/* Comments List */}
                <div className="space-y-4 mt-6">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                      <p>No comments yet</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                              {comment.created_by_name?.[0]?.toUpperCase() ||
                                "U"}
                            </div>
                            <span className="font-medium">
                              {comment.created_by_name || "Unknown User"}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {comment.created_at
                              ? format(
                                  new Date(comment.created_at),
                                  "MMM dd, yyyy HH:mm",
                                )
                              : ""}
                          </span>
                        </div>
                        <p className="text-gray-600 pl-10 whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Shipping Dialog */}
      <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipping Information</DialogTitle>
            <DialogDescription>
              Enter the shipping details for this movement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleShippingSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="ship_date">Ship Date</Label>
                <Input
                  id="ship_date"
                  type="date"
                  value={shippingData.ship_date}
                  onChange={(e) =>
                    setShippingData((prev) => ({
                      ...prev,
                      ship_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  value={shippingData.carrier}
                  onChange={(e) =>
                    setShippingData((prev) => ({
                      ...prev,
                      carrier: e.target.value,
                    }))
                  }
                  placeholder="e.g. FedEx, DHL, BlueDart"
                />
              </div>
              <div>
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  value={shippingData.tracking_number}
                  onChange={(e) =>
                    setShippingData((prev) => ({
                      ...prev,
                      tracking_number: e.target.value,
                    }))
                  }
                  placeholder="Enter tracking number"
                />
              </div>
              <div>
                <Label htmlFor="shipped_by">Shipped By</Label>
                <Input
                  id="shipped_by"
                  value={shippingData.shipped_by}
                  onChange={(e) =>
                    setShippingData((prev) => ({
                      ...prev,
                      shipped_by: e.target.value,
                    }))
                  }
                  placeholder="Name of person who shipped"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowShippingDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={shippingMutation.isPending}>
                {shippingMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Shipping Info
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receiving Dialog */}
      <Dialog open={showReceivingDialog} onOpenChange={setShowReceivingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Receiving Information</DialogTitle>
            <DialogDescription>
              Enter the receiving details for this movement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceivingSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="received_date">Received Date</Label>
                <Input
                  id="received_date"
                  type="date"
                  value={receivingData.received_date}
                  onChange={(e) =>
                    setReceivingData((prev) => ({
                      ...prev,
                      received_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="received_by">Received By</Label>
                <Input
                  id="received_by"
                  value={receivingData.received_by}
                  onChange={(e) =>
                    setReceivingData((prev) => ({
                      ...prev,
                      received_by: e.target.value,
                    }))
                  }
                  placeholder="Name of person who received"
                />
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={receivingData.condition}
                  onChange={(e) =>
                    setReceivingData((prev) => ({
                      ...prev,
                      condition: e.target.value,
                    }))
                  }
                >
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReceivingDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={receivingMutation.isPending}>
                {receivingMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Receiving Info
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default MovementDetail;
