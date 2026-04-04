import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  User,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "../../../lib/axios";

const BOQVersionHistory = ({ boqId, isOpen, onClose }) => {
  const [versionHistory, setVersionHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && boqId) {
      fetchVersionHistory();
    }
  }, [isOpen, boqId]);

  const fetchVersionHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/boqs/${boqId}/version-history`);
      setVersionHistory(response.data);
    } catch (error) {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getVersionBadgeColor = (fromVersion, toVersion) => {
    if (toVersion > fromVersion) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getImpactIcon = (analysis) => {
    if (analysis.toLowerCase().includes("increase")) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (analysis.toLowerCase().includes("decrease")) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Version History
            </h2>
            {versionHistory && (
              <p className="text-sm text-gray-600 mt-1">
                {versionHistory.boq_number} - {versionHistory.project_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-semibold"
          >
            ×
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading version history...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">
                {typeof error === "string"
                  ? error
                  : error?.message || "An error occurred"}
              </p>
            </div>
          )}

          {versionHistory && !loading && !error && (
            <>
              {versionHistory.version_history.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No version history available</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Version history will appear when the BOQ is updated
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {versionHistory.version_history.map((version, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`${getVersionBadgeColor(
                                version.version_from,
                                version.version_to,
                              )}`}
                            >
                              v{version.version_from} → v{version.version_to}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {version.timestamp
                              ? (() => { try { return format(new Date(version.timestamp), "PPp"); } catch { return version.timestamp; } })()
                              : "—"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            Updated by: {version.updated_by}
                          </div>
                        </div>
                        <CardTitle className="text-lg font-medium text-gray-900 mt-2">
                          {version.change_summary}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Detailed Changes */}
                          {version.detailed_changes &&
                            version.detailed_changes.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                  Specific Changes:
                                </h4>
                                <ul className="space-y-1">
                                  {version.detailed_changes.map(
                                    (change, changeIndex) => (
                                      <li
                                        key={changeIndex}
                                        className="text-sm text-gray-600 flex items-start gap-2"
                                      >
                                        <span className="text-blue-500 mt-1">
                                          •
                                        </span>
                                        <span>{change}</span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* Impact Analysis */}
                          {version.impact_analysis && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                {getImpactIcon(version.impact_analysis)}
                                <h4 className="text-sm font-medium text-gray-700">
                                  Business Impact Analysis:
                                </h4>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {version.impact_analysis}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Current Version Info */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Current Version: v{versionHistory.current_version}
                  </span>
                  <span>
                    Total Updates: {versionHistory.version_history.length}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BOQVersionHistory;
