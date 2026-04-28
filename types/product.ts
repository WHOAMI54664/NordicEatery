export type ProductCategory = "maczanka" | "knysza" | "sides" | "drinks";

export type Product = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  category: ProductCategory;
  badge?: string;
  isPopular?: boolean;
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
