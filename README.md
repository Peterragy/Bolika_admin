# Bolika — dashboard

The staff dashboard for **Bolika**: follow the business, run the catalogue and handle orders.
Built like the John France dashboard (Vite, no framework) and talks to the
[Bolika server](https://github.com/Peterragy/Bolika_server) (AdonisJS + Prisma + MongoDB),
in Bolika's plum, aubergine, violet and blush with the BOLIKA wordmark and BB monogram, in English and Arabic.

## Who sees what

Every staff member signs in with their own email and password. Their **role** decides the pages they
get, and the server enforces the same rules on every request (whichever app sends it).

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

## The server

Everything (catalogue, gift sets, discounts, staff, orders, stock, Paymob payments) lives on the Bolika
server, shared with the mobile app. This dashboard only calls its `/api/admin/...` addresses with the
signed-in staff member's token (`src/api.js`).

## Run it locally

Start the server first (see its README: Docker MongoDB, `npm run db:demo`, `npm run dev` on port 3340), then:

```bash
npm install
npm run dev             # http://localhost:5191
```

`.env.local` points at the server (this is the default, so it's optional):

```
VITE_API_URL=http://localhost:3340
```

The server's demo seed has **local-only** staff accounts (password `bolika-local-only`):
`admin@bolika.local`, `inventory@bolika.local`, `sales@bolika.local`.

## Go live

1. Put the server online and create the first admin there:
   `node ace bolika:seed --admin you@bolika.com`. Everyone else is added from the **Team** page.
2. **Vercel:** import this repo (framework Vite, build `npm run build`, output `dist`) and set
   `VITE_API_URL` to the server's address.
3. Add the dashboard's address to the server's `CORS_ORIGIN`.

No secret keys live in this app; the server decides what each account can do.

---

Designed & developed by **TP3** · Third Party Solutions
