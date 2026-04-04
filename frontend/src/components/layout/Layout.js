import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  Building2,
  Settings,
  UserCog,
  Layout as LayoutIcon,
  Headphones,
  CheckSquare,
  ClipboardList,
  Warehouse,
  TrendingUp,
  ArrowRightLeft,
  ShoppingCart,
  Truck,
  FileText,
  BarChart3,
  GitBranch,
  Bell,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../lib/notificationsApi";

const Layout = ({ children, sidebarCollapsed: defaultCollapsed = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultCollapsed);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const [supportMenuOpen, setSupportMenuOpen] = useState(false);
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);
  const [inventoryConfigMenuOpen, setInventoryConfigMenuOpen] = useState(false);
  const [materialFlowMenuOpen, setMaterialFlowMenuOpen] = useState(false);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const [notifs, count] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (_) {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      await loadNotifications();
    }
    if (notif.link) navigate(notif.link);
    setNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };
  // ───────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const isActive = (path) => {
    // Exact match
    if (location.pathname === path) return true;

    // For base paths like /stock-management, /settings, etc., only match exact
    // to avoid highlighting when on child routes like /stock-management/factory-orders
    const basePathsExactOnly = ["/inventory", "/settings", "/stock-management"];
    if (basePathsExactOnly.includes(path)) {
      return false;
    }

    // For all other paths, allow prefix matching for sub-routes
    return location.pathname.startsWith(path + "/");
  };

  // Sales Department Menu Items
  const salesMenuItems = [
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Customers", href: "/customers", icon: Building2 },
    { name: "Entities", href: "/entities", icon: Building2 },
  ];

  // Support Menu Items
  const supportMenuItems = [
    { name: "Tickets", href: "/support/tickets", icon: Headphones },
  ];

  // Inventory Menu Items - Reorganized with Material Flow submenu
  const inventoryMenuItems = [
    { name: "Analysis", href: "/stock-management", icon: BarChart3 },
    { name: "Products", href: "/products", icon: Package },
  ];

  // Material Flow Submenu Items
  const materialFlowMenuItems = [
    {
      name: "Factory Orders",
      href: "/stock-management/factory-orders",
      icon: ShoppingCart,
    },
    { name: "In-Transit", href: "/stock-management/in-transit", icon: Truck },
    {
      name: "Movements",
      href: "/stock-management/movements",
      icon: ArrowRightLeft,
    },
    {
      name: "Forecasts",
      href: "/stock-management/demand-forecasts",
      icon: TrendingUp,
    },
    {
      name: "RMA",
      href: "/stock-management/rma",
      icon: GitBranch,
    },
  ];

  // Inventory Config Submenu Items
  const inventoryConfigMenuItems = [
    {
      name: "Categories",
      href: "/inventory/config/categories",
      icon: FileText,
    },
    {
      name: "Warehouses",
      href: "/inventory/config/warehouses",
      icon: Warehouse,
    },
  ];

  const settingsMenuItems = [
    { name: "Users", href: "/settings/users", icon: Users },
    { name: "Roles", href: "/settings/roles", icon: UserCog },
    { name: "Teams", href: "/settings/teams", icon: Users },
    { name: "Templates", href: "/settings/templates", icon: LayoutIcon },
    { name: "Workflows", href: "/settings/workflows", icon: GitBranch },
    { name: "Config", href: "/settings/config", icon: Settings },
  ];

  // Check if any items in each section are active
  const isSalesActive = salesMenuItems.some((item) => isActive(item.href));
  const isSupportActive = supportMenuItems.some((item) => isActive(item.href));
  const isInventoryActive = inventoryMenuItems.some((item) =>
    isActive(item.href),
  );
  const isMaterialFlowActive = materialFlowMenuItems.some((item) =>
    isActive(item.href),
  );
  const isInventoryConfigActive = inventoryConfigMenuItems.some((item) =>
    isActive(item.href),
  );
  const isSettingsActive = settingsMenuItems.some((item) =>
    isActive(item.href),
  );

  // Auto-open dropdowns based on current page
  useEffect(() => {
    if (isSalesActive) {
      setSalesMenuOpen(true);
    }
    if (isSupportActive) {
      setSupportMenuOpen(true);
    }
    if (isInventoryActive || isMaterialFlowActive || isInventoryConfigActive) {
      setInventoryMenuOpen(true);
    }
    if (isMaterialFlowActive) {
      setMaterialFlowMenuOpen(true);
    }
    if (isInventoryConfigActive) {
      setInventoryConfigMenuOpen(true);
    }
    if (isSettingsActive) {
      setSettingsMenuOpen(true);
    }
  }, [
    isSalesActive,
    isSupportActive,
    isInventoryActive,
    isMaterialFlowActive,
    isInventoryConfigActive,
    isSettingsActive,
  ]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Sidebar for desktop */}
      <aside
        className={`hidden md:fixed md:inset-y-0 md:flex md:flex-col ${
          sidebarCollapsed ? "md:w-16" : "md:w-64"
        }`}
      >
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-200 justify-between">
            {!sidebarCollapsed && (
              <h1 className="text-2xl font-bold font-heading tracking-tight">
                Flowops
              </h1>
            )}
            {sidebarCollapsed && (
              <h1 className="text-2xl font-bold font-heading tracking-tight mx-auto">
                F
              </h1>
            )}
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="p-2"
                title="Collapse sidebar"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            {sidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="p-2 absolute top-2 right-1"
                title="Expand sidebar"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
            <nav className="flex-1 px-3 space-y-1">
              {/* Dashboard - Single Item */}
              <Link
                to="/dashboard"
                className={`${
                  isActive("/dashboard")
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100"
                } group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors`}
                data-testid="nav-dashboard"
              >
                <LayoutDashboard
                  className={`${
                    isActive("/dashboard")
                      ? "text-primary-foreground"
                      : "text-gray-500"
                  } ${
                    sidebarCollapsed ? "mx-auto" : "mr-3"
                  } flex-shrink-0 h-5 w-5`}
                  aria-hidden="true"
                />
                {!sidebarCollapsed && "Dashboard"}
              </Link>

              {/* Sales Section */}
              <div className="mt-2">
                <button
                  onClick={() => setSalesMenuOpen(!salesMenuOpen)}
                  className={`${
                    isSalesActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors`}
                  data-testid="nav-sales"
                >
                  <div className="flex items-center">
                    <TrendingUp
                      className={`${
                        isSalesActive
                          ? "text-primary-foreground"
                          : "text-gray-500"
                      } ${
                        sidebarCollapsed ? "mx-auto" : "mr-3"
                      } flex-shrink-0 h-5 w-5`}
                    />
                    {!sidebarCollapsed && <span>Sales</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      {salesMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>

                {salesMenuOpen && !sidebarCollapsed && (
                  <div className="mt-1 ml-4 space-y-1">
                    {salesMenuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-gray-700 hover:bg-gray-100"
                          } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                          data-testid={`nav-${item.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <Icon
                            className={`${
                              active
                                ? "text-primary-foreground"
                                : "text-gray-500"
                            } mr-3 flex-shrink-0 h-4 w-4`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Support Section */}
              <div className="mt-2">
                <button
                  onClick={() => setSupportMenuOpen(!supportMenuOpen)}
                  className={`${
                    isSupportActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors`}
                  data-testid="nav-support"
                >
                  <div className="flex items-center">
                    <Headphones
                      className={`${
                        isSupportActive
                          ? "text-primary-foreground"
                          : "text-gray-500"
                      } ${
                        sidebarCollapsed ? "mx-auto" : "mr-3"
                      } flex-shrink-0 h-5 w-5`}
                    />
                    {!sidebarCollapsed && <span>Support</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      {supportMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>

                {supportMenuOpen && !sidebarCollapsed && (
                  <div className="mt-1 ml-4 space-y-1">
                    {supportMenuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-gray-700 hover:bg-gray-100"
                          } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                          data-testid={`nav-${item.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <Icon
                            className={`${
                              active
                                ? "text-primary-foreground"
                                : "text-gray-500"
                            } mr-3 flex-shrink-0 h-4 w-4`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inventory Section */}
              <div className="mt-2">
                <button
                  onClick={() => setInventoryMenuOpen(!inventoryMenuOpen)}
                  className={`${
                    isInventoryActive ||
                    isMaterialFlowActive ||
                    isInventoryConfigActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors`}
                  data-testid="nav-inventory"
                >
                  <div className="flex items-center">
                    <Warehouse
                      className={`${
                        isInventoryActive ||
                        isMaterialFlowActive ||
                        isInventoryConfigActive
                          ? "text-primary-foreground"
                          : "text-gray-500"
                      } ${
                        sidebarCollapsed ? "mx-auto" : "mr-3"
                      } flex-shrink-0 h-5 w-5`}
                    />
                    {!sidebarCollapsed && <span>Inventory</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      {inventoryMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>

                {inventoryMenuOpen && !sidebarCollapsed && (
                  <div className="mt-1 ml-4 space-y-1">
                    {inventoryMenuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-gray-700 hover:bg-gray-100"
                          } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                          data-testid={`nav-${item.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <Icon
                            className={`${
                              active
                                ? "text-primary-foreground"
                                : "text-gray-500"
                            } mr-3 flex-shrink-0 h-4 w-4`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      );
                    })}

                    {/* Material Flow Submenu */}
                    <div className="mt-1">
                      <button
                        onClick={() =>
                          setMaterialFlowMenuOpen(!materialFlowMenuOpen)
                        }
                        className={`${
                          isMaterialFlowActive
                            ? "bg-primary text-primary-foreground"
                            : "text-gray-700 hover:bg-gray-100"
                        } w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                      >
                        <div className="flex items-center">
                          <GitBranch
                            className={`${
                              isMaterialFlowActive
                                ? "text-primary-foreground"
                                : "text-gray-500"
                            } mr-3 flex-shrink-0 h-4 w-4`}
                            aria-hidden="true"
                          />
                          Material Flow
                        </div>
                        {materialFlowMenuOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>

                      {materialFlowMenuOpen && (
                        <div className="mt-1 ml-4 space-y-1">
                          {materialFlowMenuItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                className={`${
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-gray-700 hover:bg-gray-100"
                                } group flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors`}
                              >
                                <Icon
                                  className={`${
                                    active
                                      ? "text-primary-foreground"
                                      : "text-gray-500"
                                  } mr-2 flex-shrink-0 h-3 w-3`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Config Submenu */}
                    <div className="mt-1">
                      <button
                        onClick={() =>
                          setInventoryConfigMenuOpen(!inventoryConfigMenuOpen)
                        }
                        className={`${
                          isInventoryConfigActive
                            ? "bg-primary text-primary-foreground"
                            : "text-gray-700 hover:bg-gray-100"
                        } w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                      >
                        <div className="flex items-center">
                          <Settings
                            className={`${
                              isInventoryConfigActive
                                ? "text-primary-foreground"
                                : "text-gray-500"
                            } mr-3 flex-shrink-0 h-4 w-4`}
                            aria-hidden="true"
                          />
                          Config
                        </div>
                        {inventoryConfigMenuOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>

                      {inventoryConfigMenuOpen && (
                        <div className="mt-1 ml-4 space-y-1">
                          {inventoryConfigMenuItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                className={`${
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-gray-700 hover:bg-gray-100"
                                } group flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors`}
                              >
                                <Icon
                                  className={`${
                                    active
                                      ? "text-primary-foreground"
                                      : "text-gray-500"
                                  } mr-2 flex-shrink-0 h-3 w-3`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Menu */}
              <div className="mt-2">
                <button
                  onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                  className={`${
                    isSettingsActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors`}
                  data-testid="nav-settings"
                >
                  <div className="flex items-center">
                    <Settings
                      className={`${
                        isSettingsActive
                          ? "text-primary-foreground"
                          : "text-gray-500"
                      } ${
                        sidebarCollapsed ? "mx-auto" : "mr-3"
                      } flex-shrink-0 h-5 w-5`}
                    />
                    {!sidebarCollapsed && <span>Settings</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      {settingsMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>

                {settingsMenuOpen && !sidebarCollapsed && (
                  <div className="mt-1 ml-4 space-y-1">
                    {settingsMenuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-gray-700 hover:bg-gray-100"
                          } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                          data-testid={`nav-${item.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <Icon
                            className={`${
                              active
                                ? "text-primary-foreground"
                                : "text-gray-500"
                            } mr-3 flex-shrink-0 h-4 w-4`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* User Profile and Logout */}
            <div className="flex-shrink-0 px-3 py-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.full_name?.charAt(0) || "U"}
                    </span>
                  </div>
                </div>
                {!sidebarCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="ml-auto"
                  data-testid="logout-button"
                >
                  <LogOut
                    className={`${
                      sidebarCollapsed ? "mx-auto" : "mr-2"
                    } h-4 w-4`}
                  />
                  {!sidebarCollapsed && "Logout"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold font-heading tracking-tight">
                  Flowops
                </h1>
              </div>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <nav className="px-3 space-y-1">
                  {/* Dashboard - Mobile */}
                  <Link
                    to="/dashboard"
                    className={`${
                      isActive("/dashboard")
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-700 hover:bg-gray-100"
                    } group flex items-center px-3 py-2.5 text-sm font-medium rounded-md`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <LayoutDashboard
                      className={`${
                        isActive("/dashboard")
                          ? "text-primary-foreground"
                          : "text-gray-500"
                      } mr-3 flex-shrink-0 h-5 w-5`}
                      aria-hidden="true"
                    />
                    Dashboard
                  </Link>

                  {/* Sales Section - Mobile */}
                  <div className="mt-2">
                    <button
                      onClick={() => setSalesMenuOpen(!salesMenuOpen)}
                      className={`${
                        isSalesActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
                      } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md`}
                    >
                      <div className="flex items-center">
                        <TrendingUp
                          className={`${
                            isSalesActive
                              ? "text-primary-foreground"
                              : "text-gray-500"
                          } mr-3 flex-shrink-0 h-5 w-5`}
                        />
                        <span>Sales</span>
                      </div>
                      {salesMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {salesMenuOpen && (
                      <div className="mt-1 ml-4 space-y-1">
                        {salesMenuItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={`${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-gray-700 hover:bg-gray-100"
                              } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <Icon
                                className={`${
                                  active
                                    ? "text-primary-foreground"
                                    : "text-gray-500"
                                } mr-3 flex-shrink-0 h-4 w-4`}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Support Section - Mobile */}
                  <div className="mt-2">
                    <button
                      onClick={() => setSupportMenuOpen(!supportMenuOpen)}
                      className={`${
                        isSupportActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
                      } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md`}
                    >
                      <div className="flex items-center">
                        <Headphones
                          className={`${
                            isSupportActive
                              ? "text-primary-foreground"
                              : "text-gray-500"
                          } mr-3 flex-shrink-0 h-5 w-5`}
                        />
                        <span>Support</span>
                      </div>
                      {supportMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {supportMenuOpen && (
                      <div className="mt-1 ml-4 space-y-1">
                        {supportMenuItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={`${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-gray-700 hover:bg-gray-100"
                              } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <Icon
                                className={`${
                                  active
                                    ? "text-primary-foreground"
                                    : "text-gray-500"
                                } mr-3 flex-shrink-0 h-4 w-4`}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inventory Section - Mobile */}
                  <div className="mt-2">
                    <button
                      onClick={() => setInventoryMenuOpen(!inventoryMenuOpen)}
                      className={`${
                        isInventoryActive ||
                        isMaterialFlowActive ||
                        isInventoryConfigActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
                      } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md`}
                    >
                      <div className="flex items-center">
                        <Warehouse
                          className={`${
                            isInventoryActive ||
                            isMaterialFlowActive ||
                            isInventoryConfigActive
                              ? "text-primary-foreground"
                              : "text-gray-500"
                          } mr-3 flex-shrink-0 h-5 w-5`}
                        />
                        <span>Inventory</span>
                      </div>
                      {inventoryMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {inventoryMenuOpen && (
                      <div className="mt-1 ml-4 space-y-1">
                        {inventoryMenuItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={`${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-gray-700 hover:bg-gray-100"
                              } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <Icon
                                className={`${
                                  active
                                    ? "text-primary-foreground"
                                    : "text-gray-500"
                                } mr-3 flex-shrink-0 h-4 w-4`}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          );
                        })}

                        {/* Material Flow Submenu - Mobile */}
                        <div className="mt-1">
                          <button
                            onClick={() =>
                              setMaterialFlowMenuOpen(!materialFlowMenuOpen)
                            }
                            className={`${
                              isMaterialFlowActive
                                ? "bg-primary text-primary-foreground"
                                : "text-gray-700 hover:bg-gray-100"
                            } w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md`}
                          >
                            <div className="flex items-center">
                              <GitBranch
                                className={`${
                                  isMaterialFlowActive
                                    ? "text-primary-foreground"
                                    : "text-gray-500"
                                } mr-3 flex-shrink-0 h-4 w-4`}
                                aria-hidden="true"
                              />
                              Material Flow
                            </div>
                            {materialFlowMenuOpen ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>

                          {materialFlowMenuOpen && (
                            <div className="mt-1 ml-4 space-y-1">
                              {materialFlowMenuItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                  <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${
                                      active
                                        ? "bg-primary text-primary-foreground"
                                        : "text-gray-700 hover:bg-gray-100"
                                    } group flex items-center px-3 py-2 text-xs font-medium rounded-md`}
                                    onClick={() => setSidebarOpen(false)}
                                  >
                                    <Icon
                                      className={`${
                                        active
                                          ? "text-primary-foreground"
                                          : "text-gray-500"
                                      } mr-2 flex-shrink-0 h-3 w-3`}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Config Submenu - Mobile */}
                        <div className="mt-1">
                          <button
                            onClick={() =>
                              setInventoryConfigMenuOpen(
                                !inventoryConfigMenuOpen,
                              )
                            }
                            className={`${
                              isInventoryConfigActive
                                ? "bg-primary text-primary-foreground"
                                : "text-gray-700 hover:bg-gray-100"
                            } w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md`}
                          >
                            <div className="flex items-center">
                              <Settings
                                className={`${
                                  isInventoryConfigActive
                                    ? "text-primary-foreground"
                                    : "text-gray-500"
                                } mr-3 flex-shrink-0 h-4 w-4`}
                                aria-hidden="true"
                              />
                              Config
                            </div>
                            {inventoryConfigMenuOpen ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>

                          {inventoryConfigMenuOpen && (
                            <div className="mt-1 ml-4 space-y-1">
                              {inventoryConfigMenuItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                  <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${
                                      active
                                        ? "bg-primary text-primary-foreground"
                                        : "text-gray-700 hover:bg-gray-100"
                                    } group flex items-center px-3 py-2 text-xs font-medium rounded-md`}
                                    onClick={() => setSidebarOpen(false)}
                                  >
                                    <Icon
                                      className={`${
                                        active
                                          ? "text-primary-foreground"
                                          : "text-gray-500"
                                      } mr-2 flex-shrink-0 h-3 w-3`}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settings Menu - Mobile */}
                  <div className="mt-2">
                    <button
                      onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                      className={`${
                        isSettingsActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
                      } w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md`}
                    >
                      <div className="flex items-center">
                        <Settings
                          className={`${
                            isSettingsActive
                              ? "text-primary-foreground"
                              : "text-gray-500"
                          } mr-3 flex-shrink-0 h-5 w-5`}
                        />
                        <span>Settings</span>
                      </div>
                      {settingsMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {settingsMenuOpen && (
                      <div className="mt-1 ml-4 space-y-1">
                        {settingsMenuItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={`${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-gray-700 hover:bg-gray-100"
                              } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <Icon
                                className={`${
                                  active
                                    ? "text-primary-foreground"
                                    : "text-gray-500"
                                } mr-3 flex-shrink-0 h-4 w-4`}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </nav>

                {/* Mobile User Profile */}
                <div className="mt-6 px-3 py-4 border-t border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">
                          {user?.full_name?.charAt(0) || "U"}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.full_name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="ml-auto"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className={sidebarCollapsed ? "md:pl-16" : "md:pl-64"}>
        {/* Top bar — hamburger (mobile) + notification bell (all) */}
        <div className="sticky top-0 z-20 flex items-center justify-between md:justify-end pl-1 pt-1 pr-4 sm:pl-3 sm:pt-3 pb-1 bg-[#FAFAFA] border-b border-gray-100">
          <button
            type="button"
            className="md:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-sm text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          !n.is_read ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.is_read && (
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <div className={!n.is_read ? "" : "ml-4"}>
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="px-4 sm:px-6 md:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
