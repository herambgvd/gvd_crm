import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import {
  Upload,
  Link,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  fetchImportableEntities,
  previewFile,
  executeImport,
  previewGoogleSheet,
  executeGoogleSheetImport,
} from "./api";

const STEPS = ["Source", "Preview", "Map Columns", "Result"];

const normalize = (s) => (s || "").toLowerCase().replace(/[\s_\-]/g, "");

const autoMatch = (sheetHeaders, systemFields) => {
  const mapping = {};
  sheetHeaders.forEach((header) => {
    const nh = normalize(header);
    const match = systemFields.find((f) => {
      const nl = normalize(f.label);
      const nk = normalize(f.key);
      return nh === nl || nh === nk || nl.includes(nh) || nh.includes(nl);
    });
    mapping[header] = match ? match.key : "__skip__";
  });
  return mapping;
};

export default function ImportWizard({ open, onClose, entityType, onImportComplete }) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState("file"); // "file" | "google"
  const [file, setFile] = useState(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(entityType || "");
  const [previewData, setPreviewData] = useState(null); // { headers, rows, system_fields }
  const [columnMapping, setColumnMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: entities } = useQuery({
    queryKey: ["importable-entities"],
    queryFn: fetchImportableEntities,
    enabled: open,
  });

  useEffect(() => {
    if (entityType) setSelectedEntity(entityType);
  }, [entityType]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(0);
      setFile(null);
      setGoogleUrl("");
      setPreviewData(null);
      setColumnMapping({});
      setResult(null);
      setLoading(false);
    }
  }, [open]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f) setFile(f);
  }, []);

  const handlePreview = async () => {
    if (!selectedEntity) return toast.error("Select an entity type");
    setLoading(true);
    try {
      const data =
        source === "file" ? await previewFile(file) : await previewGoogleSheet(googleUrl);
      setPreviewData(data);
      setColumnMapping(autoMatch(data.headers, data.system_fields || []));
      setStep(1);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to preview data");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const mapping = Object.fromEntries(
        Object.entries(columnMapping).filter(([, v]) => v !== "__skip__")
      );
      const data =
        source === "file"
          ? await executeImport(file, selectedEntity, mapping)
          : await executeGoogleSheetImport(googleUrl, selectedEntity, mapping);
      setResult(data);
      setStep(3);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onImportComplete?.();
    onClose();
  };

  const canProceedStep0 =
    selectedEntity && (source === "file" ? !!file : !!googleUrl.trim());

  const systemFields = previewData?.system_fields || [];
  const unmappedRequired = useMemo(() => {
    const mappedKeys = new Set(Object.values(columnMapping));
    return systemFields
      .filter((f) => f.required && !mappedKeys.has(f.key))
      .map((f) => f.label);
  }, [columnMapping, systemFields]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Import Data</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className="w-8 h-px bg-gray-300" />}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">{s}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Source */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1">Entity Type</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {(entities?.entities || []).map((e) => (
                    <SelectItem key={e.key} value={e.key}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={source === "file" ? "default" : "outline"}
                onClick={() => setSource("file")}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> File Upload
              </Button>
              <Button
                size="sm"
                variant={source === "google" ? "default" : "outline"}
                onClick={() => setSource("google")}
              >
                <Link className="w-3.5 h-3.5 mr-1.5" /> Google Sheets
              </Button>
            </div>

            {source === "file" ? (
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("import-file-input").click()}
              >
                <input
                  id="import-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileDrop}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span>{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Drop a CSV or Excel file here, or click to browse
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="text-xs mb-1">Google Sheets URL</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 1 && previewData && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Showing first {previewData.rows.length} rows. Verify the data looks correct.
            </p>
            <div className="border rounded max-h-48 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {previewData.headers.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {previewData.headers.map((h) => (
                        <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[200px] truncate">
                          {row[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && previewData && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Map each sheet column to a system field, or skip it.
            </p>
            {unmappedRequired.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Required fields not mapped: {unmappedRequired.join(", ")}
              </div>
            )}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {previewData.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-1/3 truncate" title={header}>
                    {header}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Select
                    value={columnMapping[header] || "__skip__"}
                    onValueChange={(val) =>
                      setColumnMapping((prev) => ({ ...prev, [header]: val }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">-- Skip --</SelectItem>
                      {systemFields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                          {f.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Import Complete</p>
              <div className="flex justify-center gap-4 mt-3 text-xs">
                <div>
                  <span className="font-semibold text-green-700">{result.imported ?? 0}</span>{" "}
                  imported
                </div>
                <div>
                  <span className="font-semibold text-amber-600">{result.skipped ?? 0}</span>{" "}
                  skipped
                </div>
              </div>
            </div>
            {result.warnings?.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step > 0 && step < 3 && (
            <Button size="sm" variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          )}
          {step === 0 && (
            <Button size="sm" disabled={!canProceedStep0 || loading} onClick={handlePreview}>
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Preview <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {step === 1 && (
            <Button size="sm" onClick={() => setStep(2)}>
              Map Columns <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" disabled={loading} onClick={handleExecute}>
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Import
            </Button>
          )}
          {step === 3 && (
            <Button size="sm" onClick={handleDone}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
