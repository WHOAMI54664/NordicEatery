import type { CartItem } from "@/components/CartProvider";

export type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";

export type KitchenOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryType: "delivery" | "pickup";
  comment?: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  paymentMethod?: string;
  paymentStatus?: string;
};
