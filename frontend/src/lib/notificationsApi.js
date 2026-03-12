import { api } from "./axios";

export const fetchNotifications = async () => {
  const { data } = await api.get("/notifications");
  return data;
};

export const fetchUnreadCount = async () => {
  const { data } = await api.get("/notifications/count");
  return data.unread_count;
};

export const markNotificationRead = async (id) => {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.put("/notifications/read-all");
  return data;
};
