import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
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
import { Switch } from "../../../components/ui/switch";
import { Settings, Building2, Mail, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchConfig, updateConfig } from "../api";

const Config = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("platform");

  // Platform settings
  const [platformSettings, setPlatformSettings] = useState({
    platform_name: "",
    company_name: "",
    company_tagline: "",
    support_email: "",
    support_phone: "",
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "",
    smtp_use_tls: true,
    smtp_use_ssl: false,
  });

  // Fetch existing config
  const { data: configData, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  useEffect(() => {
    if (configData) {
      setPlatformSettings({
        platform_name: configData.platform_name || "",
        company_name: configData.company_name || "",
        company_tagline: configData.company_tagline || "",
        support_email: configData.support_email || "",
        support_phone: configData.support_phone || "",
      });
      setEmailSettings({
        smtp_host: configData.smtp_host || "",
        smtp_port: configData.smtp_port || "",
        smtp_username: configData.smtp_username || "",
        smtp_password: configData.smtp_password || "",
        smtp_from_email: configData.smtp_from_email || "",
        smtp_from_name: configData.smtp_from_name || "",
        smtp_use_tls: configData.smtp_use_tls ?? true,
        smtp_use_ssl: configData.smtp_use_ssl ?? false,
      });
    }
  }, [configData]);

  const updateMutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries(["config"]);
      toast.success("Configuration saved successfully!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to save configuration",
      );
    },
  });

  const handlePlatformChange = (field, value) => {
    setPlatformSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmailChange = (field, value) => {
    setEmailSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const data = {
      ...platformSettings,
      ...emailSettings,
    };
    updateMutation.mutate(data);
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              System Configuration
            </h1>
            <p className="text-gray-600">
              Configure platform settings and email configuration
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="platform" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Platform Name
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Configuration
            </TabsTrigger>
          </TabsList>

          {/* Platform Tab */}
          <TabsContent value="platform" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Platform Branding
                </CardTitle>
                <CardDescription>
                  Customize the platform name and branding to match your company
                  identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platform_name">Platform Name</Label>
                    <Input
                      id="platform_name"
                      value={platformSettings.platform_name}
                      onChange={(e) =>
                        handlePlatformChange("platform_name", e.target.value)
                      }
                      placeholder="e.g., Flowops CRM"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This name will appear in the header and login page
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={platformSettings.company_name}
                      onChange={(e) =>
                        handlePlatformChange("company_name", e.target.value)
                      }
                      placeholder="e.g., Your Company Ltd."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_tagline">Company Tagline</Label>
                  <Input
                    id="company_tagline"
                    value={platformSettings.company_tagline}
                    onChange={(e) =>
                      handlePlatformChange("company_tagline", e.target.value)
                    }
                    placeholder="e.g., Empowering your business growth"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={platformSettings.support_email}
                      onChange={(e) =>
                        handlePlatformChange("support_email", e.target.value)
                      }
                      placeholder="support@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="support_phone">Support Phone</Label>
                    <Input
                      id="support_phone"
                      value={platformSettings.support_phone}
                      onChange={(e) =>
                        handlePlatformChange("support_phone", e.target.value)
                      }
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  SMTP Configuration
                </CardTitle>
                <CardDescription>
                  Configure email settings for sending welcome emails,
                  notifications, and other system emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={emailSettings.smtp_host}
                      onChange={(e) =>
                        handleEmailChange("smtp_host", e.target.value)
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={emailSettings.smtp_port}
                      onChange={(e) =>
                        handleEmailChange("smtp_port", e.target.value)
                      }
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_username">SMTP Username</Label>
                    <Input
                      id="smtp_username"
                      value={emailSettings.smtp_username}
                      onChange={(e) =>
                        handleEmailChange("smtp_username", e.target.value)
                      }
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp_password">SMTP Password</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      value={emailSettings.smtp_password}
                      onChange={(e) =>
                        handleEmailChange("smtp_password", e.target.value)
                      }
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For Gmail, use an App Password
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_from_email">From Email</Label>
                    <Input
                      id="smtp_from_email"
                      type="email"
                      value={emailSettings.smtp_from_email}
                      onChange={(e) =>
                        handleEmailChange("smtp_from_email", e.target.value)
                      }
                      placeholder="noreply@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp_from_name">From Name</Label>
                    <Input
                      id="smtp_from_name"
                      value={emailSettings.smtp_from_name}
                      onChange={(e) =>
                        handleEmailChange("smtp_from_name", e.target.value)
                      }
                      placeholder="Flowops CRM"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-8 pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="smtp_use_tls"
                      checked={emailSettings.smtp_use_tls}
                      onCheckedChange={(checked) =>
                        handleEmailChange("smtp_use_tls", checked)
                      }
                    />
                    <Label htmlFor="smtp_use_tls">Use TLS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="smtp_use_ssl"
                      checked={emailSettings.smtp_use_ssl}
                      onCheckedChange={(checked) =>
                        handleEmailChange("smtp_use_ssl", checked)
                      }
                    />
                    <Label htmlFor="smtp_use_ssl">Use SSL</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Email */}
            <Card>
              <CardHeader>
                <CardTitle>Test Email Configuration</CardTitle>
                <CardDescription>
                  Send a test email to verify your SMTP settings are working
                  correctly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Enter test email address"
                    className="max-w-sm"
                  />
                  <Button variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Config;
