import type { Category, MenuItem } from '../types';

// The menu itself now lives in the API (backend/JoysPizza.Api/Data/SeedMenu.cs).

const img = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

// Pizza sizes. Labels must start with "Medium" / "Large" (the Buy 2 Large, Get 1 Medium deal matches on that).
export const pizzaSizes = (medium: number) => [
  { label: 'Medium 14" · 8 slices', price: medium },
  { label: 'Large 16" · 16 slices', price: +(medium + 5).toFixed(2) },
];

export const TAG_OPTIONS = ['Vegetarian', 'Vegan', 'Spicy', 'Gluten-free', 'Best seller', 'New'];

export const isAvailable = (m: MenuItem) => m.available !== false;

/**
 * Photos for the "Explore the menu" tiles on the home page (online links).
 * Replace any link with your own photo URL whenever you like.
 */
export const CATEGORY_PHOTOS: Record<Category, string> = {
  Pizza: img('1513104890138-7c749659a591', 600),
  Pasta: img('1551183053-bf91a1d81141', 600),
  Burgers: img('1568901346375-23c9450c58cd', 600),
  Appetizers: img('1527477396000-e27163b481c2', 600),
  Salads: img('1512621776951-a57141f2eefd', 600),
  Desserts: img('1571877227200-a0d98ea607e9', 600),
  Drinks: img('1544145945-f90425340c7e', 600),
};

export const CATEGORIES: Category[] = [
  'Pizza',
  'Pasta',
  'Burgers',
  'Appetizers',
  'Salads',
  'Desserts',
  'Drinks',
];

// Slide copy uses only what's on the Joy's Pizza card. Swap the stock photos for your own when you have them.
export const HERO_SLIDES = [
  {
    image: img('1513104890138-7c749659a591', 1800),
    eyebrow: 'OFFER',
    title: 'Buy 2 Large Cheese Pizza, Get 1 Medium FREE',
    text: "Fresh, hot pizza from Joy's Pizza on Fulton Ave. in Hempstead — order online for pickup or delivery.",
  },
  {
    image: img('1513104890138-7c749659a591', 1800),
    eyebrow: 'OFFER',
    title: 'Buy 2 Cheese Slice Pizza, Get 1 SODA FREE',
    text: "Fresh, hot pizza from Joy's Pizza on Fulton Ave. in Hempstead — order online for pickup or delivery.",
  }
];

