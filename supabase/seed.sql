-- Local development data: the Bolika catalogue from the mobile app, the three gift sets,
-- a running discount, promo codes, sample orders over the last month, and one staff
-- account per role. `supabase db reset` loads this; it never runs on the live project.
--
-- Local staff logins (password for all three: bolika-local-only)
--   admin@bolika.local      → admin
--   inventory@bolika.local  → inventory manager
--   sales@bolika.local      → sales manager

insert into public.categories (id, label, label_ar, sort) values
  ('lips', 'Lips', 'الشفاه', 0),
  ('face', 'Face', 'الوجه', 1),
  ('eyes', 'Eyes & lashes', 'العيون والرموش', 2),
  ('nails', 'Nails', 'الأظافر', 3),
  ('skincare', 'Skincare', 'العناية بالبشرة', 4);

insert into public.products (id, category_id, name, name_ar, subtitle, subtitle_ar, size, brand, image, price, stock, description, bestseller, sort) values
  ('00000000-0000-4000-8000-000000000001', 'lips', 'Velvet Petal', 'فيلفت بيتال', 'Satin lip colour', 'لون شفاه ساتان', '3.5 g', 'Bolika', '/catalog/velvet-petal.jpg', 1150, null,
   'A whisper of colour. A veil of comfort. Luminous, petal-soft lips with every swipe.', true, 0),
  ('00000000-0000-4000-8000-000000000002', 'skincare', 'Luminous Veil', 'لومينوس فيل', 'Radiance serum', 'سيروم الإشراق', '30 ml', 'Bolika', '/catalog/luminous-veil.jpg', 2050, null,
   'A weightless serum that leaves skin dewy, even and quietly lit from within.', false, 1),
  ('00000000-0000-4000-8000-000000000003', 'face', 'Silk Bloom', 'سيلك بلوم', 'Soft-focus blush', 'بلاشر بلمسة ناعمة', '6 g', 'Bolika', '/catalog/silk-bloom.jpg', 1390, null,
   'A silken powder that melts into skin for a natural, lit-from-within flush.', false, 2),
  ('00000000-0000-4000-8000-000000000004', 'face', 'Radiant Skin', 'راديانت سكين', 'Weightless skin tint', 'تينت خفيف للبشرة', '30 ml', 'Bolika', '/catalog/radiant-skin.jpg', 1650, null,
   'Sheer, breathable coverage that evens tone and lets your skin show through.', false, 3),
  ('00000000-0000-4000-8000-000000000005', 'lips', 'Plum Lacquer', 'بلم لاكيه', 'High-shine lip lacquer', 'لاكيه شفاه لامع', '5 ml', 'Bolika', '/catalog/plum-lacquer.jpg', 990, null,
   'Our signature plum, in a glossy lacquer with a velvet applicator.', true, 4),
  ('00000000-0000-4000-8000-000000000006', 'eyes', 'Feather Lash Strips', 'رموش فيذر', 'Reusable silk lashes', 'رموش حرير قابلة لإعادة الاستخدام', '2 pairs', 'Bolika', '/catalog/feather-lash.jpg', 450, null,
   'Featherlight silk lashes on a flexible band. Wear them up to 20 times.', false, 5),
  ('00000000-0000-4000-8000-000000000007', 'nails', 'Gel-Shine Polish', 'طلاء جل شاين', 'Chrome-shine nail colour', 'طلاء أظافر بلمعة الكروم', '15 ml', 'Bolika', '/catalog/gel-shine.jpg', 380, null,
   'Salon gel shine without the lamp. Ten days of chip-resistant colour.', false, 6),
  ('00000000-0000-4000-8000-000000000008', 'face', 'Glow Compact', 'جلو كومباكت', 'Pressed highlighter', 'هايلايتر مضغوط', '9 g', 'Maybelline New York', '/catalog/glow-compact.jpg', 720, 4,
   'A finely milled highlighter for a soft, candlelit glow. Imported and authentic.', false, 7);

insert into public.product_variants (product_id, kind, label, label_ar, color, price, stock, sort) values
  ('00000000-0000-4000-8000-000000000001', 'shade', '01 · Bare Petal', null, '#9B4F62', null, 24, 0),
  ('00000000-0000-4000-8000-000000000001', 'shade', '02 · Dusk Rose', null, '#BA7D7B', null, 18, 1),
  ('00000000-0000-4000-8000-000000000001', 'shade', '03 · Rosewood', null, '#834555', null, 31, 2),
  ('00000000-0000-4000-8000-000000000001', 'shade', '04 · Velvet Plum', null, '#6A334D', null, 3, 3),
  ('00000000-0000-4000-8000-000000000001', 'shade', '05 · Terracotta Kiss', null, '#B86667', null, 12, 4),
  ('00000000-0000-4000-8000-000000000001', 'shade', '06 · Cinnamon', null, '#9A6054', null, 0, 5),
  ('00000000-0000-4000-8000-000000000002', 'size', 'Travel · 10 ml', 'حجم السفر · 10 مل', null, 1150, 20, 0),
  ('00000000-0000-4000-8000-000000000002', 'size', 'Full size · 30 ml', 'الحجم الكامل · 30 مل', null, null, 26, 1),
  ('00000000-0000-4000-8000-000000000003', 'shade', '01 · Petal', null, '#D9A3A8', null, 14, 0),
  ('00000000-0000-4000-8000-000000000003', 'shade', '02 · Mauve Silk', null, '#B98195', null, 9, 1),
  ('00000000-0000-4000-8000-000000000003', 'shade', '03 · Apricot', null, '#DE9C84', null, 11, 2),
  ('00000000-0000-4000-8000-000000000003', 'shade', '04 · Berry Flush', null, '#A25470', null, 7, 3),
  ('00000000-0000-4000-8000-000000000004', 'shade', 'F1 · Porcelain', null, '#F1D9C7', null, 6, 0),
  ('00000000-0000-4000-8000-000000000004', 'shade', 'L1 · Sand', null, '#E2BC9C', null, 10, 1),
  ('00000000-0000-4000-8000-000000000004', 'shade', 'M1 · Almond', null, '#C69571', null, 15, 2),
  ('00000000-0000-4000-8000-000000000004', 'shade', 'M2 · Caramel', null, '#B98762', null, 13, 3),
  ('00000000-0000-4000-8000-000000000004', 'shade', 'T1 · Toffee', null, '#9C6A48', null, 8, 4),
  ('00000000-0000-4000-8000-000000000004', 'shade', 'D1 · Mocha', null, '#6E4630', null, 5, 5),
  ('00000000-0000-4000-8000-000000000005', 'shade', '01 · Plum Noir', null, '#4A1442', null, 22, 0),
  ('00000000-0000-4000-8000-000000000005', 'shade', '02 · Black Cherry', null, '#5C1230', null, 16, 1),
  ('00000000-0000-4000-8000-000000000005', 'shade', '03 · Glazed Rose', null, '#B36A80', null, 2, 2),
  ('00000000-0000-4000-8000-000000000006', 'size', 'Short · 8–10 mm', 'قصيرة', null, null, 40, 0),
  ('00000000-0000-4000-8000-000000000006', 'size', 'Medium · 11–13 mm', 'متوسطة', null, null, 55, 1),
  ('00000000-0000-4000-8000-000000000006', 'size', 'Long · 14–16 mm', 'طويلة', null, 500, 30, 2),
  ('00000000-0000-4000-8000-000000000007', 'shade', '01 · Chrome Plum', null, '#4A1E55', null, 35, 0),
  ('00000000-0000-4000-8000-000000000007', 'shade', '02 · Lilac Mirror', null, '#8E5BA3', null, 28, 1),
  ('00000000-0000-4000-8000-000000000007', 'shade', '03 · Rose Chrome', null, '#B9788F', null, 19, 2),
  ('00000000-0000-4000-8000-000000000007', 'shade', '04 · Blush Pearl', null, '#D8B3B8', null, 24, 3),
  ('00000000-0000-4000-8000-000000000007', 'shade', '05 · Cherry Gloss', null, '#9E1F3A', null, 4, 4);

insert into public.bundles (id, name, name_ar, description, image, price, stock, sort) values
  ('00000000-0000-4000-9000-000000000001', 'The Lash Edit', 'طقم الرموش',
   'Two lash styles and a curated eyeshadow palette, in the signature plum Bolika box.', '/catalog/set-lash.jpg', 1950, 12, 0),
  ('00000000-0000-4000-9000-000000000002', 'The Nail Edit', 'طقم الأظافر',
   'Four chrome-shine polishes, nestled in our monogram tissue.', '/catalog/set-nail.jpg', 1350, 15, 1),
  ('00000000-0000-4000-9000-000000000003', 'The Glow Set', 'طقم الإشراق',
   'A velvet lip palette and a precision brush, carried home in the Bolika bag.', '/catalog/set-glow.jpg', 2250, 8, 2);

insert into public.bundle_items (bundle_id, product_id, variant_id, qty)
select '00000000-0000-4000-9000-000000000001'::uuid, '00000000-0000-4000-8000-000000000006'::uuid, id, 1 from public.product_variants
  where product_id = '00000000-0000-4000-8000-000000000006' and label like 'Short%' or (product_id = '00000000-0000-4000-8000-000000000006' and label like 'Medium%');
insert into public.bundle_items (bundle_id, product_id, variant_id, qty)
select '00000000-0000-4000-9000-000000000002'::uuid, product_id, id, 1 from public.product_variants
  where product_id = '00000000-0000-4000-8000-000000000007' and sort < 4;
insert into public.bundle_items (bundle_id, product_id, variant_id, qty)
select '00000000-0000-4000-9000-000000000003'::uuid, product_id, id, 1 from public.product_variants
  where product_id = '00000000-0000-4000-8000-000000000001' and label like '03%'
union all
select '00000000-0000-4000-9000-000000000003'::uuid, product_id, id, 1 from public.product_variants
  where product_id = '00000000-0000-4000-8000-000000000005' and label like '01%';

insert into public.discounts (product_id, percent, starts_at, ends_at) values
  ('00000000-0000-4000-8000-000000000007', 15, now() - interval '3 days', now() + interval '11 days');
insert into public.discounts (bundle_id, percent, starts_at, ends_at) values
  ('00000000-0000-4000-9000-000000000002', 10, now() + interval '5 days', now() + interval '19 days');

insert into public.promo_codes (code, percent, min_order, max_uses, uses, ends_at) values
  ('BOLIKA10', 10, 0, null, 0, null),
  ('WELCOME15', 15, 500, 1000, 0, now() + interval '60 days');

/* ---------- local staff accounts ---------- */
do $$
declare
  u record;
begin
  for u in select * from (values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@bolika.local', 'Nour (Admin)', 'admin'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'inventory@bolika.local', 'Mariam (Inventory)', 'inventory'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'sales@bolika.local', 'Youssef (Sales)', 'sales')
  ) as t(id, email, name, role) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            crypt('bolika-local-only', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
    update public.profiles set role = u.role where id = u.id;
  end loop;
end $$;

/* ---------- sample orders over the last 30 days ---------- */
do $$
declare
  names text[] := array['Salma Adel','Nour Hassan','Farida Mostafa','Habiba Ali','Malak Samir','Jana Tarek','Laila Fathy','Mariam Nabil','Rana Khaled','Yasmin Ezz'];
  cities text[] := array['Cairo','Giza','El Sharqia','New Capital','Madinaty','Alexandria'];
  statuses public.order_status[] := array['delivered','delivered','delivered','shipped','preparing','confirmed','pending','cancelled'];
  v uuid[]; items jsonb; o record; i int; n int; st public.order_status; when_ timestamptz;
begin
  select array_agg(id) into v from public.product_variants where coalesce(stock, 99) >= 14;
  for i in 1..34 loop
    items := '[]'::jsonb;
    for n in 1..(1 + (i % 3)) loop
      items := items || jsonb_build_array(jsonb_build_object(
        'product_id', (select product_id from public.product_variants where id = v[1 + ((i * 7 + n * 5) % array_length(v, 1))]),
        'variant_id', v[1 + ((i * 7 + n * 5) % array_length(v, 1))], 'qty', 1 + (i + n) % 2));
    end loop;
    if i % 5 = 0 then items := items || '[{"bundle_id":"00000000-0000-4000-9000-000000000001","qty":1}]'::jsonb; end if;
    if i % 7 = 0 then items := items || '[{"bundle_id":"00000000-0000-4000-9000-000000000003","qty":1}]'::jsonb; end if;
    select * into o from public.place_order(items,
      jsonb_build_object('name', names[1 + i % 10], 'phone', '010' || lpad((12345600 + i * 37)::text, 8, '0'),
                         'city', cities[1 + i % 6], 'address', (10 + i) || ' Palm Street, Building ' || (i % 9 + 1),
                         'email', lower(replace(names[1 + i % 10], ' ', '.')) || '@example.com'),
      jsonb_build_object('channel', case when i % 4 = 0 then 'website' else 'app' end,
                         'promo_code', case when i % 6 = 0 then 'BOLIKA10' end,
                         'gift_wrap', i % 3 = 0));
    when_ := now() - ((34 - i) * interval '21 hours') - (i % 5) * interval '37 minutes';
    st := case when i > 31 then 'pending'::public.order_status else statuses[1 + i % 8] end;
    update public.orders set created_at = when_, updated_at = when_,
      payment_status = case when st = 'cancelled' then 'failed' when st = 'pending' and i % 2 = 0 then 'pending' else 'paid' end,
      payment_ref = case when st <> 'cancelled' then 'PMB-' || (480000 + i * 113) end
      where id = o.id;
    update public.order_events set created_at = when_ where order_id = o.id;
    if st <> 'pending' then
      perform set_config('bolika.status_note', case when st = 'shipped' then 'With the courier' else '' end, true);
      update public.orders set status = st where id = o.id;
      update public.order_events set created_at = when_ + interval '4 hours' where order_id = o.id and status = st;
    end if;
  end loop;
end $$;
