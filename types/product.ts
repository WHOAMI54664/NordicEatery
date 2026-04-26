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
};
