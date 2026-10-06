import type { CartLine } from '../types';

/**
 * "Buy 2 Large Cheese Pizzas, Get 1 Medium FREE".
 * For every 2 Large Cheese Pizzas, one Medium Cheese Pizza in the cart is free.
 * This is only the preview shown in the cart/checkout — the API applies the same rule
 * (backend/JoysPizza.Api/Services/Promotions.cs) and its total is what gets charged.
 */
export const PROMO = {
  itemId: 'pz-cheese',
  title: 'Buy 2 Large Cheese Pizzas, Get 1 Medium FREE',
  largesPerFreeMedium: 2,
};

export const isSize = (label: string | undefined, size: 'Medium' | 'Large') =>
  !!label && label.toLowerCase().startsWith(size.toLowerCase());

export interface PromoResult {
  /** Free mediums earned by the Large pizzas in the cart. */
  earned: number;
  /** Free mediums actually applied (limited by Mediums in the cart). */
  freeCount: number;
  /** Dollar amount taken off. */
  discount: number;
  /** Earned but not yet added to the cart. */
  unclaimed: number;
  /** Large Cheese Pizzas needed to unlock the next free Medium (0 when none are in the cart). */
  largesToNext: number;
}

export function applyPromo(lines: CartLine[]): PromoResult {
  const cheese = lines.filter((l) => l.itemId === PROMO.itemId);
  const largeQty = cheese.filter((l) => isSize(l.size, 'Large')).reduce((s, l) => s + l.qty, 0);
  const medium = cheese.find((l) => isSize(l.size, 'Medium'));
  const earned = Math.floor(largeQty / PROMO.largesPerFreeMedium);
  const freeCount = Math.min(earned, medium?.qty ?? 0);
  const discount = +((medium?.unitPrice ?? 0) * freeCount).toFixed(2);
  const remainder = largeQty % PROMO.largesPerFreeMedium;
  return {
    earned,
    freeCount,
    discount,
    unclaimed: earned - freeCount,
    largesToNext: largeQty > 0 && remainder > 0 ? PROMO.largesPerFreeMedium - remainder : 0,
  };
}
