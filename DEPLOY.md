# Deploying Joy's Pizza — GitHub + Supabase + Render + Vercel

| Part | Service | Folder |
|---|---|---|
| Code | GitHub (private repo) | whole project |
| Database (PostgreSQL) | Supabase | — |
| API (.NET, Docker) | Render — Web Service | `backend/JoysPizza.Api` |
| Website (Vite/React) | Vercel | `frontend` |

Do the steps in order. Keep a text file open to paste the values you collect (marked **SAVE**).

---

## Step 1 — Put the code on GitHub
1. Install Git: https://git-scm.com/download/win and create a GitHub account.
2. On github.com click **New repository** → name `joys-pizza` → **Private** → don't add a README → **Create**.
3. In PowerShell:
   ```powershell
   cd C:\Users\RYZEN\Downloads\joys-pizza\joys-pizza
   git init
   git add .
   git commit -m "Joy's Pizza - first deploy"
   git branch -M main
   git remote add origin https://github.com/<your-github-name>/joys-pizza.git
   git push -u origin main
   ```
4. Refresh the GitHub page — you should see `backend`, `frontend`, `README.md` (no `node_modules`, `bin`, `obj`; `.gitignore` excludes them).

## Step 2 — Create the database (Supabase)
1. https://supabase.com → **New project**.
   - Name: `joys-pizza` · **Database password**: click *Generate* → **SAVE** it.
   - Region: **East US (North Virginia)** (close to Render's Virginia region and to New York).
2. Wait ~2 minutes for the project to start.
3. Click **Connect** (top of the project) → choose **Session pooler** → copy the details. Build this
   connection string (one line) and **SAVE** it:
   ```
   Host=aws-0-us-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=Require
   ```
   - Use the **Session pooler** (port 5432). Not "Direct connection" (may be unreachable from Render)
     and not "Transaction pooler" (port 6543 — doesn't work well with .NET's Npgsql).
   - You don't create any tables — the API creates them and loads the menu on first start.

## Step 3 — Get Stripe keys
The API refuses to start in Production without Stripe, so do this before Render.
1. https://dashboard.stripe.com → make sure **Test mode** is on.
2. **Developers → API keys** → **SAVE** the *Publishable key* (`pk_test_…`) and *Secret key* (`sk_test_…`).

## Step 4 — Make a secret signing key
In PowerShell (works on Windows PowerShell 5 and 7):
```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```
**SAVE** the output — this is `Jwt__Key`. Never put it in the code.

## Step 5 — Deploy the API (Render)
1. https://render.com → sign in with GitHub → **New → Web Service** → pick the `joys-pizza` repo.
2. Settings:
   - **Name:** `joys-pizza-api` (your API URL becomes `https://joys-pizza-api.onrender.com`)
   - **Root Directory:** `backend/JoysPizza.Api`
   - **Language/Runtime:** **Docker** (it finds the `Dockerfile`)
   - **Region:** **Virginia (US East)**
   - **Instance type:** **Starter ($7/mo)** recommended. *Free* works for testing but sleeps after 15 minutes
     and takes ~1 minute to wake up.
3. **Environment Variables** → add each:

   | Key | Value |
   |---|---|
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `PORT` | `8080` |
   | `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true` |
   | `ConnectionStrings__Default` | the Supabase string from Step 2 |
   | `Jwt__Key` | the key from Step 4 |
   | `Seed__AdminEmail` | the email you'll use to sign in as admin |
   | `Seed__AdminPassword` | a strong password (stored hashed; used only to create the first admin) |
   | `Stripe__SecretKey` | `sk_test_…` |
   | `Stripe__PublishableKey` | `pk_test_…` |
   | `Cors__Origins__0` | `https://joys-pizza.vercel.app` for now — you'll fix it in Step 6 |

4. **Advanced → Health Check Path:** `/health` → **Create Web Service**.
5. The first build takes ~5–10 minutes. In **Logs** you should see *Created database tables*,
   *Seeded sample menu* and *Created admin account*.
6. Test in the browser: `https://joys-pizza-api.onrender.com/api/menu` → you should see the menu as JSON.

## Step 6 — Deploy the website (Vercel)
1. https://vercel.com → sign in with GitHub → **Add New → Project** → import `joys-pizza`.
2. **Root Directory:** `frontend` · Framework: **Vite** (auto) · Build: `npm run build` · Output: `dist`.
3. **Environment Variables:** `VITE_API_URL` = `https://joys-pizza-api.onrender.com` (no trailing slash).
4. **Deploy.** Copy the site address Vercel gives you (e.g. `https://joys-pizza-xyz.vercel.app`).
5. Back in **Render → Environment**, set `Cors__Origins__0` to that **exact** address (https, no trailing slash)
   → **Save** (Render redeploys). Without this the site shows "Can't reach the server".

> Vercel's free Hobby plan is meant for non-commercial use; for the live business site use Vercel Pro
> or move the `frontend` folder to Cloudflare Pages / Netlify (same settings).

## Step 7 — Stripe webhook
1. Stripe → **Developers → Webhooks → Add endpoint**.
2. URL: `https://joys-pizza-api.onrender.com/api/payments/webhook` · Event: `payment_intent.succeeded`.
3. Copy the **Signing secret** (`whsec_…`) → Render → add env var `Stripe__WebhookSecret` → Save.

## Step 8 — Test everything
1. Open your Vercel URL → **Sign In** with `Seed__AdminEmail` / `Seed__AdminPassword` → **Dashboard**.
2. **Menu items:** set your real prices, descriptions and photos. Use **image links** (paste a URL) —
   files uploaded with *Upload photo* are deleted whenever Render restarts or redeploys.
3. In a private browser window: create a customer account → order → pay with `4242 4242 4242 4242`,
   any future date, any CVC/ZIP → the order appears on the admin **Orders** dashboard.
4. Try the deal: 2 Large Cheese Pizzas + 1 Medium → the Medium shows FREE.

## Step 9 — Go live
1. **Domain:** buy one (e.g. `joyspizzahempstead.com`). Vercel → Project → **Settings → Domains** → add it
   (follow the DNS instructions). Optional: Render → **Settings → Custom Domains** → `api.yourdomain.com`.
   Then update `VITE_API_URL` (Vercel, then **Redeploy**) and `Cors__Origins__0` (Render) to the new addresses.
2. **Real payments:** Stripe → turn **Test mode off** → put the `pk_live_…` / `sk_live_…` keys in Render,
   create a new live webhook (Step 7) and update `Stripe__WebhookSecret`.
3. **Apple Pay:** Stripe → Settings → **Payment method domains** → add your domain.
4. Place one real small order and refund it from the dashboard (Cancel → refund).

## Updating the site later
```powershell
git add .
git commit -m "Update menu text"
git push
```
Vercel and Render rebuild automatically after every push.

## Good to know
- **Passwords** are stored only as salted PBKDF2 hashes (ASP.NET Core Identity) — never in plain text.
- **Admin account** is created once, from `Seed__AdminEmail/Password`, only if no admin exists.
- **Supabase free plan** pauses a project after 1 week with no activity and has no automatic backups —
  upgrade to Pro when the shop depends on it.
- **Secrets** live only in Render/Vercel environment variables, never in GitHub.
