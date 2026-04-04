import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchFactoryOrder } from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import { formatDate, formatCurrency } from "../utils";
import {
  StateBadge,
  TransitionActions,
  TransitionTimeline,
} from "../../workflow-engine";

const FactoryOrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ["factoryOrder", id],
    queryFn: () => fetchFactoryOrder(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground">Loading order details...</div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Order not found</h2>
            <Button
              onClick={() => navigate("/stock-management/factory-orders")}
              className="mt-4"
            >
              Back to Orders
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/stock-management/factory-orders")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{order.order_number}</h1>
              <p className="text-muted-foreground">Factory Order Details</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {order.sop_id && (
              <TransitionActions
                recordType="factory_order"
                recordId={order.id}
                invalidateKeys={[["factoryOrder", id], ["factoryOrders"]]}
              />
            )}
            <Button
              onClick={() =>
                navigate(`/stock-management/factory-orders/${id}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Status and Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <StateBadge stateName={order.current_state_name} stateColor={null} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{formatDate(order.order_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Expected Delivery
                </p>
                <p className="font-medium">
                  {formatDate(order.expected_delivery_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-lg">
                  {formatCurrency(order.total_amount, order.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Factory Details */}
        <Card>
          <CardHeader>
            <CardTitle>Factory Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Factory Name</p>
                <p className="font-medium">{order.factory_name}</p>
              </div>
              {order.factory_contact?.name && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Contact Person
                  </p>
                  <p className="font-medium">{order.factory_contact.name}</p>
                </div>
              )}
              {order.factory_contact?.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.factory_contact.email}</p>
                </div>
              )}
              {order.factory_contact?.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{order.factory_contact.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items ({order.items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-right p-3">Qty Ordered</th>
                    <th className="text-right p-3">Qty Received</th>
                    <th className="text-right p-3">Unit Price</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{item.product_name || "-"}</td>
                      <td className="p-3 text-muted-foreground">
                        {item.product_sku || "-"}
                      </td>
                      <td className="p-3 text-right">
                        {item.quantity_ordered}
                      </td>
                      <td className="p-3 text-right">
                        {item.quantity_received || 0}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(item.unit_price, order.currency)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.total_price, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(order.subtotal, order.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">
                  {formatCurrency(order.tax_amount, order.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-medium">
                  {formatCurrency(order.shipping_cost, order.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(order.discount_amount, order.currency)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span>
                  {formatCurrency(order.total_amount, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="font-medium">{order.currency}</p>
              </div>
              {order.payment_terms && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{order.payment_terms}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow History</CardTitle>
          </CardHeader>
          <CardContent>
            <TransitionTimeline recordType="factory_order" recordId={id} />
          </CardContent>
        </Card>

        {/* Audit Info */}
        {(order.created_at || order.created_by_name) && (
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {order.created_at && (
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {formatDate(order.created_at)}
                    </p>
                    {order.created_by_name && (
                      <p className="text-muted-foreground text-xs">
                        by {order.created_by_name}
                      </p>
                    )}
                  </div>
                )}
                {order.updated_at && (
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {formatDate(order.updated_at)}
                    </p>
                    {order.updated_by_name && (
                      <p className="text-muted-foreground text-xs">
                        by {order.updated_by_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default FactoryOrderDetails;
