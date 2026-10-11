import { priceMealCombos } from "../meal-combo";
import { validParticipantCount, validPickupTime } from "./slots";
import {
  parseSelections,
  resolveSelection,
  selectionKey,
  productUnitAmount,
  MenuValidationError,
  type Selection,
  type ModifierGroup,
} from "../menu-options";
export type PaymentMode = "host" | "split";
export type GroupPaymentMethod = "card" | "swish" | "cash";
export type GroupCheckoutSettings = Record<
  `${GroupPaymentMethod}_enabled` | "pickup_enabled" | "delivery_enabled",
  boolean
>;
export type GroupStatus =
  "open" | "locked" | "paying" | "submitted" | "cancelled";
export type GroupItem = {
  productId: string;
  quantity: number;
  note: string;
  selections?: Selection[];
};
export type GroupMember = {
  id: string;
  tokenHash: string;
  name: string;
  ready: boolean;
  revision: number;
  items: GroupItem[];
};
export type GroupLine = GroupItem & {
  comboDiscount?: number;
  name: string;
  unitAmount: number;
  memberId: string;
  memberName: string;
};
export type GroupPayment = {
  id: string;
  memberId: string;
  amount: number;
  status:
    "pending" | "paid" | "refunding" | "refunded" | "expired" | "pay_on_site";
  payerAlias?: string;
  attemptedAt?: string;
  sessionId?: string;
  intentId?: string;
  refundId?: string;
};
export type GroupCustomer = {
  name: string;
  phone: string;
  email: string;
  deliveryType: "pickup" | "delivery";
  address: string;
  comment: string;
};
export type GroupState = {
  pickupAt?: string;
  participantCount?: number;
  reservationId?: string;
  individualCheckout?: boolean;
  name: string;
  locale: string;
  mode: PaymentMode;
  paymentMethod?: GroupPaymentMethod;
  hostId: string;
  status: GroupStatus;
  deadline: string | null;
  spendLimit: number | null;
  expiresAt: string;
  members: GroupMember[];
  lines: GroupLine[];
  payments: GroupPayment[];
  customer: GroupCustomer | null;
  paymentDeadline: string | null;
  orderId: string;
};
export type GroupRow = { id: string; version: number; state: GroupState };
export type CatalogProduct = {
  category?: string;
  modifier_groups?: ModifierGroup[] | null;
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  track_stock?: boolean;
  stock_quantity?: number | null;
};

export class GroupError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

export const MAX_MEMBERS = 18;
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new GroupError("invalidInput");
  return value as Record<string, unknown>;
}
export function textField(
  value: unknown,
  max: number,
  required = true,
): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw new GroupError("invalidInput");
  const text = value.trim();
  if (
    (required && !text) ||
    text.length > max ||
    /[\u0000-\u001f\u007f]/.test(text)
  )
    throw new GroupError("invalidInput");
  return text;
}
export function parseItems(value: unknown): GroupItem[] {
  if (!Array.isArray(value) || value.length > 30)
    throw new GroupError("invalidInput");
  const seen = new Set<string>();
  return value.map((entry) => {
    const item = record(entry);
    const productId = textField(item.productId, 100);
    let selections: Selection[];
    try {
      selections = parseSelections(item.selections);
    } catch {
      throw new GroupError("invalidInput");
    }
    const key = selectionKey(productId, selections);
    if (
      seen.has(key) ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 20
    )
      throw new GroupError("invalidInput");
    seen.add(key);
    return {
      productId,
      ...(selections.length ? { selections } : {}),
      quantity: Number(item.quantity),
      note: textField(item.note, 200, false),
    };
  });
}
export function parseCustomer(value: unknown): GroupCustomer {
  const data = record(value);
  if (data.deliveryType !== "pickup" && data.deliveryType !== "delivery")
    throw new GroupError("invalidInput");
  const phone = textField(data.phone, 30);
  if (!/^\+?[\d ()-]{7,30}$/.test(phone)) throw new GroupError("invalidInput");
  const email = textField(data.email, 254, false).toLowerCase();
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw new GroupError("invalidInput");
  return {
    name: textField(data.name, 80),
    phone,
    email,
    deliveryType: data.deliveryType,
    address:
      data.deliveryType === "pickup" ? "Pickup" : textField(data.address, 300),
    comment: textField(data.comment, 500, false),
  };
}
export function createGroup(
  input: unknown,
  member: GroupMember,
  orderId: string,
  now: number,
): GroupState {
  const data = record(input);
  if (data.mode !== "host" && data.mode !== "split")
    throw new GroupError("invalidInput");
  if (data.pickupAt !== undefined && !validPickupTime(data.pickupAt, now))
    throw new GroupError("slotUnavailable", 409);
  const pickupAt = data.pickupAt as string | undefined;
  if (
    data.participantCount !== undefined &&
    (!pickupAt || !validParticipantCount(data.participantCount))
  )
    throw new GroupError("invalidParticipantCount");
  const expiresAt =
    pickupAt || new Date(now + 24 * 60 * 60 * 1000).toISOString();
  let deadline: string | null = null;
  if (data.deadline) {
    const time =
      typeof data.deadline === "string" ? Date.parse(data.deadline) : NaN;
    if (
      !Number.isFinite(time) ||
      time <= now ||
      time > now + 24 * 60 * 60 * 1000
    )
      throw new GroupError("invalidDeadline");
    deadline = new Date(Math.min(time, Date.parse(expiresAt))).toISOString();
  }
  const spendLimit = data.spendLimit == null ? null : Number(data.spendLimit);
  if (
    spendLimit !== null &&
    (!Number.isSafeInteger(spendLimit) ||
      spendLimit < 300 ||
      spendLimit > 1000000)
  )
    throw new GroupError("invalidInput");
  return {
    ...(pickupAt ? { pickupAt } : {}),
    ...(validParticipantCount(data.participantCount)
      ? { participantCount: data.participantCount }
      : {}),
    name: textField(data.name, 80),
    mode: data.mode,
    locale: ["en", "sv", "ru", "pl"].includes(String(data.locale))
      ? String(data.locale)
      : "sv",
    hostId: member.id,
    status: "open",
    deadline,
    spendLimit,
    expiresAt,
    members: [member],
    lines: [],
    payments: [],
    customer: null,
    paymentDeadline: null,
    orderId,
  };
}
export function requireMember(
  state: GroupState,
  tokenHash: string,
): GroupMember {
  const member = state.members.find((item) => item.tokenHash === tokenHash);
  if (!member) throw new GroupError("unauthorized", 401);
  return member;
}
export function requireHost(state: GroupState, member: GroupMember) {
  if (member.id !== state.hostId) throw new GroupError("hostOnly", 403);
}
export function requireOpen(state: GroupState, now: number) {
  if (state.status !== "open") throw new GroupError("locked", 409);
  if (
    Date.parse(state.expiresAt) <= now ||
    (state.deadline && Date.parse(state.deadline) <= now)
  )
    throw new GroupError("deadlinePassed", 409);
}
export function priceGroup(
  members: GroupMember[],
  products: CatalogProduct[],
  limit: number | null,
): GroupLine[] {
  const catalog = new Map(
    products.map((product) => [String(product.id), product]),
  );
  const quantities = new Map<string, number>();
  const lines: GroupLine[] = [];
  for (const member of members) {
    const memberLines: (GroupLine & { category?: string })[] = [];
    for (const item of member.items) {
      const product = catalog.get(item.productId);
      if (!product || !product.is_available)
        throw new GroupError("productUnavailable", 409);
      let unitAmount: number;
      let summary: string;
      try {
        const selection = resolveSelection(
          product.modifier_groups,
          item.selections,
        );
        unitAmount = productUnitAmount(product.price, selection.extraAmount);
        summary = selection.summary;
      } catch (error) {
        if (error instanceof MenuValidationError)
          throw new GroupError("invalidSelection", 409);
        throw error;
      }
      if (
        !Number.isSafeInteger(unitAmount) ||
        unitAmount < 0 ||
        unitAmount > 1000000
      )
        throw new GroupError("productUnavailable", 409);
      const quantity = (quantities.get(item.productId) || 0) + item.quantity;
      quantities.set(item.productId, quantity);
      if (product.track_stock && quantity > Number(product.stock_quantity || 0))
        throw new GroupError("productUnavailable", 409);
      memberLines.push({
        ...item,
        category: product.category,
        name: [product.name, summary].filter(Boolean).join(" · "),
        unitAmount,
        memberId: member.id,
        memberName: member.name,
      });
    }
    // A participant's food funds only their own combo, in either payment mode.
    const pricedLines = priceMealCombos(memberLines).map(
      ({ category: _category, ...line }) => ({
        ...line,
        name: line.comboDiscount ? `${line.name} · Combo (−5 kr)` : line.name,
      }),
    );
    const subtotal = pricedLines.reduce(
      (sum, line) => sum + line.unitAmount * line.quantity,
      0,
    );
    lines.push(...pricedLines);
    if (limit !== null && subtotal > limit)
      throw new GroupError("spendLimitExceeded", 409);
  }
  validateGroupTotal(lines);
  return lines;
}
function validateGroupTotal(lines: GroupLine[]) {
  if (
    lines.length > 200 ||
    lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0) >
      10000000
  )
    throw new GroupError("orderTooLarge");
}
export function lockGroup(
  state: GroupState,
  customer: GroupCustomer,
  products: CatalogProduct[],
  newId: () => string,
  now: number,
): GroupState {
  if (state.status !== "open" || Date.parse(state.expiresAt) <= now)
    throw new GroupError("locked", 409);
  if (state.members.some((member) => !member.ready))
    throw new GroupError("membersNotReady", 409);
  const frozenMembers = new Set(
    state.payments.filter((p) => p.attemptedAt).map((p) => p.memberId),
  );
  const lines =
    state.mode === "split" && state.individualCheckout
      ? [
          ...state.lines.filter((line) => frozenMembers.has(line.memberId)),
          ...priceGroup(
            state.members.filter((member) => !frozenMembers.has(member.id)),
            products,
            state.spendLimit,
          ),
        ]
      : priceGroup(state.members, products, state.spendLimit);
  validateGroupStock(state.members, products);
  validateGroupTotal(lines);
  if (!lines.length) throw new GroupError("emptyOrder");
  const payments =
    state.mode === "host"
      ? [
          {
            id: newId(),
            memberId: state.hostId,
            amount: lines.reduce(
              (sum, line) => sum + line.unitAmount * line.quantity,
              0,
            ),
            status: "pending" as const,
          },
        ]
      : state.members
          .filter((member) => member.items.length)
          .map((member) => {
            const amount = lines
              .filter((line) => line.memberId === member.id)
              .reduce((sum, line) => sum + line.unitAmount * line.quantity, 0);
            const existing = state.payments.find(
              (p) => p.memberId === member.id,
            );
            if (existing?.attemptedAt) {
              if (existing.amount !== amount)
                throw new GroupError("paymentMismatch", 409);
              return existing;
            }
            return {
              id: newId(),
              memberId: member.id,
              amount,
              status: "pending" as const,
            };
          });
  if (payments.some((payment) => payment.amount < 300))
    throw new GroupError("minimumPayment");
  return {
    ...state,
    status: payments.some((p) => p.attemptedAt)
      ? ("paying" as const)
      : ("locked" as const),
    customer,
    lines,
    payments,
    paymentDeadline: new Date(
      Math.min(now + 60 * 60 * 1000, Date.parse(state.expiresAt)),
    ).toISOString(),
  };
}

export function validateGroupStock(
  members: GroupMember[],
  products: CatalogProduct[],
) {
  const quantities = new Map<string, number>();
  for (const member of members)
    for (const item of member.items)
      quantities.set(
        item.productId,
        (quantities.get(item.productId) || 0) + item.quantity,
      );
  for (const [id, quantity] of quantities) {
    const product = products.find((p) => p.id === id);
    if (
      !product ||
      !product.is_available ||
      (product.track_stock && quantity > Number(product.stock_quantity || 0))
    )
      throw new GroupError("productUnavailable", 409);
  }
}

export function freezeMemberSelection(
  state: GroupState,
  member: GroupMember,
  products: CatalogProduct[],
  newId: () => string,
) {
  const existing = state.payments.find((p) => p.memberId === member.id);
  if (existing?.attemptedAt) throw new GroupError("selectionPaid", 409);
  const lines = priceGroup([member], products, state.spendLimit);
  const amount = lines.reduce(
    (sum, line) => sum + line.unitAmount * line.quantity,
    0,
  );
  if (lines.length && amount < 300) throw new GroupError("minimumPayment");
  validateGroupStock(state.members, products);
  state.lines = [
    ...state.lines.filter((line) => line.memberId !== member.id),
    ...lines,
  ];
  validateGroupTotal(state.lines);
  state.payments = [
    ...state.payments.filter((p) => p.memberId !== member.id),
    ...(lines.length
      ? [
          {
            id: newId(),
            memberId: member.id,
            amount,
            status: "pending" as const,
          },
        ]
      : []),
  ];
}
export function publicGroup(row: GroupRow, tokenHash: string) {
  const state = row.state;
  const me = state.members.find((member) => member.tokenHash === tokenHash);
  const summary = {
    pickupAt: state.pickupAt || null,
    individualCheckout: state.individualCheckout === true,
    deliveryType: state.customer?.deliveryType || null,
    id: row.id,
    version: row.version,
    ...(state.participantCount !== undefined
      ? { participantCount: state.participantCount }
      : {}),
    name: state.name,
    mode: state.mode,
    paymentMethod: state.paymentMethod || "card",
    status: state.status,
    deadline: state.deadline,
    spendLimit: state.spendLimit,
    expiresAt: state.expiresAt,
    hostName:
      state.members.find((member) => member.id === state.hostId)?.name || "",
  };
  if (!me)
    return {
      ...summary,
      me: null,
      members: [],
      lines: [],
      payments: [],
      customer: null,
      paymentDeadline: null,
    };
  return {
    ...summary,
    me: { id: me.id, isHost: me.id === state.hostId },
    members: state.members.map(({ tokenHash: _token, ...member }) => member),
    lines: state.lines,
    payments: state.payments.map(
      ({ memberId, amount, status, attemptedAt }) => ({
        memberId,
        amount,
        status,
        started: Boolean(attemptedAt),
      }),
    ),
    customer: me.id === state.hostId ? state.customer : null,
    paymentDeadline: state.paymentDeadline,
  };
}
export type PublicGroup = ReturnType<typeof publicGroup> & {
  orderStatus?: string | null;
  displayOrderNumber?: string | null;
};
