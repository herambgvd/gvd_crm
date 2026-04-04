import React, { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Layout } from "../../../components";
import { fetchSOP, createSOP, updateSOP } from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Switch } from "../../../components/ui/switch";
import {
  Plus,
  GripVertical,
  Trash2,
  Edit,
  ArrowLeft,
  ArrowRight,
  Save,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_COLORS = [
  "#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "textarea", label: "Text Area" },
  { value: "file", label: "File" },
];

// ────────────────── Sortable State Item ──────────────────

function SortableStateItem({ state, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: state.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: state.color }}
      />

      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{state.name}</span>
        <div className="flex gap-1 mt-0.5">
          {state.is_start && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              Start
            </Badge>
          )}
          {state.is_end && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              End
            </Badge>
          )}
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={() => onEdit(state)}>
        <Edit className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(state.id)}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

// ────────────────── Main SOP Builder ──────────────────

const SOPBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [states, setStates] = useState([]);
  const [transitions, setTransitions] = useState([]);

  // Dialog states
  const [stateDialog, setStateDialog] = useState(null); // null | state obj for edit | {} for new
  const [transitionDialog, setTransitionDialog] = useState(null);

  // Load existing SOP
  const { isLoading: loadingSOP } = useQuery({
    queryKey: ["sop", id],
    queryFn: () => fetchSOP(id),
    enabled: isEdit,
    onSuccess: (data) => {
      setName(data.name);
      setDescription(data.description || "");
      setModule(data.module);
      setStates(
        (data.states || []).sort((a, b) => a.position - b.position)
      );
      setTransitions(data.transitions || []);
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        setStates((prev) => {
          const oldIndex = prev.findIndex((s) => s.id === active.id);
          const newIndex = prev.findIndex((s) => s.id === over.id);
          const newArr = arrayMove(prev, oldIndex, newIndex);
          return newArr.map((s, i) => ({ ...s, position: i }));
        });
      }
    },
    []
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? updateSOP(id, payload) : createSOP(payload),
    onSuccess: () => {
      toast.success(isEdit ? "SOP updated" : "SOP created");
      navigate("/settings/workflows");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to save SOP");
    },
  });

  const handleSave = () => {
    if (!name.trim()) return toast.error("SOP name is required");
    if (!module) return toast.error("Module is required");
    if (states.length === 0) return toast.error("Add at least one state");

    const startStates = states.filter((s) => s.is_start);
    const endStates = states.filter((s) => s.is_end);
    if (startStates.length !== 1) return toast.error("Exactly one start state required");
    if (endStates.length === 0) return toast.error("At least one end state required");

    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      module,
      states: states.map((s, i) => ({ ...s, position: i })),
      transitions,
    });
  };

  // ── State CRUD ──

  const addState = () => {
    setStateDialog({
      id: "",
      name: "",
      color: DEFAULT_COLORS[states.length % DEFAULT_COLORS.length],
      description: "",
      is_start: states.length === 0,
      is_end: false,
    });
  };

  const saveState = (stateData) => {
    if (!stateData.name.trim()) return toast.error("State name is required");

    if (stateData.id) {
      // Edit existing
      setStates((prev) =>
        prev.map((s) => (s.id === stateData.id ? { ...s, ...stateData } : s))
      );
    } else {
      // New state
      const newState = {
        ...stateData,
        id: crypto.randomUUID(),
        position: states.length,
      };
      setStates((prev) => [...prev, newState]);
    }

    // Ensure only one start state
    if (stateData.is_start) {
      setStates((prev) =>
        prev.map((s) => ({
          ...s,
          is_start: s.id === (stateData.id || prev[prev.length - 1]?.id)
            ? true
            : false,
        }))
      );
    }

    setStateDialog(null);
  };

  const deleteState = (stateId) => {
    setStates((prev) => prev.filter((s) => s.id !== stateId));
    setTransitions((prev) =>
      prev.filter(
        (t) => t.from_state_id !== stateId && t.to_state_id !== stateId
      )
    );
  };

  // ── Transition CRUD ──

  const addTransition = () => {
    setTransitionDialog({
      id: "",
      from_state_id: "",
      to_state_id: "",
      name: "",
      form_fields: [],
    });
  };

  const saveTransition = (transData) => {
    if (!transData.name.trim()) return toast.error("Transition name required");
    if (!transData.from_state_id || !transData.to_state_id)
      return toast.error("Select both from and to states");
    if (transData.from_state_id === transData.to_state_id)
      return toast.error("Cannot transition to the same state");

    if (transData.id) {
      setTransitions((prev) =>
        prev.map((t) => (t.id === transData.id ? { ...t, ...transData } : t))
      );
    } else {
      setTransitions((prev) => [
        ...prev,
        { ...transData, id: crypto.randomUUID() },
      ]);
    }
    setTransitionDialog(null);
  };

  const deleteTransition = (transId) => {
    setTransitions((prev) => prev.filter((t) => t.id !== transId));
  };

  const stateMap = Object.fromEntries(states.map((s) => [s.id, s.name]));

  if (isEdit && loadingSOP) {
    return (
      <Layout>
        <p className="text-muted-foreground">Loading SOP...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings/workflows")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit ? "Edit SOP" : "Create SOP"}
            </h1>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SOP Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Hardware Sales SOP"
                />
              </div>
              <div>
                <Label>Module *</Label>
                <Select
                  value={module}
                  onValueChange={setModule}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* States */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Pipeline States</h2>
              <Button variant="outline" size="sm" onClick={addState}>
                <Plus className="mr-1 h-3 w-3" />
                Add State
              </Button>
            </div>

            {states.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No states defined. Add states to build your pipeline.
              </p>
            ) : (
              <>
                {/* Pipeline preview */}
                <div className="flex items-center gap-1 flex-wrap p-3 bg-muted rounded-lg">
                  {states.map((state, idx) => (
                    <React.Fragment key={state.id}>
                      {idx > 0 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span
                        className="text-xs px-2 py-1 rounded text-white font-medium"
                        style={{ backgroundColor: state.color }}
                      >
                        {state.name}
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                {/* Sortable list */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={states.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {states.map((state) => (
                        <SortableStateItem
                          key={state.id}
                          state={state}
                          onEdit={(s) => setStateDialog(s)}
                          onDelete={deleteState}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transitions */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Transitions</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={addTransition}
                disabled={states.length < 2}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Transition
              </Button>
            </div>

            {transitions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transitions defined. Add transitions to connect states.
              </p>
            ) : (
              <div className="space-y-2">
                {transitions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex-1 flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {stateMap[t.from_state_id] || "?"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {stateMap[t.to_state_id] || "?"}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {t.name}
                      </Badge>
                      {t.form_fields?.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({t.form_fields.length} field
                          {t.form_fields.length > 1 ? "s" : ""})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTransitionDialog(t)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTransition(t.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/settings/workflows")}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending
              ? "Saving..."
              : isEdit
              ? "Update SOP"
              : "Create SOP"}
          </Button>
        </div>
      </div>

      {/* State Edit Dialog */}
      <StateEditDialog
        open={!!stateDialog}
        state={stateDialog}
        onClose={() => setStateDialog(null)}
        onSave={saveState}
      />

      {/* Transition Edit Dialog */}
      <TransitionEditDialog
        open={!!transitionDialog}
        transition={transitionDialog}
        states={states}
        onClose={() => setTransitionDialog(null)}
        onSave={saveTransition}
      />
    </Layout>
  );
};

// ────────────────── State Edit Dialog ──────────────────

function StateEditDialog({ open, state, onClose, onSave }) {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (state) setForm({ ...state });
  }, [state]);

  if (!open) return null;

  const set = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e?.target ? e.target.value : e,
    }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit State" : "Add State"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>State Name *</Label>
            <Input
              value={form.name || ""}
              onChange={set("name")}
              placeholder="e.g., New Lead"
            />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-full border-2 ${
                    form.color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description || ""}
              onChange={set("description")}
              placeholder="Optional tooltip text"
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_start || false}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, is_start: v }))
                }
              />
              Start State
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_end || false}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, is_end: v }))
                }
              />
              End State
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)}>
            {form.id ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────── Transition Edit Dialog ──────────────────

function TransitionEditDialog({ open, transition, states, onClose, onSave }) {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (transition)
      setForm({
        ...transition,
        form_fields: transition.form_fields || [],
      });
  }, [transition]);

  if (!open) return null;

  const setVal = (field, val) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  // ── Form field management ──

  const addFormField = () => {
    setForm((prev) => ({
      ...prev,
      form_fields: [
        ...prev.form_fields,
        {
          id: crypto.randomUUID(),
          label: "",
          type: "text",
          required: false,
          placeholder: "",
          options: [],
          default_value: "",
        },
      ],
    }));
  };

  const updateFormField = (idx, key, value) => {
    setForm((prev) => {
      const fields = [...prev.form_fields];
      fields[idx] = { ...fields[idx], [key]: value };
      return { ...prev, form_fields: fields };
    });
  };

  const removeFormField = (idx) => {
    setForm((prev) => ({
      ...prev,
      form_fields: prev.form_fields.filter((_, i) => i !== idx),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {form.id ? "Edit Transition" : "Add Transition"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From State *</Label>
              <Select
                value={form.from_state_id || ""}
                onValueChange={(v) => setVal("from_state_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {states
                    .filter((s) => !s.is_end)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To State *</Label>
              <Select
                value={form.to_state_id || ""}
                onValueChange={(v) => setVal("to_state_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Action Name *</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => setVal("name", e.target.value)}
              placeholder='e.g., "Send Proposal"'
            />
          </div>

          {/* Form Fields Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Transition Form Fields
              </Label>
              <Button variant="outline" size="sm" onClick={addFormField}>
                <Plus className="mr-1 h-3 w-3" />
                Add Field
              </Button>
            </div>

            {(form.form_fields || []).map((field, idx) => (
              <div
                key={field.id || idx}
                className="p-3 border rounded-lg space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={field.label}
                    onChange={(e) =>
                      updateFormField(idx, "label", e.target.value)
                    }
                    placeholder="Field label"
                    className="flex-1"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v) => updateFormField(idx, "type", v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>
                          {ft.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(v) =>
                        updateFormField(idx, "required", v)
                      }
                    />
                    Required
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFormField(idx)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>

                {field.type === "select" && (
                  <div>
                    <Input
                      value={(field.options || []).join(", ")}
                      onChange={(e) =>
                        updateFormField(
                          idx,
                          "options",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Options (comma separated): Option1, Option2"
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)}>
            {form.id ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SOPBuilder;
