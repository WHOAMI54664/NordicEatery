"use client";
import { MenuCatalog } from "@/components/menu/MenuCatalog";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import type { Product } from "@/types/product";
import type { PublicGroup } from "@/lib/group-orders/model";
import type { CartAddition } from "@/lib/cart";
export function GroupOrderMenu({
  products,
  me,
  editing,
  busy,
  catalogError,
  addItems,
  content,
}: {
  locale: string;
  products: Product[];
  me: PublicGroup["members"][number] | undefined;
  editing: boolean;
  busy: boolean;
  catalogError: boolean;
  content: Record<string, string>;
  addItems: (additions: CartAddition[]) => Promise<boolean>;
}) {
  const t = useEditableTranslations("groupOrder");
  if (catalogError)
    return (
      <p role="alert" className="mb-4 text-paprika">
        {t.edit("errors.unavailable")}
      </p>
    );
  return (
    <MenuCatalog
      products={products}
      content={content}
      groupSelection={() => ({
        disabled: busy || !editing || (me?.items.length || 0) >= 30,
        freeLines: 30 - (me?.items.length || 0),
        remainingFor: (id) =>
          20 -
          (me?.items
            .filter((item) => item.productId === id)
            .reduce((sum, item) => sum + item.quantity, 0) || 0),
        add: addItems,
      })}
    />
  );
}
