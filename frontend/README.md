# Joy's Pizza — Restaurant Ordering UI (React + Vite + TypeScript)

Front-end for a USA pizza restaurant: browse the menu, add to cart, check out with
Apple Pay / credit / debit card, track orders, and an admin kitchen dashboard.
No UI libraries — just React, Vite, TypeScript and plain CSS.

## Run it
The website talks to the ASP.NET Core API in `../backend` — start that first (see the root README).
```bash
npm install
npm run dev        # http://localhost:5173  (API expected at VITE_API_URL, default http://localhost:5080)
npm run build      # type-check + production build to /dist
```

## Demo accounts (seeded on first load)
| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| Admin    | admin@joyspizza.local   | admin123  |
| Customer | jamie@example.com      | password  |

Payments use the Stripe Payment Element (card, Apple Pay, Google Pay). Test card: `4242 4242 4242 4242`.

## Pages (hash routes)
| Route          | What it is |
|----------------|------------|
| `#/`           | Nav bar, hero carousel with "Order Now", Our Specials, category tiles, contact info |
| `#/menu`       | Full menu: Pizza (S/M/L sizes), Pasta, Burgers, Appetizers, Salads, Desserts, Drinks + search |
| `#/checkout`   | Delivery/pickup, address, tip, Apple Pay / credit / debit (Luhn + expiry validation) |
| `#/order/:id`  | Confirmation + live status tracker |
| `#/orders`     | Customer's orders (in progress + past, reorder) |
| `#/admin`      | Kitchen dashboard: stats, status filters, advance status, cancel |
| `#/admin/menu` | Menu manager: add / edit / delete items, mark available or unavailable |
| `#/login`, `#/signup`, `#/location`, `#/contact` | |

## Project structure
```
src/
  components/   Navbar, HeroCarousel, MenuCard, CartDrawer, ContactSection, OrderBits, Icons, SmartImage
  context/      AuthContext, CartContext, MenuContext, OrdersContext (API data + polling)
  data/         menu.ts (items, prices, photos, hero slides), restaurant.ts (name, address, hours, tax)
  lib/          api.ts (typed API client), router.tsx (tiny hash router), storage.ts (cart + token)
  pages/        Home, Menu, Checkout, Auth, Orders, Admin, Location/Contact
  styles/       index.css
```

## Admin menu management
Sign in as admin → **Dashboard → Menu items** (or avatar menu → *Manage menu*).
- **Add item:** name, category, description, single price *or* multiple sizes, photo (URL or upload),
  tags (Vegetarian, Vegan, Spicy, Gluten-free, Best seller, New + custom), Chef's special, availability.
- **Available / Unavailable switch** on every row. Unavailable items disappear from the menu,
  specials and home page right away (customers' menus refresh every minute and on tab focus). Switch it back on to show it again.
- If an item goes unavailable while it's in a customer's cart, checkout flags it and the API rejects the
  order until it's removed. Reorder skips unavailable items.
- **Edit / Delete** existing items; *Reset to sample menu* restores the defaults.

## Customizing
- **Branding / address / hours / tax rate / delivery fee:** `src/data/restaurant.ts`
- **Starting menu:** seeded by the API (`backend/JoysPizza.Api/Data/SeedMenu.cs`); admins manage it in the app
- **Colors & fonts:** CSS variables at the top of `src/styles/index.css`
- **Logo:** `public/logo.svg`

## Backend
Menu, accounts and orders are stored by the API in PostgreSQL. See the root `README.md` for the API reference, Stripe setup and deployment.
