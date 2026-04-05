import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./App.css";

// Auth context
import { AuthProvider, useAuth } from "./context/AuthContext";
import NotFound from "./components/common/NotFound";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Module imports — each module barrel exports its pages
import { Login } from "./modules/auth";
import { Dashboard } from "./modules/dashboard";
import { Leads, LeadForm, LeadDetail } from "./modules/leads";
import { Entities, EntityForm, EntityDetail } from "./modules/entities";
import { Customers, CustomerForm } from "./modules/customers";
import {
  Products,
  ProductForm,
  Inventory,
  Categories,
  InventoryConfig,
  MovementCategories,
  Movements,
  MovementForm,
  MovementDetail,
} from "./modules/products";
import { BOQs, BOQForm, BOQViewer } from "./modules/boqs";
import { SalesOrders, SalesOrderForm } from "./modules/sales-orders";
import { PurchaseOrders, PurchaseOrderForm } from "./modules/purchase-orders";
import { Invoices, InvoiceForm } from "./modules/invoices";
import { Payments, PaymentForm } from "./modules/payments";
import { Warranties, WarrantyForm } from "./modules/warranties";
import { SupportTickets, TicketForm, TicketDetail } from "./modules/support";
import { Documents, DocumentForm } from "./modules/documents";
import {
  Users,
  UserForm,
  Roles,
  RoleForm,
  Teams,
  TeamForm,
  Templates,
  TemplateForm,
  Config,
} from "./modules/settings";
import {
  InventoryDashboard,
  FactoryOrders,
  FactoryOrderForm,
  FactoryOrderDetails,
  InTransit,
  InTransitForm,
  WarehouseStock,
  StockMovements,
  DemandForecasts,
  DemandForecastForm,
  RMARecords,
  RMAForm,
} from "./modules/inventory";
import { Warehouses } from "./modules/warehouse";
import { SOPList, SOPBuilder } from "./modules/workflow-engine";

// ─── Query Client ──────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  },
});

// ─── Route Guards ──────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : children;
}

// ─── Helper to wrap protected routes ───────────
const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

// ─── App ───────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            {/* Auth */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <P>
                  <Dashboard />
                </P>
              }
            />

            {/* Leads */}
            <Route
              path="/leads"
              element={
                <P>
                  <Leads />
                </P>
              }
            />
            <Route
              path="/leads/new"
              element={
                <P>
                  <LeadForm />
                </P>
              }
            />
            <Route
              path="/leads/edit/:id"
              element={
                <P>
                  <LeadForm />
                </P>
              }
            />
            <Route
              path="/leads/:id"
              element={
                <P>
                  <LeadDetail />
                </P>
              }
            />

            {/* Entities */}
            <Route path="/entities" element={<P><Entities /></P>} />
            <Route path="/entities/new" element={<P><EntityForm /></P>} />
            <Route path="/entities/edit/:id" element={<P><EntityForm /></P>} />
            <Route path="/entities/:id" element={<P><EntityDetail /></P>} />

            {/* Customers */}
            <Route path="/customers" element={<P><Customers /></P>} />
            <Route path="/customers/new" element={<P><CustomerForm /></P>} />
            <Route path="/customers/edit/:id" element={<P><CustomerForm /></P>} />

            {/* Products */}
            <Route
              path="/products"
              element={
                <P>
                  <Products />
                </P>
              }
            />
            <Route
              path="/products/new"
              element={
                <P>
                  <ProductForm />
                </P>
              }
            />
            <Route
              path="/products/edit/:id"
              element={
                <P>
                  <ProductForm />
                </P>
              }
            />
            <Route
              path="/inventory"
              element={
                <P>
                  <Inventory />
                </P>
              }
            />
            <Route
              path="/inventory/config"
              element={
                <P>
                  <InventoryConfig />
                </P>
              }
            />
            <Route
              path="/inventory/config/categories"
              element={
                <P>
                  <Categories />
                </P>
              }
            />
            <Route
              path="/inventory/config/warehouses"
              element={
                <P>
                  <Warehouses />
                </P>
              }
            />
            <Route
              path="/inventory/config/movement-categories"
              element={
                <P>
                  <MovementCategories />
                </P>
              }
            />
            <Route
              path="/inventory/movements"
              element={
                <P>
                  <Movements />
                </P>
              }
            />
            <Route
              path="/inventory/movements/new"
              element={
                <P>
                  <MovementForm />
                </P>
              }
            />
            <Route
              path="/inventory/movements/:id"
              element={
                <P>
                  <MovementDetail />
                </P>
              }
            />
            <Route
              path="/inventory/movements/edit/:id"
              element={
                <P>
                  <MovementForm />
                </P>
              }
            />

            {/* BOQs */}
            <Route
              path="/boqs"
              element={
                <P>
                  <BOQs />
                </P>
              }
            />
            <Route
              path="/boqs/new"
              element={
                <P>
                  <BOQForm />
                </P>
              }
            />
            <Route
              path="/boqs/edit/:id"
              element={
                <P>
                  <BOQForm />
                </P>
              }
            />
            <Route
              path="/boqs/view/:id"
              element={
                <P>
                  <BOQViewer />
                </P>
              }
            />

            {/* Sales Orders */}
            <Route
              path="/sales-orders"
              element={
                <P>
                  <SalesOrders />
                </P>
              }
            />
            <Route
              path="/sales-orders/new"
              element={
                <P>
                  <SalesOrderForm />
                </P>
              }
            />
            <Route
              path="/sales-orders/:id"
              element={
                <P>
                  <SalesOrderForm />
                </P>
              }
            />

            {/* Purchase Orders */}
            <Route
              path="/purchase-orders"
              element={
                <P>
                  <PurchaseOrders />
                </P>
              }
            />
            <Route
              path="/purchase-orders/new"
              element={
                <P>
                  <PurchaseOrderForm />
                </P>
              }
            />
            <Route
              path="/purchase-orders/:id/edit"
              element={
                <P>
                  <PurchaseOrderForm />
                </P>
              }
            />
            <Route
              path="/purchase-orders/:id"
              element={
                <P>
                  <PurchaseOrderForm />
                </P>
              }
            />

            {/* Invoices */}
            <Route
              path="/invoices"
              element={
                <P>
                  <Invoices />
                </P>
              }
            />
            <Route
              path="/invoices/new"
              element={
                <P>
                  <InvoiceForm />
                </P>
              }
            />

            {/* Payments */}
            <Route
              path="/payments"
              element={
                <P>
                  <Payments />
                </P>
              }
            />
            <Route
              path="/payments/new"
              element={
                <P>
                  <PaymentForm />
                </P>
              }
            />
            <Route
              path="/payments/:id/edit"
              element={
                <P>
                  <PaymentForm />
                </P>
              }
            />

            {/* Warranties */}
            <Route
              path="/warranties"
              element={
                <P>
                  <Warranties />
                </P>
              }
            />
            <Route
              path="/warranties/new"
              element={
                <P>
                  <WarrantyForm />
                </P>
              }
            />

            {/* Documents */}
            <Route
              path="/documents"
              element={
                <P>
                  <Documents />
                </P>
              }
            />
            <Route
              path="/documents/upload"
              element={
                <P>
                  <DocumentForm />
                </P>
              }
            />

            {/* Support */}
            <Route
              path="/support/tickets"
              element={
                <P>
                  <SupportTickets />
                </P>
              }
            />
            <Route
              path="/support/tickets/new"
              element={
                <P>
                  <TicketForm />
                </P>
              }
            />
            <Route
              path="/support/tickets/:id"
              element={
                <P>
                  <TicketDetail />
                </P>
              }
            />
            <Route
              path="/support/tickets/:id/edit"
              element={
                <P>
                  <TicketForm />
                </P>
              }
            />

            {/* Settings */}
            <Route
              path="/settings/users"
              element={
                <P>
                  <Users />
                </P>
              }
            />
            <Route
              path="/settings/users/new"
              element={
                <P>
                  <UserForm />
                </P>
              }
            />
            <Route
              path="/settings/users/edit/:id"
              element={
                <P>
                  <UserForm />
                </P>
              }
            />
            <Route
              path="/settings/roles"
              element={
                <P>
                  <Roles />
                </P>
              }
            />
            <Route
              path="/settings/roles/new"
              element={
                <P>
                  <RoleForm />
                </P>
              }
            />
            <Route
              path="/settings/roles/edit/:id"
              element={
                <P>
                  <RoleForm />
                </P>
              }
            />
            <Route
              path="/settings/teams"
              element={
                <P>
                  <Teams />
                </P>
              }
            />
            <Route
              path="/settings/teams/new"
              element={
                <P>
                  <TeamForm />
                </P>
              }
            />
            <Route
              path="/settings/teams/edit/:id"
              element={
                <P>
                  <TeamForm />
                </P>
              }
            />
            <Route
              path="/settings/templates"
              element={
                <P>
                  <Templates />
                </P>
              }
            />
            <Route
              path="/settings/templates/new"
              element={
                <P>
                  <TemplateForm />
                </P>
              }
            />
            <Route
              path="/settings/templates/edit/:id"
              element={
                <P>
                  <TemplateForm />
                </P>
              }
            />
            <Route
              path="/settings/config"
              element={
                <P>
                  <Config />
                </P>
              }
            />

            {/* Workflow Engine (SOP Builder) */}
            <Route
              path="/settings/workflows"
              element={
                <P>
                  <SOPList />
                </P>
              }
            />
            <Route
              path="/settings/workflows/new"
              element={
                <P>
                  <SOPBuilder />
                </P>
              }
            />
            <Route
              path="/settings/workflows/:id/edit"
              element={
                <P>
                  <SOPBuilder />
                </P>
              }
            />

            {/* Inventory Management (New Module) */}
            <Route
              path="/stock-management"
              element={
                <P>
                  <InventoryDashboard />
                </P>
              }
            />
            <Route
              path="/stock-management/factory-orders"
              element={
                <P>
                  <FactoryOrders />
                </P>
              }
            />
            <Route
              path="/stock-management/factory-orders/new"
              element={
                <P>
                  <FactoryOrderForm />
                </P>
              }
            />
            <Route
              path="/stock-management/factory-orders/:id"
              element={
                <P>
                  <FactoryOrderDetails />
                </P>
              }
            />
            <Route
              path="/stock-management/factory-orders/:id/edit"
              element={
                <P>
                  <FactoryOrderForm />
                </P>
              }
            />
            <Route
              path="/stock-management/in-transit"
              element={
                <P>
                  <InTransit />
                </P>
              }
            />
            <Route
              path="/stock-management/in-transit/new"
              element={
                <P>
                  <InTransitForm />
                </P>
              }
            />
            <Route
              path="/stock-management/in-transit/:id"
              element={
                <P>
                  <InTransitForm />
                </P>
              }
            />
            <Route
              path="/stock-management/in-transit/:id/edit"
              element={
                <P>
                  <InTransitForm />
                </P>
              }
            />
            {/* Warehouse redirects to Products (merged) */}
            <Route
              path="/stock-management/warehouse"
              element={<Navigate to="/products" replace />}
            />
            <Route
              path="/stock-management/movements"
              element={
                <P>
                  <StockMovements />
                </P>
              }
            />
            <Route
              path="/stock-management/demand-forecasts"
              element={
                <P>
                  <DemandForecasts />
                </P>
              }
            />
            <Route
              path="/stock-management/demand-forecasts/new"
              element={
                <P>
                  <DemandForecastForm />
                </P>
              }
            />
            <Route
              path="/stock-management/demand-forecasts/:id"
              element={
                <P>
                  <DemandForecastForm />
                </P>
              }
            />
            <Route
              path="/stock-management/demand-forecasts/:id/edit"
              element={
                <P>
                  <DemandForecastForm />
                </P>
              }
            />
            {/* RMA Records */}
            <Route
              path="/stock-management/rma"
              element={
                <P>
                  <RMARecords />
                </P>
              }
            />
            <Route
              path="/stock-management/rma/new"
              element={
                <P>
                  <RMAForm />
                </P>
              }
            />
            <Route
              path="/stock-management/rma/:id"
              element={
                <P>
                  <RMAForm />
                </P>
              }
            />
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
