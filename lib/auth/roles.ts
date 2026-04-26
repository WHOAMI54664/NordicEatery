export const STAFF_ROLES = ["owner", "admin", "cook"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

export function canAccessKitchen(role: string | null | undefined) {
  return role === "owner" || role === "admin" || role === "cook";
}

export function canManageProducts(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canViewAnalytics(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canManageInventory(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canManageStaff(role: string | null | undefined) {
  return role === "owner";
}