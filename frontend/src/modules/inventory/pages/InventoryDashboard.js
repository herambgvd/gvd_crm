import React, { useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchInventorySummary } from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Package,
  Truck,
  Warehouse,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";

// Shared module imports
import { QUERY_KEYS, STALE_TIME } from "../constants";
import { StatCard } from "../components";

// Memoized QuickAction component
const QuickAction = memo(
  ({ title, description, icon: Icon, to, color = "primary", onNavigate }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
      onClick={() => onNavigate(to)}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  ),
);

QuickAction.displayName = "QuickAction";

const InventoryDashboard = () => {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [QUERY_KEYS.inventorySummary],
    queryFn: fetchInventorySummary,
    staleTime: STALE_TIME.summary,
  });

  // Memoized navigation callbacks
  const handleNavigate = useCallback((path) => navigate(path), [navigate]);
  const handleNewForecast = useCallback(
    () => navigate("/stock-management/demand-forecasts/new"),
    [navigate],
  );
  const handleNewFactoryOrder = useCallback(
    () => navigate("/stock-management/factory-orders/new"),
    [navigate],
  );
  const handleWarehouse = useCallback(
    () => navigate("/stock-management/warehouse"),
    [navigate],
  );
  const handleFactoryOrders = useCallback(
    () => navigate("/stock-management/factory-orders"),
    [navigate],
  );
  const handleInTransit = useCallback(
    () => navigate("/stock-management/in-transit"),
    [navigate],
  );
  const handleLowStock = useCallback(
    () => navigate("/stock-management/warehouse?low_stock=true"),
    [navigate],
  );
  const handleOutOfStock = useCallback(
    () => navigate("/stock-management/warehouse?out_of_stock=true"),
    [navigate],
  );
  const handleRMA = useCallback(
    () => navigate("/stock-management/rma"),
    [navigate],
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">
              Track stock across all stages - from factory orders to customer
              delivery
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleNewForecast}>
              <TrendingUp className="h-4 w-4 mr-2" />
              New Forecast
            </Button>
            <Button onClick={handleNewFactoryOrder}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              New Factory Order
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={summaryLoading ? "..." : summary?.total_products || 0}
            icon={Package}
            description="Active products in inventory"
            color="blue"
            onClick={handleWarehouse}
            loading={summaryLoading}
          />
          <StatCard
            title="Sales Stock"
            value={summaryLoading ? "..." : summary?.total_sales_quantity || 0}
            icon={CheckCircle}
            description="Available for sale"
            color="green"
            onClick={handleWarehouse}
            loading={summaryLoading}
          />
          <StatCard
            title="Demo Stock"
            value={summaryLoading ? "..." : summary?.total_demo_quantity || 0}
            icon={ClipboardList}
            description="Reserved for demos"
            color="purple"
            onClick={handleWarehouse}
            loading={summaryLoading}
          />
          <StatCard
            title="RMA Stock"
            value={summaryLoading ? "..." : summary?.total_rma_quantity || 0}
            icon={RotateCcw}
            description="Under repair/return"
            color="orange"
            onClick={handleRMA}
            loading={summaryLoading}
          />
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Ordered (Pipeline)"
            value={
              summaryLoading ? "..." : summary?.total_ordered_quantity || 0
            }
            icon={ShoppingCart}
            description="Factory orders placed"
            color="indigo"
            onClick={handleFactoryOrders}
            loading={summaryLoading}
          />
          <StatCard
            title="In-Transit"
            value={
              summaryLoading ? "..." : summary?.total_in_transit_quantity || 0
            }
            icon={Truck}
            description="Shipments on the way"
            color="cyan"
            onClick={handleInTransit}
            loading={summaryLoading}
          />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {summaryLoading ? "..." : summary?.low_stock_count || 0}
              </div>
              <p className="text-sm text-yellow-600">
                Products below minimum level
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleLowStock}
              >
                View Low Stock Items
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {summaryLoading ? "..." : summary?.out_of_stock_count || 0}
              </div>
              <p className="text-sm text-red-600">Products with zero stock</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleOutOfStock}
              >
                View Out of Stock
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction
              title="Factory Orders"
              description="Manage orders to manufacturers"
              icon={ShoppingCart}
              to="/stock-management/factory-orders"
              color="blue"
              onNavigate={handleNavigate}
            />
            <QuickAction
              title="In-Transit"
              description="Track shipments from factory"
              icon={Truck}
              to="/stock-management/in-transit"
              color="cyan"
              onNavigate={handleNavigate}
            />
            <QuickAction
              title="Warehouse Stock"
              description="View all stock levels"
              icon={Warehouse}
              to="/stock-management/warehouse"
              color="green"
              onNavigate={handleNavigate}
            />
            <QuickAction
              title="Stock Movements"
              description="Audit trail of all changes"
              icon={ClipboardList}
              to="/stock-management/movements"
              color="purple"
              onNavigate={handleNavigate}
            />
            <QuickAction
              title="RMA"
              description="Returns and repairs"
              icon={RotateCcw}
              to="/stock-management/rma"
              color="orange"
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        {/* Workflow Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              <div className="flex items-center gap-2 min-w-max">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-xs mt-1 text-center">
                    Factory
                    <br />
                    Order
                  </span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-cyan-600" />
                  </div>
                  <span className="text-xs mt-1 text-center">
                    In
                    <br />
                    Transit
                  </span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                    <Warehouse className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-xs mt-1 text-center">
                    Main
                    <br />
                    Stock
                  </span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-xs mt-1 text-center">
                    Sales
                    <br />
                    Stock
                  </span>
                </div>
                <div className="w-4 h-0.5 bg-gray-300"></div>
                <span className="text-gray-400">|</span>
                <div className="w-4 h-0.5 bg-gray-300"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-xs mt-1 text-center">
                    Demo
                    <br />
                    Stock
                  </span>
                </div>
                <div className="w-4 h-0.5 bg-gray-300"></div>
                <span className="text-gray-400">|</span>
                <div className="w-4 h-0.5 bg-gray-300"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <RotateCcw className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className="text-xs mt-1 text-center">
                    RMA
                    <br />
                    Stock
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InventoryDashboard;
