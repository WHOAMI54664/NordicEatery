export const STAFF_ROLES = ["owner", "admin", "cook"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

function normalizeRole(role: string | null | undefined) {
  return role?.toLowerCase() as StaffRole | undefined;
}

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  const normalizedRole = normalizeRole(role);

  return STAFF_ROLES.includes(normalizedRole as StaffRole);
}

export function canAccessKitchen(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return (
      normalizedRole === "owner" ||
      normalizedRole === "admin" ||
      normalizedRole === "cook"
  );
}
export function canManageOrders(role: string | null | undefined) {
  const normalizedRole = role?.toLowerCase();

  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageSettings(role: string | null | undefined) {
  const normalizedRole = role?.toLowerCase();

  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageReservations(role: string | null | undefined) {
  const normalizedRole = role?.toLowerCase();

  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageProducts(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canViewAnalytics(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageInventory(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageStaff(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner";
}