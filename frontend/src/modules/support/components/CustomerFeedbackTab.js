import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerFeedback } from "../api";
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
import {
  MessageSquare,
  Plus,
  Save,
  Calendar,
  Star,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";

const CustomerFeedbackTab = ({ ticketId, feedback, ticketStatus }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(
    !feedback && ticketStatus === "customer_feedback",
  );
  const [formData, setFormData] = useState({
    customer_confirmation: "Pending",
    closure_date: "",
    customer_feedback: "",
    customer_feedback_comments: "",
    support_rating: "",
    support_rating_comments: "",
    closure_remarks: "",
    would_recommend: null,
    improvement_suggestions: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => createCustomerFeedback(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast.success("Customer feedback created successfully!");
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create customer feedback",
      );
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      ticket_id: ticketId,
      closure_date: formData.closure_date
        ? new Date(formData.closure_date).toISOString()
        : null,
      customer_feedback: formData.customer_feedback
        ? parseInt(formData.customer_feedback)
        : null,
      support_rating: formData.support_rating
        ? parseInt(formData.support_rating)
        : null,
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-500 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  if (feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Customer Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Customer Confirmation
                </Label>
                <p
                  className={`text-sm font-medium ${
                    feedback.customer_confirmation === "Yes"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {feedback.customer_confirmation}
                </p>
              </div>

              {feedback.closure_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Closure Date</Label>
                    <p className="text-sm">
                      {new Date(feedback.closure_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {feedback.would_recommend !== null && (
                <div className="flex items-center gap-2">
                  {feedback.would_recommend ? (
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <Label className="text-sm font-medium">
                      Would Recommend
                    </Label>
                    <p
                      className={`text-sm font-medium ${
                        feedback.would_recommend
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {feedback.would_recommend ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {feedback.customer_feedback && (
                <div>
                  <Label className="text-sm font-medium">Customer Rating</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {renderStars(feedback.customer_feedback)}
                    </div>
                    <span className="text-sm font-medium">
                      {feedback.customer_feedback}/5
                    </span>
                  </div>
                </div>
              )}

              {feedback.support_rating && (
                <div>
                  <Label className="text-sm font-medium">Support Rating</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {renderStars(feedback.support_rating)}
                    </div>
                    <span className="text-sm font-medium">
                      {feedback.support_rating}/5
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {feedback.customer_feedback_comments && (
              <div>
                <Label className="text-sm font-medium">
                  Customer Feedback Comments
                </Label>
                <p className="text-sm mt-1 p-3 bg-blue-50 rounded-md">
                  {feedback.customer_feedback_comments}
                </p>
              </div>
            )}

            {feedback.support_rating_comments && (
              <div>
                <Label className="text-sm font-medium">
                  Support Rating Comments
                </Label>
                <p className="text-sm mt-1 p-3 bg-green-50 rounded-md">
                  {feedback.support_rating_comments}
                </p>
              </div>
            )}

            {feedback.improvement_suggestions && (
              <div>
                <Label className="text-sm font-medium">
                  Improvement Suggestions
                </Label>
                <p className="text-sm mt-1 p-3 bg-yellow-50 rounded-md">
                  {feedback.improvement_suggestions}
                </p>
              </div>
            )}

            {feedback.closure_remarks && (
              <div>
                <Label className="text-sm font-medium">Closure Remarks</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {feedback.closure_remarks}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {feedback.feedback_collected_by && (
              <>Collected by {feedback.feedback_collected_by} on </>
            )}
            {new Date(feedback.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm && ticketStatus !== "customer_feedback") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Customer Feedback</h3>
          <p className="text-muted-foreground mb-4">
            Customer feedback will be collected once the ticket moves to the
            feedback stage.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Collect Customer Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_confirmation">
                Customer Confirmation
              </Label>
              <Select
                value={formData.customer_confirmation}
                onValueChange={(value) =>
                  handleChange("customer_confirmation", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="closure_date">Closure Date</Label>
              <Input
                id="closure_date"
                type="datetime-local"
                value={formData.closure_date}
                onChange={(e) => handleChange("closure_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_feedback">Customer Feedback (1-5)</Label>
              <Select
                value={formData.customer_feedback}
                onValueChange={(value) =>
                  handleChange("customer_feedback", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Very Poor</SelectItem>
                  <SelectItem value="2">2 - Poor</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="support_rating">Support Rating (1-5)</Label>
              <Select
                value={formData.support_rating}
                onValueChange={(value) => handleChange("support_rating", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Very Poor</SelectItem>
                  <SelectItem value="2">2 - Poor</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="customer_feedback_comments">
              Customer Feedback Comments
            </Label>
            <Textarea
              id="customer_feedback_comments"
              value={formData.customer_feedback_comments}
              onChange={(e) =>
                handleChange("customer_feedback_comments", e.target.value)
              }
              placeholder="Customer's comments about the resolution..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="support_rating_comments">
              Support Rating Comments
            </Label>
            <Textarea
              id="support_rating_comments"
              value={formData.support_rating_comments}
              onChange={(e) =>
                handleChange("support_rating_comments", e.target.value)
              }
              placeholder="Customer's comments about the support experience..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="would_recommend">
              Would Recommend Our Service?
            </Label>
            <Select
              value={formData.would_recommend?.toString() || ""}
              onValueChange={(value) =>
                handleChange("would_recommend", value === "true")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="improvement_suggestions">
              Improvement Suggestions
            </Label>
            <Textarea
              id="improvement_suggestions"
              value={formData.improvement_suggestions}
              onChange={(e) =>
                handleChange("improvement_suggestions", e.target.value)
              }
              placeholder="Customer's suggestions for improvement..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="closure_remarks">Closure Remarks</Label>
            <Textarea
              id="closure_remarks"
              value={formData.closure_remarks}
              onChange={(e) => handleChange("closure_remarks", e.target.value)}
              placeholder="Final comments for closure..."
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
                  Save Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerFeedbackTab;
