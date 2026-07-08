// Known categories keep autocomplete, but custom categories (added from the
// product form) are also allowed, so the type stays a string at its core.
export type ProductCategory =
  | "maczanka"
  | "knysza"
  | "sides"
  | "drinks"
  | (string & {});

export type Product = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  category: ProductCategory;
  badge?: string;
  isPopular?: boolean;
  image_url?: string | null;
 name_sv?: string | null;
 name_pl?: string | null;
 name_ru?: string | null;

 subtitle_sv?: string | null;
 subtitle_pl?: string | null;
 subtitle_ru?: string | null;

 description_sv?: string | null;
 description_pl?: string | null;
 description_ru?: string | null;
};
