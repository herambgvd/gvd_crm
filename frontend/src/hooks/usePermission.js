import { useAuth } from "../context/AuthContext";

/**
 * Check if current user has a specific permission.
 * Superusers always return true.
 */
export const usePermission = (permission) => {
  const { user } = useAuth();
  if (!user) return false;
  if (user.is_superuser) return true;
  return (user.permissions || []).includes(permission);
};

/**
 * Check if user has any of the given permissions.
 */
export const useAnyPermission = (...permissions) => {
  const { user } = useAuth();
  if (!user) return false;
  if (user.is_superuser) return true;
  const userPerms = user.permissions || [];
  return permissions.some((p) => userPerms.includes(p));
};
