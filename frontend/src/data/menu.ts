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

