import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchDashboardStats } from "../api";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Users,
  ShoppingCart,
  IndianRupee,
  FileText,
  Ticket,
  Package,
  Factory,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  Plus,
  Building,
  Layers,
} from "lucide-react";
import BarChart from "../components/BarChart";
import DonutChart from "../components/DonutChart";

const CHART_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];
const DONUT_COLORS = ["#8B5CF6", "#F59E0B", "#EF4444", "#10B981", "#6B7280"];

const StatCard = ({ label, value, icon: Icon, color = "text-primary", href, navigate: nav }) => (
  <Card
    className={`border-border/60 ${href ? "cursor-pointer hover:shadow-sm transition-shadow" : ""}`}
    onClick={() => href && nav(href)}
  >
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold mt-0.5">{value}</p>
      </div>
      <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardContent>
  </Card>
);

const StateBreakdown = ({ data, label }) => {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">No data yet</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {entries.map(([name, count]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="text-xs w-28 truncate text-muted-foreground">{name}</span>
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
};

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "support", label: "Support" },
  { key: "inventory", label: "Inventory" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("sales");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  const sales = stats?.sales || {};
  const support = stats?.support || {};
  const inventory = stats?.inventory || {};

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Business overview across all modules</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Sales Tab ── */}
        {tab === "sales" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Leads" value={sales.total_leads || 0} icon={Users} color="text-blue-600" href="/leads" navigate={navigate} />
              <StatCard label="Pipeline Value" value={`₹${(sales.pipeline_value || 0).toLocaleString("en-IN")}`} icon={TrendingUp} color="text-green-600" />
              <StatCard label="Revenue" value={`₹${(sales.total_revenue || 0).toLocaleString("en-IN")}`} icon={IndianRupee} color="text-emerald-600" />
              <StatCard label="Sales Orders" value={sales.sales_orders || 0} icon={ShoppingCart} color="text-violet-600" href="/sales-orders" navigate={navigate} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="BOQs" value={sales.boqs || 0} icon={FileText} color="text-orange-600" href="/boqs" navigate={navigate} />
              <StatCard label="Customers" value={sales.customers || 0} icon={Users} color="text-cyan-600" href="/customers" navigate={navigate} />
              <StatCard label="Entities" value={sales.entities || 0} icon={Building} color="text-pink-600" href="/entities" navigate={navigate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Leads by State</p>
                  {Object.keys(sales.leads_by_state || {}).length > 0 ? (
                    <BarChart
                      data={Object.entries(sales.leads_by_state || {}).map(([label, value], i) => ({
                        label,
                        value,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      }))}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/leads/new")}>
                      <Plus className="h-3 w-3 mr-1" /> New Lead
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/boqs/new")}>
                      <Plus className="h-3 w-3 mr-1" /> New BOQ
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/sales-orders/new")}>
                      <Plus className="h-3 w-3 mr-1" /> New Order
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/customers/new")}>
                      <Plus className="h-3 w-3 mr-1" /> New Customer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* State distribution pills */}
            {Object.keys(sales.leads_by_state || {}).length > 0 && (
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">State Distribution</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(sales.leads_by_state || {}).map(([name, count], i) => {
                      const total = Object.values(sales.leads_by_state).reduce((s, v) => s + v, 0) || 1;
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        >
                          {name} &middot; {Math.round((count / total) * 100)}%
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Support Tab ── */}
        {tab === "support" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard label="Total Tickets" value={support.total_tickets || 0} icon={Ticket} color="text-purple-600" href="/support/tickets" navigate={navigate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Tickets by State</p>
                  {Object.keys(support.tickets_by_state || {}).length > 0 ? (
                    <DonutChart
                      data={Object.entries(support.tickets_by_state || {}).map(([label, value], i) => ({
                        label,
                        value,
                        color: DONUT_COLORS[i % DONUT_COLORS.length],
                      }))}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  )}
                  {(() => {
                    const entries = Object.entries(support.tickets_by_state || {});
                    if (entries.length === 0) return null;
                    const avg = Math.round(entries.reduce((s, [, v]) => s + v, 0) / entries.length);
                    return (
                      <p className="text-[10px] text-muted-foreground mt-3">
                        Avg. per state: <span className="font-medium">{avg}</span>
                      </p>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/support/tickets/new")}>
                      <Plus className="h-3 w-3 mr-1" /> New Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Inventory Tab ── */}
        {tab === "inventory" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Products" value={inventory.total_products || 0} icon={Package} color="text-blue-600" href="/products" navigate={navigate} />
              <StatCard label="Factory Orders" value={inventory.factory_orders || 0} icon={Factory} color="text-orange-600" href="/stock-management/factory-orders" navigate={navigate} />
              <StatCard label="RMA Records" value={inventory.rma_records || 0} icon={RotateCcw} color="text-red-600" href="/stock-management/rma" navigate={navigate} />
              <StatCard label="Low Stock Alerts" value={inventory.low_stock || 0} icon={AlertTriangle} color="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Total Stock Value</p>
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold mt-1">
                    ₹{(inventory.stock_value || 0).toLocaleString("en-IN")}
                  </p>
                  {(inventory.low_stock || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-[10px] font-medium">
                        {inventory.low_stock} item{inventory.low_stock !== 1 ? "s" : ""} below minimum stock
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Stock Distribution</p>
                  {(() => {
                    const distData = [
                      { label: "Products", value: inventory.total_products || 0, color: "#3B82F6" },
                      { label: "Factory Orders", value: inventory.factory_orders || 0, color: "#F59E0B" },
                      { label: "RMA", value: inventory.rma_records || 0, color: "#EF4444" },
                    ].filter((d) => d.value > 0);
                    return distData.length > 0 ? (
                      <BarChart data={distData} maxHeight={90} />
                    ) : (
                      <p className="text-xs text-muted-foreground">No data yet</p>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/products/new")}>
                    <Plus className="h-3 w-3 mr-1" /> New Product
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/stock-management/factory-orders/new")}>
                    <Plus className="h-3 w-3 mr-1" /> Factory Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
