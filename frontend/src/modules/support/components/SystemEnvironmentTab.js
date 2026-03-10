import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSystemEnvironment } from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Settings, Camera, HardDrive, Network, Plus, Save } from "lucide-react";
import { toast } from "sonner";

const SystemEnvironmentTab = ({
  ticketId,
  systemEnvironment,
  ticketStatus,
}) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(!systemEnvironment);
  const [formData, setFormData] = useState({
    number_of_cameras: "",
    recording_type: "",
    storage_type: "",
    network_type: "",
    third_party_devices: [],
    onvif_profile: "",
    system_configuration: "",
    network_topology: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => createSystemEnvironment(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast.success("System environment details created successfully!");
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create system environment",
      );
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.number_of_cameras ||
      !formData.recording_type ||
      !formData.storage_type ||
      !formData.network_type
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      ...formData,
      ticket_id: ticketId,
      number_of_cameras: parseInt(formData.number_of_cameras),
      third_party_devices: formData.third_party_devices.filter(
        (device) => device.trim() !== "",
      ),
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleThirdPartyDevicesChange = (value) => {
    const devices = value.split(",").map((device) => device.trim());
    handleChange("third_party_devices", devices);
  };

  if (systemEnvironment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System & Environment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* System Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">
                    Number of Cameras
                  </Label>
                  <p className="text-lg font-semibold">
                    {systemEnvironment.number_of_cameras}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Recording Type</Label>
                <p className="text-sm">{systemEnvironment.recording_type}</p>
              </div>

              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Storage Type</Label>
                  <p className="text-sm">{systemEnvironment.storage_type}</p>
                </div>
              </div>
            </div>

            {/* Network Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Network Type</Label>
                  <p className="text-sm">{systemEnvironment.network_type}</p>
                </div>
              </div>

              {systemEnvironment.onvif_profile && (
                <div>
                  <Label className="text-sm font-medium">ONVIF Profile</Label>
                  <p className="text-sm">{systemEnvironment.onvif_profile}</p>
                </div>
              )}
            </div>

            {/* Third Party Devices */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Third Party Devices
                </Label>
                {systemEnvironment.third_party_devices &&
                systemEnvironment.third_party_devices.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {systemEnvironment.third_party_devices.map(
                      (device, index) => (
                        <div
                          key={index}
                          className="px-2 py-1 bg-muted rounded text-xs"
                        >
                          {device}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    None specified
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Configuration Details */}
          {(systemEnvironment.system_configuration ||
            systemEnvironment.network_topology) && (
            <div className="space-y-4 pt-4 border-t">
              {systemEnvironment.system_configuration && (
                <div>
                  <Label className="text-sm font-medium">
                    System Configuration
                  </Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {systemEnvironment.system_configuration}
                  </p>
                </div>
              )}

              {systemEnvironment.network_topology && (
                <div>
                  <Label className="text-sm font-medium">
                    Network Topology
                  </Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {systemEnvironment.network_topology}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Created by {systemEnvironment.created_by} on{" "}
            {new Date(systemEnvironment.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            No System Environment Details
          </h3>
          <p className="text-muted-foreground mb-4">
            Add system environment details to document the technical setup and
            configuration.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add System Details
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Add System & Environment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="number_of_cameras">Number of Cameras *</Label>
              <Input
                id="number_of_cameras"
                type="number"
                min="1"
                value={formData.number_of_cameras}
                onChange={(e) =>
                  handleChange("number_of_cameras", e.target.value)
                }
                placeholder="Enter number of cameras"
                required
              />
            </div>

            <div>
              <Label htmlFor="recording_type">Recording Type *</Label>
              <Select
                value={formData.recording_type}
                onValueChange={(value) => handleChange("recording_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recording type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Continuous">Continuous</SelectItem>
                  <SelectItem value="Event">Event Based</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storage_type">Storage Type *</Label>
              <Select
                value={formData.storage_type}
                onValueChange={(value) => handleChange("storage_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select storage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal HDD">Internal HDD</SelectItem>
                  <SelectItem value="RAID">RAID</SelectItem>
                  <SelectItem value="NAS">NAS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="network_type">Network Type *</Label>
              <Select
                value={formData.network_type}
                onValueChange={(value) => handleChange("network_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAN">LAN</SelectItem>
                  <SelectItem value="WAN">WAN</SelectItem>
                  <SelectItem value="VPN">VPN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="third_party_devices">Third Party Devices</Label>
              <Input
                id="third_party_devices"
                value={formData.third_party_devices.join(", ")}
                onChange={(e) => handleThirdPartyDevicesChange(e.target.value)}
                placeholder="e.g., Gates, Boom Barriers, VMS (comma-separated)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple devices with commas
              </p>
            </div>

            <div>
              <Label htmlFor="onvif_profile">ONVIF Profile</Label>
              <Input
                id="onvif_profile"
                value={formData.onvif_profile}
                onChange={(e) => handleChange("onvif_profile", e.target.value)}
                placeholder="e.g., S, G, T"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="system_configuration">System Configuration</Label>
            <Textarea
              id="system_configuration"
              value={formData.system_configuration}
              onChange={(e) =>
                handleChange("system_configuration", e.target.value)
              }
              placeholder="Describe the overall system configuration..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="network_topology">Network Topology</Label>
            <Textarea
              id="network_topology"
              value={formData.network_topology}
              onChange={(e) => handleChange("network_topology", e.target.value)}
              placeholder="Describe the network setup and topology..."
              rows={3}
            />
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save System Details
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SystemEnvironmentTab;
