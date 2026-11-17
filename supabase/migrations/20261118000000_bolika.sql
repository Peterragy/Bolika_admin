-- Bolika: catalogue, gift sets, discounts, staff roles and orders.
--
-- Shared by the website, the mobile app and the admin dashboard.
-- Everyone can read the catalogue. Staff work from the dashboard with one of
-- three roles (profiles.role):
--   admin      — everything: sales overview, orders, catalogue, team, settings
--   inventory  — products, prices, stock, gift sets (bundles), discounts, promo codes
--   sales      — orders: see them and update their status
-- The database enforces this on every request, whichever app sends it.
-- Orders are only created through place_order(), which prices the cart on the
-- server, so a shopper can't change what they pay.

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/*  Staff and customers                                                */
/* ------------------------------------------------------------------ */
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'inventory', 'sales')),
  created_at timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$ select public.my_role() = 'admin'; $$;
-- may change the catalogue: products, prices, stock, gift sets, discounts
create or replace function public.can_stock() returns boolean
language sql stable security definer set search_path = public as $$ select public.my_role() in ('admin', 'inventory'); $$;
-- may see and handle orders
create or replace function public.can_sell() returns boolean
language sql stable security definer set search_path = public as $$ select public.my_role() in ('admin', 'sales'); $$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$ select public.my_role() in ('admin', 'inventory', 'sales'); $$;

-- every new account gets a profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- only an admin can change roles (the SQL editor may set the first admin)
create or replace function public.guard_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  if new.role is distinct from old.role and old.id = auth.uid() and old.role = 'admin' then
    raise exception 'You can''t change your own role';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role();

/** Admin: give an existing account a dashboard role (or 'customer' to take access away). */
create or replace function public.set_staff_role(p_email text, p_role text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_role not in ('customer', 'admin', 'inventory', 'sales') then raise exception 'Unknown role %', p_role; end if;
  update public.profiles set role = p_role where email = lower(trim(p_email)) returning * into r;
  if not found then
    raise exception 'No account with the email %. Create it first in Supabase → Authentication → Users.', trim(p_email);
  end if;
  return r;
end $$;

/* ------------------------------------------------------------------ */
/*  Catalogue                                                          */
/* ------------------------------------------------------------------ */
create table public.categories (
  id text primary key,                         -- 'lips', 'face', 'eyes', 'nails', 'skincare'
  label text not null,
  label_ar text,
  sort int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id text references public.categories on update cascade on delete set null,
  name text not null,
  name_ar text,
  subtitle text,                               -- 'Satin lip colour'
  subtitle_ar text,
  size text not null default '',               -- '3.5 g'
  brand text not null default 'Bolika',        -- or a partner house: 'Maybelline New York', 'L''Oréal Paris'
  sku text,
  image text,                                  -- a storage URL or a path on the website
  price numeric(10, 2) check (price >= 0),     -- null = coming soon
  stock int check (stock >= 0),                -- null = not tracked; ignored when the product has options
  low_stock int not null default 5,            -- shown as "low" at or below this
  description text,
  description_ar text,
  bestseller boolean not null default false,
  active boolean not null default true,        -- hidden from the shop when false
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products (category_id);

-- options of one product: shades (with a swatch colour) or sizes, each with its own price and stock
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  kind text not null default 'shade' check (kind in ('shade', 'size')),
  label text not null,                         -- '03 · Rosewood', 'Travel · 1.5 g'
  label_ar text,
  color text,                                  -- swatch, for shades
  price numeric(10, 2) check (price >= 0),     -- null = the product's price
  stock int check (stock >= 0),                -- null = not tracked
  sku text,
  image text,
  sort int not null default 0
);
create index on public.product_variants (product_id);

-- gift sets: a fixed price for several products in a Bolika box
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  description text,
  description_ar text,
  image text,
  price numeric(10, 2) not null check (price >= 0),
  stock int check (stock >= 0),                -- null = as many as the products allow
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles on delete cascade,
  product_id uuid not null references public.products on delete cascade,
  variant_id uuid references public.product_variants on delete set null,
  qty int not null default 1 check (qty > 0)
);
create index on public.bundle_items (bundle_id);

-- a percentage off a product or a gift set for a period
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products on delete cascade,
  bundle_id uuid references public.bundles on delete cascade,
  percent numeric(5, 2) not null check (percent > 0 and percent < 100),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((product_id is null) <> (bundle_id is null))
);
create index on public.discounts (product_id, starts_at, ends_at);
create index on public.discounts (bundle_id, starts_at, ends_at);

-- codes typed at checkout, e.g. BOLIKA10
create table public.promo_codes (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,24}$'),
  percent numeric(5, 2) not null check (percent > 0 and percent < 100),
  min_order numeric(10, 2) not null default 0,
  max_uses int check (max_uses > 0),           -- null = unlimited
  uses int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                         -- null = no end
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.settings (
  id boolean primary key default true check (id),  -- a single row
  shipping_fee numeric(10, 2) not null default 75,
  free_shipping_over numeric(10, 2) default 1500,  -- null = never free
  egp_per_point numeric(10, 2) not null default 10, -- Bolika Circle: 1 point per EGP 10
  redeem_points int not null default 100,          -- …redeemed in blocks of 100 points
  redeem_value numeric(10, 2) not null default 50, -- …each worth EGP 50
  welcome_points int not null default 100
);
insert into public.settings default values;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger bundles_touch before update on public.bundles for each row execute function public.touch_updated_at();

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */
create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  user_id uuid references auth.users on delete set null,
  channel text not null default 'app' check (channel in ('app', 'website', 'boutique')),
  status public.order_status not null default 'pending',
  payment_method text not null default 'paymob' check (payment_method in ('paymob', 'cod')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_ref text,                            -- Paymob transaction id
  subtotal numeric(10, 2) not null,            -- before discounts
  discount_total numeric(10, 2) not null default 0,
  promo_code text,
  points_used int not null default 0,
  points_discount numeric(10, 2) not null default 0,
  shipping numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  gift_wrap boolean not null default false,
  customer_name text not null,
  phone text not null,
  email text,
  city text not null,
  address text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (user_id, created_at desc);
create index on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  product_id uuid references public.products on delete set null,
  variant_id uuid references public.product_variants on delete set null,
  bundle_id uuid references public.bundles on delete set null,
  name text not null,                          -- copied so the order reads the same if the product changes
  variant_label text,
  size text,
  image text,
  unit_price numeric(10, 2) not null,          -- what was charged per item
  original_price numeric(10, 2) not null,      -- before the discount
  discount_percent numeric(5, 2),
  qty int not null check (qty > 0 and qty <= 99),
  line_total numeric(10, 2) not null
);
create index on public.order_items (order_id);

-- the status history, newest first in the dashboard and the app
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders on delete cascade,
  status public.order_status not null,
  note text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index on public.order_events (order_id, created_at);

create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status, note, created_by)
    values (new.id, new.status, nullif(current_setting('bolika.status_note', true), ''), auth.uid());
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;
create trigger orders_log_insert after insert on public.orders for each row execute function public.log_order_status();
create trigger orders_log_update before update on public.orders for each row execute function public.log_order_status();

/* ------------------------------------------------------------------ */
/*  Stock                                                              */
/* ------------------------------------------------------------------ */
-- take items off the shelf (or put them back with p_sign = 1); untracked stock (null) is left alone
create or replace function public.move_stock(p_product uuid, p_variant uuid, p_bundle uuid, p_qty int, p_sign int)
returns void language plpgsql security definer set search_path = public as $$
declare bi record; have int; what text;
begin
  if p_bundle is not null then
    select stock, name into have, what from public.bundles where id = p_bundle for update;
    if p_sign < 0 and have is not null and have < p_qty then raise exception 'Only % left of %', have, what; end if;
    update public.bundles set stock = stock + p_sign * p_qty where id = p_bundle and stock is not null;
    for bi in select * from public.bundle_items where bundle_id = p_bundle loop
      perform public.move_stock(bi.product_id, bi.variant_id, null, bi.qty * p_qty, p_sign);
    end loop;
  elsif p_variant is not null then
    select v.stock, p.name || ' · ' || v.label into have, what
    from public.product_variants v join public.products p on p.id = v.product_id where v.id = p_variant for update of v;
    if p_sign < 0 and have is not null and have < p_qty then raise exception 'Only % left of %', have, what; end if;
    update public.product_variants set stock = stock + p_sign * p_qty where id = p_variant and stock is not null;
  elsif p_product is not null then
    select stock, name into have, what from public.products where id = p_product for update;
    if p_sign < 0 and have is not null and have < p_qty then raise exception 'Only % left of %', have, what; end if;
    update public.products set stock = stock + p_sign * p_qty where id = p_product and stock is not null;
  end if;
end $$;
revoke all on function public.move_stock(uuid, uuid, uuid, int, int) from public, anon, authenticated;

-- a cancelled order puts its items back on the shelf (and takes them off again if un-cancelled)
create or replace function public.restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare it record; sign_ int;
begin
  if new.status = old.status then return new; end if;
  if new.status = 'cancelled' then sign_ := 1;
  elsif old.status = 'cancelled' then sign_ := -1;
  else return new; end if;
  for it in select * from public.order_items where order_id = new.id loop
    perform public.move_stock(it.product_id, it.variant_id, it.bundle_id, it.qty, sign_);
  end loop;
  return new;
end $$;
create trigger orders_restock after update of status on public.orders for each row execute function public.restock_on_cancel();

/* ------------------------------------------------------------------ */
/*  Prices                                                             */
/* ------------------------------------------------------------------ */
create or replace function public.active_discount(p_product uuid, p_bundle uuid default null) returns numeric
language sql stable set search_path = public as $$
  select max(percent) from public.discounts
  where (product_id = p_product or bundle_id = p_bundle) and now() >= starts_at and now() < ends_at;
$$;

-- what the shop shows: products with their current discount (if any)
create or replace view public.shop_products with (security_invoker = true) as
  select p.*, d.percent as discount_percent, d.ends_at as discount_ends_at
  from public.products p
  left join lateral (
    select percent, ends_at from public.discounts
    where product_id = p.id and now() >= starts_at and now() < ends_at
    order by percent desc limit 1
  ) d on true;
grant select on public.shop_products to anon, authenticated;

/**
 * Checkout. items: [{ product_id, variant_id?, qty } | { bundle_id, qty }]
 *           customer: { name, phone, city, address, email?, notes? }
 *           options:  { promo_code?, points?, gift_wrap?, channel?, payment_method? }
 * Prices, discounts, promo codes, points and delivery are worked out here, and stock is taken.
 * The order waits as payment_status 'pending' until the Paymob callback marks it paid.
 */
create or replace function public.place_order(items jsonb, customer jsonb, options jsonb default '{}')
returns table (id uuid, number bigint, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_number bigint;
  v_sub numeric := 0; v_net numeric := 0; v_ship numeric; v_promo numeric := 0; v_pts_value numeric := 0;
  v_set public.settings; v_code public.promo_codes;
  it jsonb; p public.products; v public.product_variants; b public.bundles;
  v_qty int; v_base numeric; v_pct numeric; v_unit numeric; v_points int := coalesce((options ->> 'points')::int, 0);
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Your bag is empty'; end if;
  if coalesce(trim(customer ->> 'name'), '') = '' or coalesce(trim(customer ->> 'phone'), '') = ''
     or coalesce(trim(customer ->> 'city'), '') = '' or coalesce(trim(customer ->> 'address'), '') = '' then
    raise exception 'Name, phone, governorate and address are required';
  end if;
  select * into v_set from public.settings limit 1;

  insert into public.orders (user_id, channel, payment_method, subtotal, total, gift_wrap, customer_name, phone, email, city, address, notes)
  values (auth.uid(), coalesce(options ->> 'channel', 'app'), coalesce(options ->> 'payment_method', 'paymob'), 0, 0,
          coalesce((options ->> 'gift_wrap')::boolean, false),
          trim(customer ->> 'name'), trim(customer ->> 'phone'),
          coalesce(nullif(trim(customer ->> 'email'), ''), (select email from auth.users u where u.id = auth.uid())),
          trim(customer ->> 'city'), trim(customer ->> 'address'), nullif(trim(customer ->> 'notes'), ''))
  returning orders.id, orders.number into v_order, v_number;

  for it in select * from jsonb_array_elements(items) loop
    v_qty := (it ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;

    if it ->> 'bundle_id' is not null then
      select * into b from public.bundles where bundles.id = (it ->> 'bundle_id')::uuid and active;
      if not found then raise exception 'A gift set in your bag is no longer available'; end if;
      v_base := ceil(b.price);
      v_pct := public.active_discount(null, b.id);
      v_unit := case when v_pct is null then v_base else ceil(v_base * (100 - v_pct) / 100) end;
      perform public.move_stock(null, null, b.id, v_qty, -1);
      insert into public.order_items (order_id, bundle_id, name, image, unit_price, original_price, discount_percent, qty, line_total)
      values (v_order, b.id, b.name, b.image, v_unit, v_base, v_pct, v_qty, v_unit * v_qty);
    else
      select * into p from public.products where products.id = (it ->> 'product_id')::uuid and active;
      if not found then raise exception 'A product in your bag is no longer available'; end if;
      v := null;
      if it ->> 'variant_id' is not null then
        select * into v from public.product_variants where product_variants.id = (it ->> 'variant_id')::uuid and product_id = p.id;
        if not found then raise exception '% — that option is no longer available', p.name; end if;
      end if;
      v_base := coalesce(v.price, p.price);
      if v_base is null then raise exception '% has no price yet', p.name; end if;
      v_base := ceil(v_base);
      v_pct := public.active_discount(p.id);
      v_unit := case when v_pct is null then v_base else ceil(v_base * (100 - v_pct) / 100) end;
      perform public.move_stock(p.id, v.id, null, v_qty, -1);
      insert into public.order_items (order_id, product_id, variant_id, name, variant_label, size, image,
                                      unit_price, original_price, discount_percent, qty, line_total)
      values (v_order, p.id, v.id, p.name, v.label, p.size, coalesce(v.image, p.image), v_unit, v_base, v_pct, v_qty, v_unit * v_qty);
    end if;
    v_sub := v_sub + v_base * v_qty;
    v_net := v_net + v_unit * v_qty;
  end loop;

  -- promo code on what's left after sale prices
  if nullif(trim(options ->> 'promo_code'), '') is not null then
    select * into v_code from public.promo_codes
    where code = upper(trim(options ->> 'promo_code')) and active and now() >= starts_at and (ends_at is null or now() < ends_at)
      and (max_uses is null or uses < max_uses) for update;
    if not found then raise exception 'That promo code isn''t valid'; end if;
    if v_net < v_code.min_order then raise exception 'That code needs an order of at least EGP %', v_code.min_order; end if;
    v_promo := round(v_net * v_code.percent / 100);
    update public.promo_codes set uses = uses + 1 where code = v_code.code;
  end if;

  -- Bolika Circle points (whole blocks, up to 30% of the order); the app keeps the balance
  if v_points > 0 then
    v_points := least(v_points / v_set.redeem_points * v_set.redeem_points,
                      floor((v_net - v_promo) * 0.3 / v_set.redeem_value)::int * v_set.redeem_points);
    v_pts_value := v_points / v_set.redeem_points * v_set.redeem_value;
  end if;

  v_ship := case when v_set.free_shipping_over is not null and v_net - v_promo >= v_set.free_shipping_over then 0
                 else v_set.shipping_fee end;

  update public.orders
  set subtotal = v_sub, discount_total = v_sub - v_net + v_promo, promo_code = v_code.code,
      points_used = greatest(v_points, 0), points_discount = v_pts_value,
      shipping = v_ship, total = v_net - v_promo - v_pts_value + v_ship
  where orders.id = v_order;

  return query select v_order, v_number, v_net - v_promo - v_pts_value + v_ship;
end $$;
revoke all on function public.place_order(jsonb, jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb, jsonb) to anon, authenticated;

-- admin and sales: change an order's status, with an optional note for the timeline
create or replace function public.set_order_status(p_order uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_sell() then raise exception 'Only admin and sales accounts can update orders'; end if;
  if not exists (select 1 from public.orders where id = p_order) then raise exception 'Order not found'; end if;
  if exists (select 1 from public.orders where id = p_order and status = p_status) then
    if nullif(trim(p_note), '') is not null then
      insert into public.order_events (order_id, status, note, created_by) values (p_order, p_status, trim(p_note), auth.uid());
      update public.orders set updated_at = now() where id = p_order;
    end if;
    return;
  end if;
  perform set_config('bolika.status_note', coalesce(p_note, ''), true);
  update public.orders set status = p_status where id = p_order;
end $$;

-- admin and sales: record the payment outcome (the Paymob webhook does this automatically once set up)
create or replace function public.set_payment_status(p_order uuid, p_status text, p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_sell() then raise exception 'Only admin and sales accounts can update orders'; end if;
  update public.orders set payment_status = p_status, payment_ref = coalesce(p_ref, payment_ref) where id = p_order;
  if not found then raise exception 'Order not found'; end if;
end $$;

/* ------------------------------------------------------------------ */
/*  Sales overview (admin)                                             */
/* ------------------------------------------------------------------ */
create or replace function public.sales_summary(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  with o as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ), sold as (
    select * from o where status <> 'cancelled'
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from sold), 0),
    'paid_revenue', coalesce((select sum(total) from sold where payment_status = 'paid'), 0),
    'orders', (select count(*) from sold),
    'cancelled', (select count(*) from o where status = 'cancelled'),
    'avg_order', coalesce((select round(avg(total), 2) from sold), 0),
    'items', coalesce((select sum(i.qty) from public.order_items i join sold on sold.id = i.order_id), 0),
    'customers', (select count(distinct coalesce(lower(email), right(regexp_replace(phone, '\D', '', 'g'), 10))) from sold),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from o group by status) x), '{}'),
    'by_channel', coalesce((select jsonb_object_agg(channel, n) from (select channel, count(*) n from sold group by channel) x), '{}'),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'revenue', revenue, 'orders', n) order by day)
                        from (select (created_at at time zone 'Africa/Cairo')::date as day, sum(total) revenue, count(*) n
                              from sold group by 1) x), '[]'),
    'top_products', coalesce((select jsonb_agg(t) from (
                        select i.name, coalesce(i.variant_label, i.size, '') as size, sum(i.qty) as qty, sum(i.line_total) as revenue
                        from public.order_items i join sold on sold.id = i.order_id
                        group by i.name, coalesce(i.variant_label, i.size, '') order by sum(i.line_total) desc limit 8) t), '[]'),
    'low_stock', (select count(*) from public.products p where p.active and p.stock is not null and p.stock <= p.low_stock
                    and not exists (select 1 from public.product_variants v where v.product_id = p.id))
                 + (select count(*) from public.product_variants v join public.products p on p.id = v.product_id
                    where p.active and v.stock is not null and v.stock <= p.low_stock)
  ) into r;
  return r;
end $$;

/* ------------------------------------------------------------------ */
/*  Row-level security                                                 */
/* ------------------------------------------------------------------ */
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.discounts enable row level security;
alter table public.promo_codes enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

-- catalogue: anyone reads what's on sale, staff read everything; admin + inventory write
create policy "read categories" on public.categories for select using (true);
create policy "read products" on public.products for select using (active or public.is_staff());
create policy "read variants" on public.product_variants for select using (true);
create policy "read bundles" on public.bundles for select using (active or public.is_staff());
create policy "read bundle items" on public.bundle_items for select using (true);
create policy "read discounts" on public.discounts for select using (true);
create policy "read settings" on public.settings for select using (true);
create policy "staff read promo codes" on public.promo_codes for select using (public.can_stock());

create policy "stock writes categories" on public.categories for all using (public.can_stock()) with check (public.can_stock());
create policy "stock writes products" on public.products for all using (public.can_stock()) with check (public.can_stock());
create policy "stock writes variants" on public.product_variants for all using (public.can_stock()) with check (public.can_stock());
create policy "stock writes bundles" on public.bundles for all using (public.can_stock()) with check (public.can_stock());
create policy "stock writes bundle items" on public.bundle_items for all using (public.can_stock()) with check (public.can_stock());
create policy "stock writes discounts" on public.discounts for all using (public.can_stock()) with check (public.can_stock());
create policy "stock writes promo codes" on public.promo_codes for all using (public.can_stock()) with check (public.can_stock());
create policy "admin writes settings" on public.settings for update using (public.is_admin()) with check (public.is_admin());

-- profiles: your own; admin sees and changes all (roles through set_staff_role)
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- orders: your own; admin + sales see all and change them through set_order_status()
create policy "read orders" on public.orders for select using (user_id = auth.uid() or public.can_sell());
create policy "read order items" on public.order_items for select using (
  public.can_sell() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "read order events" on public.order_events for select using (
  public.can_sell() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admin deletes orders" on public.orders for delete using (public.is_admin());

/* ------------------------------------------------------------------ */
/*  Product photos uploaded from the dashboard                          */
/* ------------------------------------------------------------------ */
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
create policy "anyone views product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "stock uploads product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.can_stock());
create policy "stock changes product images" on storage.objects for update using (bucket_id = 'product-images' and public.can_stock());
create policy "stock deletes product images" on storage.objects for delete using (bucket_id = 'product-images' and public.can_stock());
