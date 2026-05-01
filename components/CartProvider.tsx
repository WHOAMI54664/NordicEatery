"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Product } from "@/types/product";

export type CartItem = Product & {
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "mikes-food-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(STORAGE_KEY);

      if (savedCart) {
        setItems(JSON.parse(savedCart) as CartItem[]);
      }
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
      // Ignore localStorage write errors.
    }
  }, [items, hasLoaded]);

  function addItem(product: Product) {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
            item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });
  }

  function removeItem(productId: string) {
    setItems((currentItems) =>
        currentItems.filter((item) => item.id !== productId)
    );
  }

  function setQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((currentItems) =>
        currentItems.map((item) =>
            item.id === productId ? { ...item, quantity } : item
        )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const totalPriceRaw = items.reduce(
        (sum, item) => sum + Number(item.price || 0) * item.quantity,
        0
    );

    const totalPrice = Math.round(totalPriceRaw * 100) / 100;

    return {
      items,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      totalItems,
      totalPrice
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}