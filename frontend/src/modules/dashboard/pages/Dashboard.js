import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchDashboardStats } from "../api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Users,
  ShoppingCart,
  DollarSign,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
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

  const statCards = [
    {
      title: "Total Leads",
      value: stats?.total_leads || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      testId: "total-leads-card",
    },
    {
      title: "Sales Orders",
      value: stats?.total_sales_orders || 0,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-50",
      testId: "total-sales-orders-card",
    },
    {
      title: "Total Revenue",
      value: `₹${(stats?.total_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      testId: "total-revenue-card",
    },
    {
      title: "Pending Invoices",
      value: stats?.pending_invoices || 0,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      testId: "pending-invoices-card",
    },
    {
      title: "Pending Approvals",
      value: stats?.pending_approvals || 0,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      testId: "pending-approvals-card",
    },
  ];

  const channelData = stats?.channel_breakdown || {};
  const channels = [
    { name: "Consultant Sales", key: "consultant", color: "bg-blue-500" },
    { name: "Project Sales", key: "project", color: "bg-green-500" },
    { name: "B2B/OEM Sales", key: "oem", color: "bg-purple-500" },
    { name: "Distributor Sales", key: "distributor", color: "bg-orange-500" },
    { name: "Channel/Dealer Sales", key: "dealer", color: "bg-pink-500" },
  ];

  return (
    <Layout>
      <div className="space-y-8" data-testid="dashboard-page">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Overview of your sales pipeline and performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="border border-gray-200 hover:shadow-md transition-all"
                data-testid={stat.testId}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Channel Breakdown */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-heading">
              Channel Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channels.map((channel) => {
                const count = channelData[channel.key] || 0;
                const total =
                  Object.values(channelData).reduce((a, b) => a + b, 0) || 1;
                const percentage = ((count / total) * 100).toFixed(1);
                return (
                  <div key={channel.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {channel.name}
                      </span>
                      <span className="text-sm font-mono text-gray-600">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${channel.color} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-heading">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => navigate("/leads")}
                variant="outline"
                data-testid="create-lead-button"
              >
                Create Lead
              </Button>
              <Button
                onClick={() => navigate("/boqs")}
                variant="outline"
                data-testid="create-boq-button"
              >
                Create BOQ
              </Button>
              <Button
                onClick={() => navigate("/sales-orders")}
                variant="outline"
                data-testid="create-order-button"
              >
                Create Order
              </Button>
              <Button
                onClick={() => navigate("/invoices")}
                variant="outline"
                data-testid="create-invoice-button"
              >
                Create Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
