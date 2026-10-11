"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItems,
  cartPricing,
  restoreCart,
  type CartItem,
  type CartAddition,
} from "@/lib/cart";
export type { CartItem } from "@/lib/cart";
type CartContextValue = {
  items: CartItem[];
  addItems: (additions: CartAddition[]) => boolean;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  pricing: ReturnType<typeof cartPricing>;
};
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mikes-food-cart";
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    try {
      setItems(
        restoreCart(
          JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"),
        ),
      );
    } catch {
      setItems([]);
    } finally {
      setHasLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!hasLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* The in-memory cart remains usable when browser storage is unavailable. */
    }
  }, [items, hasLoaded]);
  const addItems = useCallback(
    (additions: CartAddition[]) => {
      try {
        const next = addCartItems(items, additions);
        setItems(next);
        return true;
      } catch {
        return false;
      }
    },
    [items],
  );
  const removeItem = useCallback(
    (lineId: string) =>
      setItems((current) => current.filter((item) => item.lineId !== lineId)),
    [],
  );
  const setQuantity = useCallback(
    (lineId: string, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) return;
      if (!quantity) {
        removeItem(lineId);
        return;
      }
      setItems((current) => {
        const item = current.find((value) => value.lineId === lineId);
        if (
          !item ||
          current
            .filter((value) => value.id === item.id && value.lineId !== lineId)
            .reduce((sum, value) => sum + value.quantity, 0) +
            quantity >
            20
        )
          return current;
        return current.map((value) =>
          value.lineId === lineId ? { ...value, quantity } : value,
        );
      });
    },
    [removeItem],
  );
  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo(() => {
    const pricing = cartPricing(items);
    return {
      items,
      addItems,
      removeItem,
      setQuantity,
      clearCart,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: pricing.totalAmount / 100,
      pricing,
    };
  }, [items, addItems, removeItem, setQuantity, clearCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
