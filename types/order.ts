import type { CartItem } from "@/components/CartProvider";

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type DeliveryType = "delivery" | "pickup";

export type PaymentMethod = "cash" | "swish" | "card";

export type PaymentStatus =
  | "unpaid"
  | "awaiting_payment"
  | "paid"
  | "failed"
  | "refunded";

export type KitchenOrder = {
  id: string;

  customerName: string;
  customerPhone: string;
  address: string;
  deliveryType: DeliveryType;
  comment?: string;

  items: CartItem[];
  totalPrice: number;

  status: OrderStatus;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;

  createdAt: string;
};