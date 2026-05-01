import Link from "next/link";
import { redirect } from "next/navigation";
import {
    ArrowRight,
    ChefHat,
    Eye,
    EyeOff,
    Layers3,
    Package,
    Plus,
    Utensils
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { canManageProducts } from "@/lib/auth/roles";

type MenuPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

type ProductRow = {
    id: string;
    name: string | null;
    price: number | null;
    category: string | null;
    is_available: boolean | null;
    track_stock: boolean | null;
    stock_quantity: number | null;
};

type MenuCategory = {
    id: string;
    title: string;
    description: string;
};

const menuCategories: MenuCategory[] = [
    {
        id: "maczanka",
        title: "Maczanka",
        description: "Signature Polish street food and warm main dishes."
    },
    {
        id: "knysza",
        title: "Knysza",
        description: "Fresh filled bread with meat, vegetables and sauces."
    },
    {
        id: "fries",
        title: "Fries",
        description: "Fries, extras, sauces and smaller add-ons."
    },
    {
        id: "drinks",
        title: "Drinks",
        description: "Soft drinks and cold beverages."
    }
];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function getCategoryStats(products: ProductRow[], categoryId: string) {
    const categoryProducts = products.filter(
        (product) => product.category === categoryId
    );

    const active = categoryProducts.filter(
        (product) => product.is_available !== false
    );

    const hidden = categoryProducts.filter(
        (product) => product.is_available === false
    );

    const lowStock = categoryProducts.filter((product) => {
        if (!product.track_stock) return false;

        return Number(product.stock_quantity || 0) <= 5;
    });

    const totalPrice = categoryProducts.reduce(
        (sum, product) => sum + Number(product.price || 0),
        0
    );

    const averagePrice =
        categoryProducts.length > 0 ? totalPrice / categoryProducts.length : 0;

    return {
        total: categoryProducts.length,
        active: active.length,
        hidden: hidden.length,
        lowStock: lowStock.length,
        averagePrice
    };
}

export default async function AdminMenuPage({ params }: MenuPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/menu`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!canManageProducts(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    const { data: products } = await supabase
        .from("products")
        .select("id, name, price, category, is_available, track_stock, stock_quantity")
        .order("sort_order", { ascending: true });

    const productList = (products || []) as ProductRow[];

    const totalProducts = productList.length;
    const activeProducts = productList.filter(
        (product) => product.is_available !== false
    ).length;
    const hiddenProducts = productList.filter(
        (product) => product.is_available === false
    ).length;
    const lowStockProducts = productList.filter((product) => {
        if (!product.track_stock) return false;

        return Number(product.stock_quantity || 0) <= 5;
    }).length;

    return (
        <AdminShell>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                                <Layers3 className="h-3.5 w-3.5" />
                                Menu management
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                Menu
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                Organize your restaurant menu by categories, availability,
                                stock and product performance.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                href={`/${locale}/admin/products`}
                                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/80 px-5 text-sm font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                            >
                                <ChefHat className="h-4 w-4" />
                                View products
                            </Link>

                            <Link
                                href={`/${locale}/admin/products/new`}
                                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E]"
                            >
                                <Plus className="h-4 w-4" />
                                Add product
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    Total products
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                                    {totalProducts}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                                <Utensils className="h-5 w-5 text-[#C7192E]" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    Active products
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-emerald-700">
                                    {activeProducts}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                                <Eye className="h-5 w-5 text-emerald-700" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    Hidden products
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                                    {hiddenProducts}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EADDCF] bg-[#FFF3E2]">
                                <EyeOff className="h-5 w-5 text-[#7B6A61]" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    Low stock
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#C7192E]">
                                    {lowStockProducts}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F6A21A]/25 bg-[#F6A21A]/15">
                                <Package className="h-5 w-5 text-[#A96800]" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                    {menuCategories.map((category) => {
                        const stats = getCategoryStats(productList, category.id);

                        return (
                            <article
                                key={category.id}
                                className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white"
                            >
                                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#E51B23]/8 blur-3xl" />

                                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                                            <Utensils className="h-5 w-5 text-[#C7192E]" />
                                        </div>

                                        <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[#25120F]">
                                            {category.title}
                                        </h2>

                                        <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[#7B6A61]">
                                            {category.description}
                                        </p>
                                    </div>

                                    <Link
                                        href={`/${locale}/admin/products`}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/80 px-4 text-sm font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                                    >
                                        Manage
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>

                                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#A39388]">
                                            Items
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-[#25120F]">
                                            {stats.total}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#A39388]">
                                            Active
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-emerald-700">
                                            {stats.active}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#A39388]">
                                            Low stock
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-[#C7192E]">
                                            {stats.lowStock}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#A39388]">
                                            Avg price
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-[#25120F]">
                                            {formatCurrency(stats.averagePrice)}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            </div>
        </AdminShell>
    );
}