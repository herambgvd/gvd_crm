import React from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Settings,
  Tag,
  FolderTree,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";

const InventoryConfig = () => {
  const navigate = useNavigate();

  const configItems = [
    {
      title: "Categories",
      description: "Manage product categories and subcategories",
      icon: FolderTree,
      href: "/inventory/config/categories",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Movement Categories",
      description: "Configure stock movement types (Demo, POC, Faulty, etc.)",
      icon: ArrowRightLeft,
      href: "/inventory/config/movement-categories",
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Inventory Configuration
          </h1>
          <p className="text-gray-600">
            Manage inventory settings, categories, and configurations
          </p>
        </div>

        {/* Config Items Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configItems.map((item) => (
            <Card
              key={item.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(item.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-1">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default InventoryConfig;
