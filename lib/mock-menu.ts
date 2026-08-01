import type { MenuItem } from "@/lib/types";

/**
 * Sample data shown when Supabase isn't configured yet (see app/page.tsx).
 * Mirrors supabase/seed.sql so the UI looks the same either way — once a
 * real project is connected this file is no longer read.
 */
export const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: "mock-chicken-rice",
    name: "Chicken Rice",
    description: "Steamed chicken, fragrant rice, chilli and ginger sauce.",
    price: 6.5,
    category: "Mains",
    image: "https://placehold.co/600x400?text=Chicken+Rice",
    available: true,
  },
  {
    id: "mock-nasi-lemak",
    name: "Nasi Lemak",
    description: "Coconut rice, fried anchovies, peanuts, egg and sambal.",
    price: 7.0,
    category: "Mains",
    image: "https://placehold.co/600x400?text=Nasi+Lemak",
    available: true,
  },
  {
    id: "mock-laksa",
    name: "Laksa",
    description: "Spicy coconut noodle soup with prawns and fish cake.",
    price: 7.5,
    category: "Mains",
    image: "https://placehold.co/600x400?text=Laksa",
    available: true,
  },
  {
    id: "mock-char-kway-teow",
    name: "Char Kway Teow",
    description: "Wok-fried flat rice noodles with prawns and egg.",
    price: 7.0,
    category: "Mains",
    image: "https://placehold.co/600x400?text=Char+Kway+Teow",
    available: false,
  },
  {
    id: "mock-kaya-toast",
    name: "Kaya Toast Set",
    description: "Toast with kaya and butter, two soft-boiled eggs.",
    price: 4.5,
    category: "Sides",
    image: "https://placehold.co/600x400?text=Kaya+Toast",
    available: true,
  },
  {
    id: "mock-curry-puff",
    name: "Curry Puff",
    description: "Crisp pastry filled with curried potato and chicken.",
    price: 2.0,
    category: "Sides",
    image: "https://placehold.co/600x400?text=Curry+Puff",
    available: true,
  },
  {
    id: "mock-kopi-o",
    name: "Kopi O",
    description: "Black coffee with sugar.",
    price: 1.8,
    category: "Drinks",
    image: "https://placehold.co/600x400?text=Kopi+O",
    available: true,
  },
  {
    id: "mock-teh-tarik",
    name: "Teh Tarik",
    description: "Pulled milk tea.",
    price: 2.0,
    category: "Drinks",
    image: "https://placehold.co/600x400?text=Teh+Tarik",
    available: true,
  },
  {
    id: "mock-iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Freshly brewed tea with lemon, served over ice.",
    price: 2.2,
    category: "Drinks",
    image: "https://placehold.co/600x400?text=Iced+Lemon+Tea",
    available: true,
  },
  {
    id: "mock-chendol",
    name: "Chendol",
    description: "Shaved ice, coconut milk, gula melaka and jelly.",
    price: 3.5,
    category: "Desserts",
    image: "https://placehold.co/600x400?text=Chendol",
    available: true,
  },
];
