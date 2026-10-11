import { selectionKey } from "../menu-options";
import {
  validPickupTime,
  validParticipantCount,
  isGroupAvailability,
  type GroupAvailability,
} from "./slots";
import { groupSwishEnabled } from "./swish";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GroupError,
  type GroupRow,
  type GroupCheckoutSettings,
  type GroupPaymentMethod,
  type GroupState,
  type GroupMember,
  type CatalogProduct,
  createGroup,
  groupDeadlineMs,
  record,
  textField,
  parseItems,
  parseCustomer,
  priceGroup,
  lockGroup,
  freezeMemberSelection,
  validateGroupPortions,
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
    .select(
      "id, name, price, category, is_available, track_stock, stock_quantity, modifier_groups",
    )
    .limit(1000);
  if (error) throw new GroupError("unavailable", 503);
  return data || [];
}
export async function checkoutSettings(
  deliveryType: "delivery" | "pickup",
  method?: GroupPaymentMethod,
  booking = false,
): Promise<GroupCheckoutSettings> {
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
  if (!booking && !shift.data.is_open)
    throw new GroupError("kitchenClosed", 409);
  const options = settings.data;
  options.swish_enabled = options.swish_enabled && groupSwishEnabled();
  if (
    !options[`${deliveryType}_enabled`] ||
    (method
      ? !options[`${method}_enabled`]
      : !(["card", "swish", "cash"] as const).some(
          (value) => options[`${value}_enabled`],
        ))
  )
    throw new GroupError("optionUnavailable", 409);
  return options as GroupCheckoutSettings;
}
export async function newGroup(
  input: unknown,
  token: string,
): Promise<GroupRow> {
  const data = record(input);
  if (!validPickupTime(data.pickupAt, Date.now()))
    throw new GroupError("slotUnavailable", 409);
  if (!validParticipantCount(data.participantCount))
    throw new GroupError("invalidParticipantCount");
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
  if (row.state.mode === "split") {
    const requestedMethod = data.paymentMethod;
    if (
      requestedMethod !== undefined &&
      requestedMethod !== "card" &&
      requestedMethod !== "swish" &&
      requestedMethod !== "cash"
    )
      throw new GroupError("invalidInput");
    const customer =
      data.customer === undefined ? null : parseCustomer(data.customer);
    const options = await checkoutSettings(
      customer?.deliveryType || "pickup",
      requestedMethod,
      true,
    );
    const method =
      requestedMethod ||
      (["card", "swish", "cash"] as const).find(
        (candidate) => options[`${candidate}_enabled`],
      );
    if (!method) throw new GroupError("optionUnavailable", 409);
    row.state.customer = customer;
    row.state.paymentMethod = method;
    row.state.individualCheckout = true;
    row.state.paymentDeadline = row.state.expiresAt;
  }
  const { data: saved, error } = await groupDb().rpc(
    "create_group_with_capacity",
    {
      p_id: row.id,
      p_state: row.state,
      p_token_hash: tokenHash(token),
      p_pickup: row.state.pickupAt,
      p_count: row.state.participantCount,
    },
  );
  if (error) throw groupStorageError(error);
  if (!saved?.id || !saved.state) throw new GroupError("unavailable", 503);
  return saved as GroupRow;
}

export function groupStorageError(error: { message?: string }) {
  const codes = [
    "slotUnavailable",
    "capacityExhausted",
    "reservationExpired",
    "reservationConflict",
    "groupFull",
    "invalidSlotDeadline",
  ];
  return error.message && codes.includes(error.message)
    ? new GroupError(error.message, 409)
    : new GroupError("unavailable", 503);
}

export async function groupAvailability(
  db = groupDb(),
  reservationHash?: string,
): Promise<GroupAvailability> {
  const { data, error } = reservationHash
    ? await db.rpc("group_slot_availability", { p_token_hash: reservationHash })
    : await db.rpc("group_pickup_availability");
  if (error || !isGroupAvailability(data))
    throw new GroupError("unavailable", 503);
  return data as GroupAvailability;
}

export async function actOnGroup(
  id: string,
  hash: string,
  input: unknown,
): Promise<GroupRow> {
  const data = record(input);
  const action = textField(data.action, 30);
  const products = ["items", "lock", "ready"].includes(action)
    ? await catalog()
    : [];
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
      if (state.members.length >= (state.participantCount ?? MAX_MEMBERS))
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
      if (state.payments.some((p) => p.memberId === me.id && p.attemptedAt))
        throw new GroupError("selectionPaid", 409);
      if (action === "ready" && data.ready === true) {
        requireOpen(state, now);
      } else requireOpen(state, now);
      if (me.revision !== data.revision) throw new GroupError("conflict", 409);
      if (action === "items") {
        if (me.ready) throw new GroupError("alreadyReady", 409);
        const items = parseItems(data.items);
        const increasesQuantity = items.some(
          (item) =>
            item.quantity >
            (me.items.find(
              (previous) =>
                selectionKey(previous.productId, previous.selections) ===
                selectionKey(item.productId, item.selections),
            )?.quantity || 0),
        );
        me.items = items;
        // Always allow removal, even if other dishes have since sold out.
        // Otherwise two unavailable dishes can prevent each other being removed.
        if (increasesQuantity) {
          validateGroupPortions(
            state.members,
            products,
            state.participantCount,
          );
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
        if (state.individualCheckout && state.mode === "split") {
          if (data.ready)
            freezeMemberSelection(state, me, products, randomUUID);
          else {
            state.lines = state.lines.filter((line) => line.memberId !== me.id);
            state.payments = state.payments.filter((p) => p.memberId !== me.id);
          }
        }
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
      if (
        state.payments.some(
          (p) => p.memberId === data.memberId && p.attemptedAt,
        )
      )
        throw new GroupError("selectionPaid", 409);
      state.members = state.members.filter(
        (member) => member.id !== data.memberId,
      );
      state.payments = state.payments.filter(
        (p) => p.memberId !== data.memberId,
      );
      state.lines = state.lines.filter(
        (line) => line.memberId !== data.memberId,
      );
      return state;
    }
    if (action === "reopen") {
      if (
        state.status !== "locked" ||
        groupDeadlineMs(state) <= now ||
        state.payments.some((payment) => payment.attemptedAt)
      )
        throw new GroupError("locked", 409);
      state.status = "open";
      state.payments = [];
      state.lines = [];
      if (!state.individualCheckout) state.customer = null;
      state.paymentDeadline = state.individualCheckout
        ? new Date(groupDeadlineMs(state)).toISOString()
        : null;
      if (state.individualCheckout)
        state.members.forEach((member) => {
          member.ready = false;
          member.revision++;
        });
      return state;
    }
    if (action === "lock" && customer) {
      if (
        state.individualCheckout &&
        (method !== state.paymentMethod ||
          (state.customer &&
            (customer.deliveryType !== state.customer.deliveryType ||
              customer.address !== state.customer.address)))
      )
        throw new GroupError("conflict", 409);
      return {
        ...lockGroup(state, customer, products, randomUUID, now),
        paymentMethod: method as GroupPaymentMethod,
      };
    }
    throw new GroupError("invalidInput");
  });
}
