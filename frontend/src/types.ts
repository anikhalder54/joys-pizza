export type Category =
  | 'Pizza'
  | 'Pasta'
  | 'Burgers'
  | 'Appetizers'
  | 'Salads'
  | 'Desserts'
  | 'Drinks';

export interface SizeOption {
  label: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  tags?: string[];
  special?: boolean;
  sizes?: SizeOption[];
  /** false = hidden from the public menu (e.g. out of stock). Missing = available. */
  available?: boolean;
  updatedAt?: string;
}

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  image: string;
  size?: string;
  unitPrice: number;
  qty: number;
}

export type Role = 'customer' | 'admin';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: PublicUser;
}

export type PaymentMethod = 'apple_pay' | 'google_pay' | 'credit' | 'debit' | 'card' | 'other';
export type FulfillmentType = 'delivery' | 'pickup';
export type OrderStatus =
  | 'Awaiting payment'
  | 'Received'
  | 'Preparing'
  | 'Ready'
  | 'Out for delivery'
  | 'Completed'
  | 'Cancelled';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  items: CartLine[];
  subtotal: number;
  deliveryFee: number;
  tip: number;
  total: number;
  fulfillment: FulfillmentType;
  address?: string;
  notes?: string;
  /** Missing until the payment is confirmed. */
  payment?: { method: PaymentMethod; last4?: string; brand?: string };
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  refunded?: boolean;
}

/** Body for POST /api/menu and PUT /api/menu/:id */
export interface MenuItemInput {
  name: string;
  description: string;
  price: number;
  category: Category;
  image?: string;
  tags?: string[];
  special: boolean;
  sizes?: SizeOption[];
  available: boolean;
}

export interface CreateOrderRequest {
  items: { menuItemId: string; size?: string; quantity: number }[];
  fulfillment: FulfillmentType;
  customerName: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  tipPercent: number;
}

export interface PaymentSession {
  /** 'stripe' → show the Stripe Payment Element. 'demo' → API has no Stripe keys (dev only). */
  mode: 'stripe' | 'demo';
  clientSecret?: string;
  publishableKey?: string;
}

export interface CreateOrderResponse {
  order: Order;
  payment: PaymentSession;
}

export interface PublicConfig {
  deliveryFee: number;
  freeDeliveryOver: number;
  currency: string;
  paymentMode: 'stripe' | 'demo';
  stripePublishableKey?: string;
}
