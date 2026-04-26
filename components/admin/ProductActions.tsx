"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type ProductActionsProps = {
  productId: string;
  isAvailable: boolean;
};

export function ProductActions({ productId, isAvailable }: ProductActionsProps) {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  async function toggleAvailable() {
    await supabase
      .from("products")
      .update({ is_available: !isAvailable })
      .eq("id", productId);

    router.refresh();
  }

  async function deleteProduct() {
    const confirmed = window.confirm("Delete this product permanently?");
    if (!confirmed) return;

    await supabase.from("products").delete().eq("id", productId);

    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={toggleAvailable}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-dark/5 text-dark/60 transition hover:bg-paprika/10 hover:text-paprika"
        title={isAvailable ? "Hide product" : "Show product"}
      >
        {isAvailable ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>

      <button
        type="button"
        onClick={deleteProduct}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-paprika/10 text-paprika transition hover:bg-paprika hover:text-white"
        title="Delete product"
      >
        <Minus size={20} />
      </button>
    </div>
  );
}