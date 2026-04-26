import type { Product } from "@/types/product";

export const menuItems: Product[] = [
  {
    id: "maczanka-classic",
    name: "Maczanka Krakowska",
    subtitle: "Signature pork sandwich",
    description:
      "Slow-cooked pork, rich gravy sauce, pickles and onion in a toasted bun.",
    price: 129,
    category: "maczanka",
    badge: "Signature",
    isPopular: true
  },
  {
    id: "maczanka-extra",
    name: "Maczanka Extra Meat",
    subtitle: "Double pork, double flavor",
    description:
      "Extra slow-cooked pork, warm gravy, pickles, onion and toasted bun.",
    price: 159,
    category: "maczanka",
    badge: "Hungry choice"
  },
  {
    id: "knysza-classic",
    name: "Knysza Classic",
    subtitle: "Polish street food bun",
    description:
      "Warm bun filled with fresh vegetables, crispy onion and homemade sauce.",
    price: 119,
    category: "knysza",
    badge: "Vegetarian",
    isPopular: true
  },
  {
    id: "knysza-chicken",
    name: "Knysza Chicken",
    subtitle: "Chicken, vegetables, garlic sauce",
    description:
      "Chicken, fresh vegetables, crispy onion and creamy garlic sauce.",
    price: 139,
    category: "knysza",
    isPopular: true
  },
  {
    id: "knysza-pork",
    name: "Knysza Pork",
    subtitle: "Pork, vegetables, house sauce",
    description:
      "Juicy pork, fresh vegetables, crispy onion and Mike’s house sauce.",
    price: 145,
    category: "knysza"
  },
  {
    id: "fries",
    name: "Crispy Fries",
    subtitle: "Side",
    description: "Golden crispy fries with salt and optional garlic sauce.",
    price: 49,
    category: "sides"
  },
  {
    id: "garlic-sauce",
    name: "Extra Garlic Sauce",
    subtitle: "Homemade sauce",
    description: "Creamy homemade garlic sauce for extra flavor.",
    price: 15,
    category: "sides"
  },
  {
    id: "drink",
    name: "Soft Drink",
    subtitle: "Cold drink",
    description: "Choose your cold drink at pickup or delivery.",
    price: 29,
    category: "drinks"
  }
];

export const featuredItems = menuItems.filter((item) => item.isPopular);
