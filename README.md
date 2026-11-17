# Bolika — dashboard

The staff dashboard for **Bolika**: follow the business, run the catalogue and handle orders.
Built the same way as the John France dashboard (Vite + [Supabase](https://supabase.com), no framework),
in Bolika's plum, aubergine, violet and blush with the BOLIKA wordmark and BB monogram, in English and Arabic.

## Who sees what

Every staff member signs in with their own email and password. Their **role** decides the pages they
get, and the database enforces the same rules on every request (whichever app sends it).

| Page | Admin | Inventory manager | Sales manager |
| --- | :-: | :-: | :-: |
| **Overview** — revenue, orders, average order, customers, revenue per day, orders by status and channel, best sellers, low-stock alert | ✓ | | |
| **Orders** — filter by status, search by number / name / phone; open one to change its status (with a note), record its payment | ✓ | | ✓ |
| **Products** — add / edit / hide, photo upload, price, stock, shades and sizes each with their own price and stock, low-stock filter | ✓ | ✓ | |
| **Gift sets** — products sold together in a Bolika box at one price, with what they'd cost separately | ✓ | ✓ | |
| **Discounts** — % off products or gift sets between two dates, and promo codes (e.g. `BOLIKA10`) | ✓ | ✓ | |
| **Team** — give someone a role, change it, take it away | ✓ | | |
| **Settings** — delivery fee, free-delivery threshold, Bolika Circle points | ✓ | | |

Cancelling an order puts its items back in stock; un-cancelling takes them again. Selling a gift set
takes the set's stock and the stock of every product in it.

## The database

`supabase/migrations/20261118000000_bolika.sql` is the shared Bolika backend: catalogue
(categories, products, shades/sizes, gift sets), discounts and promo codes, staff roles, orders with
Paymob payment fields, stock, and the security rules. `place_order()` prices a bag on the server
(sale prices, promo code, points, delivery) and takes stock; the mobile app and the website will call it
when they move from their local catalogue to this database.

## Run it locally

Needs Docker Desktop running.

```bash
npm install
npx supabase start      # local database with the schema and supabase/seed.sql
npm run dev             # http://localhost:5191
```

Put the local `API URL` and `anon key` from `npx supabase status` into `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=...
```

The seed loads the app's catalogue, three gift sets, a running discount, two promo codes, ~30 sample
orders and **local-only** staff accounts (password `bolika-local-only`):
`admin@bolika.local`, `inventory@bolika.local`, `sales@bolika.local`.
The seed never runs on the live project. `npx supabase db reset` starts the local data over.

## Go live

1. Create a Supabase project. Run the migration on it (`npx supabase link` then `npx supabase db push`,
   or paste the SQL into the SQL editor).
2. Create the first admin: Supabase → Authentication → Users → **Add user** (email + password,
   *Auto confirm*), then in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@bolika.com';
   ```

   Everyone after that: add the user the same way, then give them a role on the **Team** page.
3. **Vercel:** import this repo (framework Vite, build `npm run build`, output `dist`), add
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and, if product photos are saved as paths on the
   website, `VITE_SITE_URL`. Add the dashboard's URL to Supabase → Authentication → URL Configuration.

The anon key is public by design; the database rules decide what each account can do. Never put the
**service_role** key in this app.

---

Designed & developed by **TP3** · Third Party Solutions
