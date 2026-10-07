# Joy's Pizza — Online Ordering (React + ASP.NET Core)

**Joy's Pizza** · 376 Fulton Ave., Hempstead NY 11550 · (516) 385-4221
*Handcrafted perfection in every slice — Made with devotion · Serve with joy*

| Part | Stack | Folder |
|------|-------|--------|
| Website | React 19 · Vite · TypeScript · Stripe Payment Element | `frontend/` |
| API | ASP.NET Core Web API (.NET 10) · EF Core · PostgreSQL · JWT · Stripe | `backend/JoysPizza.Api/` |

```
joys-pizza/
├─ docker-compose.yml          PostgreSQL (+ optional API container)
├─ backend/
│  ├─ JoysPizza.slnx
│  └─ JoysPizza.Api/
│     ├─ Controllers/          Auth, Menu, Uploads, Orders, AdminOrders, Payments (config + Stripe webhook)
│     ├─ Services/             OrderService (server-side pricing), StripePaymentService, TokenService
│     ├─ Data/                 AppDbContext, SeedMenu, DbInitializer
│     ├─ Domain/               Entities + enums
│     ├─ Contracts/            Request/response DTOs (match frontend/src/types.ts)
│     └─ JoysPizza.Api.http   Ready-made requests for VS / VS Code / Rider
└─ frontend/
   └─ src/lib/api.ts           Typed API client used by the whole app
```

## Branding

| What | Where |
|---|---|
| Logo (transparent, from the business card) | `frontend/public/logo.webp`, `logo.png` |
| Favicon / app icon | `frontend/public/favicon.png`, `apple-touch-icon.png` |
| Name, address, phone, tagline, **hours** | `frontend/src/data/restaurant.ts` |
| Colors (black · antique gold · flame red) & fonts (Cinzel, Fraunces, Inter) | top of `frontend/src/styles/index.css` |
| Home page slider text & photos | `HERO_SLIDES` in `frontend/src/data/menu.ts` |
| Delivery fee, free-delivery threshold (no sales tax is charged) | `backend/JoysPizza.Api/appsettings.json` → `Restaurant` (mirror in `restaurant.ts`) |
| Deal: Buy 2 Large Cheese Pizzas, Get 1 Medium FREE | `backend/JoysPizza.Api/Services/Promotions.cs` (charged) + `frontend/src/lib/promo.ts` (cart preview) |
| Pizza sizes: Medium 14" · 8 slices, Large 16" · 16 slices | `SeedMenu.cs` (`PizzaSizes`) + `pizzaSizes` in `frontend/src/data/menu.ts` (admin form default) |
| Starting menu | `backend/JoysPizza.Api/Data/SeedMenu.cs` (then manage it in the admin “Menu items” page) |

> **Before launch:** the opening hours, delivery radius ($40 free delivery / $3.99 fee / ~3 miles), the
> sample menu & prices, and the stock food photos are placeholders — replace them with the real ones.

## Roles

| Role | Can do |
|---|---|
| **Admin** | Everything a Store Manager can, plus **Dashboard → Staff**: create Store Manager accounts, give an existing account Store Manager access, remove that access. Also *Reset to sample menu*. |
| **Store Manager** | Order dashboard (update status, cancel/refund) and menu management (add / edit / hide / delete items, upload photos). Cannot create staff accounts. |
| **Customer** | Browse, order, pay, track own orders. No access to the dashboard (the API returns 403). |

The first Admin comes from `Seed:AdminEmail` / `Seed:AdminPassword`. Access changes apply immediately — the API
re-checks the role on every request and signs out anyone whose role changed.

## Menu photos
Items **with a photo** show as cards (photo + text). Items **without a photo** show as a compact list row.
Description is optional.

## Deal: Buy 2 Large Cheese Pizzas, Get 1 Medium FREE

For every **2 Large Cheese Pizzas** in an order, **1 Medium Cheese Pizza** is free.
The customer adds the Medium to the cart (the cart shows an **Add free pizza** button once they qualify,
and "Add 1 more Large…" when they're one short). The API prices the free Medium at $0 and shows it as its
own "FREE" line on the order and the kitchen ticket. The deal is tied to the menu item with id `pz-cheese`
and to size names starting with "Large" / "Medium" — keep those if you edit the item in the admin.

> **Existing database:** the new sizes and the Cheese Pizza item are part of the sample menu. On a database
> created before this change, sign in as admin → Menu items → **Reset to sample menu** (or `docker compose down -v`).

## 1. Run it locally

**Prerequisites:** [.NET 10 SDK](https://dotnet.microsoft.com/download), Node 20+, and Docker (or your own PostgreSQL 14+).

```bash
# 1) Database
docker compose up -d db

# 2) API  →  http://localhost:5080   (interactive docs: http://localhost:5080/scalar/v1)
cd backend/JoysPizza.Api
dotnet run

# 3) Website  →  http://localhost:5173
cd frontend
npm install
npm run dev
```

On first start the API creates the tables and seeds the sample menu, an **admin**
(`admin@joyspizza.local` / `admin123` — change both before going live) and a **demo customer** (`jamie@example.com` / `password`).

Without Stripe keys the API runs in **demo payment mode** (Development only): checkout works end to end
and every payment "succeeds", so you can try the whole flow before setting up Stripe.

> Using your own PostgreSQL? Change `ConnectionStrings:Default` in `appsettings.json`
> (or `dotnet user-secrets set "ConnectionStrings:Default" "Host=...;Database=...;Username=...;Password=..."`).

## 2. Turn on real payments (Stripe)

1. Create a Stripe account and copy the **test** keys (Dashboard → Developers → API keys).
2. Store them for the API (kept out of source control):
   ```bash
   cd backend/JoysPizza.Api
   dotnet user-secrets set "Stripe:SecretKey" "sk_test_..."
   dotnet user-secrets set "Stripe:PublishableKey" "pk_test_..."
   ```
3. Forward webhooks while developing (install the [Stripe CLI](https://docs.stripe.com/stripe-cli)):
   ```bash
   stripe listen --forward-to localhost:5080/api/payments/webhook
   dotnet user-secrets set "Stripe:WebhookSecret" "whsec_..."   # printed by the command above
   ```
4. Restart the API. Checkout now shows the Stripe Payment Element with **credit/debit card**,
   **Apple Pay** and **Google Pay** only (`PaymentMethodTypes = ["card"]` in `PaymentService.cs` —
   no bank, Cash App Pay, Amazon Pay, Klarna or Link).

Test cards: `4242 4242 4242 4242` (Visa credit), `4000 0566 5566 5556` (Visa debit),
`5200 8282 8282 8210` (Mastercard debit) — any future date, any CVC, any ZIP.

**Apple Pay** appears in Safari on Apple devices once the site runs on HTTPS and the domain is
registered in Stripe (Settings → Payment method domains). Google Pay shows in Chrome with a saved card.

### How a payment works
1. `POST /api/orders` — the API re-prices the cart from the database (client prices are ignored),
   applies the Buy 2 Large Cheese / Get 1 Medium FREE deal, adds delivery / tip (no tax), saves the order as **Awaiting payment** and creates a Stripe PaymentIntent.
2. The browser confirms the payment with Stripe (card data never touches this API).
3. `POST /api/orders/{id}/confirm-payment` — the API asks Stripe whether the PaymentIntent succeeded and
   checks the amount. Only then the order becomes **Received** and appears on the kitchen dashboard.
   The `payment_intent.succeeded` webhook does the same thing in case the customer closes the tab.
4. Cancelling a paid order from the dashboard issues a Stripe refund automatically.

## 3. API reference

All responses are JSON (camelCase). *staff* = Admin or Store Manager. Errors use RFC 7807 problem details: `{ "title", "detail", "errors"? }`.
Auth: `Authorization: Bearer <token>` from login/register.

| Method | Route | Who | Purpose |
|---|---|---|---|
| GET | `/api/config` | anyone | Fees, payment mode, Stripe publishable key |
| POST | `/api/auth/register` | anyone | Create customer account → `{ token, expiresAt, user }` |
| POST | `/api/auth/login` | anyone | Sign in (rate-limited: 10/min per IP) |
| GET | `/api/auth/me` | signed in | Current user |
| GET | `/api/menu` | anyone | Available items. `?includeUnavailable=true` for admins |
| GET | `/api/menu/{id}` | anyone | One item |
| POST | `/api/menu` | staff | Add item (name, category, description, price or sizes, image, tags, special, available) |
| PUT | `/api/menu/{id}` | staff | Edit item |
| PATCH | `/api/menu/{id}/availability` | staff | `{ "available": false }` hides it from the website |
| DELETE | `/api/menu/{id}` | staff | Delete item (past orders keep their own copy) |
| POST | `/api/menu/reset` | admin | Replace menu with the sample menu |
| POST | `/api/uploads` | staff | Upload a menu photo (multipart `file`, JPEG/PNG/WebP/GIF ≤ 5 MB) → `{ url }` |
| POST | `/api/orders` | signed in | Place order → `{ order, payment: { mode, clientSecret, publishableKey } }` |
| POST | `/api/orders/{id}/confirm-payment` | owner | Verify payment with Stripe, send to kitchen |
| GET | `/api/orders/mine` | signed in | My orders |
| GET | `/api/orders/{id}` | owner / admin | One order (with live status) |
| GET | `/api/admin/orders?days=3` | staff | Kitchen feed (paid orders) |
| GET | `/api/admin/staff` | admin | List admins and store managers |
| POST | `/api/admin/staff` | admin | Create a Store Manager `{ name, email, phone?, password }` |
| POST | `/api/admin/staff/grant` | admin | Make an existing account a Store Manager `{ email }` |
| DELETE | `/api/admin/staff/{id}` | admin | Remove Store Manager access (account becomes a customer) |
| PATCH | `/api/admin/orders/{id}/status` | staff | `{ "status": "Preparing" }` · `Cancelled` refunds a paid order |
| POST | `/api/payments/webhook` | Stripe | `payment_intent.succeeded` |
| GET | `/health` | anyone | Health check |

Order status flow: `Awaiting payment → Received → Preparing → Ready → Out for delivery → Completed`
(pickup orders skip "Out for delivery"; any unpaid/active order can be `Cancelled`).

## 4. Configuration (`backend/JoysPizza.Api/appsettings.json`)

| Key | Meaning |
|---|---|
| `ConnectionStrings:Default` | PostgreSQL connection string |
| `Jwt:Key` | Token signing key, **32+ random characters** — set via env var / secrets in production |
| `Jwt:ExpiresHours` | Sign-in lifetime (default 12) |
| `Cors:Origins` | Website origins allowed to call the API (default `http://localhost:5173`) |
| `Restaurant:DeliveryFee / FreeDeliveryOver` | Pricing rules used for every order (no sales tax) |
| `Stripe:SecretKey / PublishableKey / WebhookSecret` | Stripe credentials |
| `Seed:AdminEmail / AdminPassword` | First admin account (created only if no admin exists) |
| `Seed:DemoCustomer` | Creates the demo customer (Development only by default) |

Environment variables use `__` for nesting, e.g. `Jwt__Key`, `Stripe__SecretKey`.

The website reads `VITE_API_URL` (see `frontend/.env.example`, default `http://localhost:5080`).

## 5. Going to production

- **Secrets:** set `Jwt__Key`, `Stripe__SecretKey`, `Stripe__PublishableKey` (live keys), `Stripe__WebhookSecret`,
  `Seed__AdminPassword` and the connection string as environment variables. The API refuses to start outside
  Development without Stripe keys.
- **Database migrations:** the API creates the schema automatically when the project has no migrations.
  For a production database, switch to EF migrations before go-live:
  ```bash
  dotnet tool install --global dotnet-ef
  cd backend/JoysPizza.Api
  dotnet ef migrations add InitialCreate
  ```
  On the next start the API applies migrations instead (use a fresh database — one created without
  migrations can't be migrated).
- **Webhook:** add `https://your-api-domain/api/payments/webhook` in Stripe (event `payment_intent.succeeded`).
- **CORS:** set `Cors__Origins__0=https://your-site-domain`.
- **Uploads** are stored in `wwwroot/uploads`; mount it as a persistent volume (see `docker-compose.yml`)
  or swap `UploadsController` for Azure Blob / S3.
- **Frontend:** `VITE_API_URL=https://your-api-domain npm run build` and host `frontend/dist` on any static host.
