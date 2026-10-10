import {
  canAccessKitchen,
  canManageOrders,
  canManageStaff,
  type StaffRole,
} from "../auth/roles";

export type AdminSection = {
  id: string;
  href: string;
  label: string;
  group: "operations" | "catalog" | "business" | "workspace";
  access: "management" | "kitchen" | "owner" | "staff";
};

// One route map drives the sidebar, breadcrumbs and related-section tabs.
export const adminSections: readonly AdminSection[] = [
  {
    id: "overview",
    href: "/admin",
    label: "common.dashboard",
    group: "operations",
    access: "management",
  },
  {
    id: "orders",
    href: "/admin/orders",
    label: "common.orders",
    group: "operations",
    access: "management",
  },
  {
    id: "kitchen",
    href: "/admin/kitchen",
    label: "common.kitchen",
    group: "operations",
    access: "kitchen",
  },
  {
    id: "kitchen-display",
    href: "/admin/kitchen-display",
    label: "workspace.kitchenDisplay",
    group: "operations",
    access: "kitchen",
  },
  {
    id: "reservations",
    href: "/admin/reservations",
    label: "common.reservations",
    group: "operations",
    access: "management",
  },
  {
    id: "menu",
    href: "/admin/menu",
    label: "common.menu",
    group: "catalog",
    access: "management",
  },
  {
    id: "products",
    href: "/admin/products",
    label: "common.products",
    group: "catalog",
    access: "management",
  },
  {
    id: "inventory",
    href: "/admin/inventory",
    label: "workspace.inventory",
    group: "catalog",
    access: "management",
  },
  {
    id: "analytics",
    href: "/admin/analytics",
    label: "common.analytics",
    group: "business",
    access: "management",
  },
  {
    id: "reports",
    href: "/admin/reports",
    label: "common.reports",
    group: "business",
    access: "management",
  },
  {
    id: "staff",
    href: "/admin/staff",
    label: "common.staff",
    group: "business",
    access: "owner",
  },
  {
    id: "settings",
    href: "/admin/settings",
    label: "common.settings",
    group: "workspace",
    access: "management",
  },
  {
    id: "documentation",
    href: "/admin/documentation",
    label: "common.documentation",
    group: "workspace",
    access: "management",
  },
  {
    id: "account",
    href: "/admin/account",
    label: "workspace.account",
    group: "workspace",
    access: "staff",
  },
];

export function visibleAdminSections(role: StaffRole) {
  return adminSections.filter((section) => {
    if (section.access === "owner") return canManageStaff(role);
    if (section.access === "management") return canManageOrders(role);
    return canAccessKitchen(role);
  });
}

export function currentAdminSection(pathname: string, locale: string) {
  const path = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
  return adminSections.find(
    (section) =>
      path === section.href ||
      (section.href !== "/admin" && path.startsWith(`${section.href}/`)),
  );
}

// PostgREST .or() is a filter expression, not a free-text parameter.
export function adminSearchTerm(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s@+.'\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
