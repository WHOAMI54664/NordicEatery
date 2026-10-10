import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GroupError,
  type GroupRow,
  type GroupPaymentMethod,
  type GroupState,
  type GroupMember,
  type CatalogProduct,
  createGroup,
  record,
  textField,
  parseItems,
  parseCustomer,
  priceGroup,
  lockGroup,
  requireMember,
  requireHost,
  requireOpen,
  MAX_MEMBERS,
  UUID,
} from "./model";

export const groupCookie = (id: string) => `ne_group_${id}`;
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function groupDb() {
  return createAdminClient({ timeoutMs: 10000 });
}
export async function readGroup(id: string): Promise<GroupRow> {
  if (!UUID.test(id)) throw new GroupError("notFound", 404);
  const { data, error } = await groupDb()
    .from("group_orders")
    .select("id, version, state")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new GroupError("unavailable", 503);
  if (!data) throw new GroupError("notFound", 404);
  return data as GroupRow;
}

// Compare-and-swap prevents concurrent participants from overwriting each other.
// Callbacks may run again: they must have no external side effects.
export async function changeGroup(
  id: string,
  update: (
    state: GroupState,
    version: number,
  ) => GroupState | Promise<GroupState>,
): Promise<GroupRow> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await readGroup(id);
    const state = await update(structuredClone(row.state), row.version);
    const { data, error } = await groupDb()
      .from("group_orders")
      .update({
        state,
        version: row.version + 1,
        updated_at: new Date().toISOString(),
        next_check_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("version", row.version)
      .select("id, version, state")
      .maybeSingle();
    if (error) throw new GroupError("unavailable", 503);
    if (data) return data as GroupRow;
  }
  throw new GroupError("conflict", 409);
}

export async function catalog(): Promise<CatalogProduct[]> {
  const { data, error } = await groupDb()
    .from("products")
    .select("id, name, price, is_available, track_stock, stock_quantity")
    .limit(1000);
  if (error) throw new GroupError("unavailable", 503);
  return data || [];
}
export async function checkoutSettings(
  deliveryType: "delivery" | "pickup",
  method?: GroupPaymentMethod,
) {
  const db = groupDb();
  const [shift, settings] = await Promise.all([
    db
      .from("restaurant_shift_state")
      .select("is_open")
      .eq("id", 1)
      .maybeSingle(),
    db
      .from("business_settings")
      .select(
        "card_enabled, swish_enabled, cash_enabled, pickup_enabled, delivery_enabled",
      )
      .limit(1)
      .maybeSingle(),
  ]);
  if (shift.error || settings.error || !shift.data || !settings.data)
    throw new GroupError("unavailable", 503);
  if (!shift.data.is_open) throw new GroupError("kitchenClosed", 409);
  const options = settings.data;
  if (
    !options[`${deliveryType}_enabled`] ||
    (method
      ? !options[`${method}_enabled`]
      : !(["card", "swish", "cash"] as const).some(
          (value) => options[`${value}_enabled`],
        ))
  )
    throw new GroupError("optionUnavailable", 409);
}
export async function newGroup(
  input: unknown,
  token: string,
): Promise<GroupRow> {
  const data = record(input);
  const member: GroupMember = {
    id: randomUUID(),
    tokenHash: tokenHash(token),
    name: textField(data.memberName, 60),
    ready: false,
    revision: 0,
    items: [],
  };
  const row = {
    id: randomUUID(),
    version: 1,
    state: createGroup(input, member, randomUUID(), Date.now()),
  };
  const { error } = await groupDb().from("group_orders").insert(row);
  if (error) throw new GroupError("unavailable", 503);
  return row;
}

export async function actOnGroup(
  id: string,
  hash: string,
  input: unknown,
): Promise<GroupRow> {
  const data = record(input);
  const action = textField(data.action, 30);
  const products = ["items", "lock"].includes(action) ? await catalog() : [];
  const customer = action === "lock" ? parseCustomer(data.customer) : null;
  const method = data.paymentMethod ?? "card";
  if (customer) {
    if (method !== "card" && method !== "swish" && method !== "cash")
      throw new GroupError("invalidInput");
    await checkoutSettings(customer.deliveryType, method);
  }
  return changeGroup(id, (state, version) => {
    const now = Date.now();
    if (action === "join") {
      if (state.members.some((member) => member.tokenHash === hash))
        return state;
      requireOpen(state, now);
      if (state.members.length >= MAX_MEMBERS)
        throw new GroupError("groupFull", 409);
      state.members.push({
        id: randomUUID(),
        tokenHash: hash,
        name: textField(data.name, 60),
        ready: false,
        revision: 0,
        items: [],
      });
      return state;
    }
    const me = requireMember(state, hash);
    if (action === "items" || action === "ready") {
      if (action === "ready" && data.ready === true) {
        // The deadline freezes dishes, but guests can still confirm that selection.
        if (state.status !== "open" || Date.parse(state.expiresAt) <= now)
          throw new GroupError("locked", 409);
      } else requireOpen(state, now);
      if (me.revision !== data.revision) throw new GroupError("conflict", 409);
      if (action === "items") {
        if (me.ready) throw new GroupError("alreadyReady", 409);
        const items = parseItems(data.items);
        const increasesQuantity = items.some(
          (item) =>
            item.quantity >
            (me.items.find((previous) => previous.productId === item.productId)
              ?.quantity || 0),
        );
        me.items = items;
        // Always allow removal, even if other dishes have since sold out.
        // Otherwise two unavailable dishes can prevent each other being removed.
        if (increasesQuantity) {
          priceGroup([me], products, state.spendLimit);
          const selected = new Set(me.items.map((item) => item.productId));
          priceGroup(
            state.members.map((member) => ({
              ...member,
              items: member.items.filter((item) =>
                selected.has(item.productId),
              ),
            })),
            products,
            null,
          );
        }
      } else {
        if (typeof data.ready !== "boolean")
          throw new GroupError("invalidInput");
        me.ready = data.ready;
      }
      me.revision++;
      return state;
    }
    requireHost(state, me);
    if (action === "cancel") {
      if (state.status === "submitted")
        throw new GroupError("alreadySubmitted", 409);
      state.status = "cancelled";
      return state;
    }
    if (version !== data.version) throw new GroupError("conflict", 409);
    if (action === "remove") {
      if (state.status !== "open") throw new GroupError("locked", 409);
      if (data.memberId === state.hostId) throw new GroupError("invalidInput");
      state.members = state.members.filter(
        (member) => member.id !== data.memberId,
      );
      return state;
    }
    if (action === "reopen") {
      if (
        state.status !== "locked" ||
        state.payments.some((payment) => payment.attemptedAt)
      )
        throw new GroupError("locked", 409);
      state.status = "open";
      state.payments = [];
      state.lines = [];
      state.customer = null;
      state.paymentDeadline = null;
      return state;
    }
    if (action === "lock" && customer)
      return {
        ...lockGroup(state, customer, products, randomUUID, now),
        paymentMethod: method as GroupPaymentMethod,
      };
    throw new GroupError("invalidInput");
  });
}
