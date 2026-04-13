import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchTask,
  updateTask,
  fetchComments,
  createComment,
  deleteComment,
  uploadTaskAttachment,
  deleteTask,
} from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  Users,
  Paperclip,
  Send,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { BACKEND_URL } from "../../../lib/axios";

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  done: { label: "Done", color: "bg-green-100 text-green-700" },
};

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: () => fetchTask(id),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", id],
    queryFn: () => fetchComments(id),
    enabled: !!task,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (text) => createComment(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", id] });
      setNewComment("");
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => deleteComment(id, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", id] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => deleteTask(id),
    onSuccess: () => {
      toast.success("Task deleted");
      navigate("/tasks");
    },
  });

  const handleChecklistToggle = (itemId) => {
    const updated = task.checklist.map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    updateMutation.mutate({ checklist: updated });
  };

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadTaskAttachment(id, file);
      const newAttachments = [...(task.attachments || []), result];
      updateMutation.mutate({ attachments: newAttachments });
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    }
    e.target.value = "";
  };

  const removeAttachment = (attachmentId) => {
    const filtered = task.attachments.filter((a) => a.id !== attachmentId);
    updateMutation.mutate({ attachments: filtered });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-sm font-medium">Task not found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/tasks")}>
            Back to Tasks
          </Button>
        </div>
      </Layout>
    );
  }

  const doneCount = task.checklist?.filter((c) => c.done).length || 0;
  const totalCount = task.checklist?.length || 0;

  return (
    <Layout>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Tasks
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/tasks/edit/${id}`)}>
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm("Delete this task?")) deleteTaskMutation.mutate();
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          {/* LEFT: Main content */}
          <div className="space-y-3">
            {/* Header */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <h1 className="text-lg font-semibold tracking-tight">{task.title}</h1>
                {task.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
                  {task.labels?.map((l) => (
                    <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            {totalCount > 0 && (
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Checklist
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {doneCount}/{totalCount}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1 mb-3">
                    <div
                      className="bg-primary h-1 rounded-full transition-all"
                      style={{ width: `${(doneCount / totalCount) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-1">
                    {task.checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-sm cursor-pointer py-1"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleChecklistToggle(item.id)}
                          className="h-3.5 w-3.5 rounded"
                        />
                        <span className={item.done ? "line-through text-muted-foreground" : ""}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Attachments
                  </p>
                  <label>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-3 w-3 mr-1" /> Upload
                      </span>
                    </Button>
                  </label>
                </div>
                {(task.attachments || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No attachments</p>
                ) : (
                  <div className="space-y-1">
                    {task.attachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border/40 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Paperclip className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{a.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={`${BACKEND_URL}${a.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                          <button onClick={() => removeAttachment(a.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Comments ({comments.length})
                </p>

                <div className="space-y-3 mb-3 max-h-80 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex gap-2 text-xs">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                          {(c.user_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.user_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                            <button
                              onClick={() => deleteCommentMutation.mutate(c.id)}
                              className="ml-auto opacity-0 hover:opacity-100 group-hover:opacity-100"
                            >
                              <Trash2 className="h-2.5 w-2.5 text-destructive" />
                            </button>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    className="text-sm resize-none flex-1"
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newComment.trim()) {
                        commentMutation.mutate(newComment);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={!newComment.trim() || commentMutation.isPending}
                    onClick={() => commentMutation.mutate(newComment)}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Sidebar */}
          <Card className="border-border/60 sticky top-4">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </p>
              {task.due_date && (
                <div>
                  <p className="text-[11px] text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-muted-foreground">Created By</p>
                <p className="text-sm font-medium mt-0.5">{task.created_by_name || task.created_by}</p>
              </div>
              {task.collaborators?.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Users className="h-3 w-3" /> Collaborators
                  </p>
                  <div className="space-y-1">
                    {task.collaborator_names?.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold">
                          {(name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-border/40">
                <p className="text-[11px] text-muted-foreground">Created</p>
                <p className="text-xs mt-0.5">{new Date(task.created_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default TaskDetail;
