-- Seed products, variants, images; storage policies for media bucket; hero image setting

create policy "Staff manage media files" on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_staff(auth.uid()))
  with check (bucket_id = 'media' and public.is_staff(auth.uid()));
create policy "Public read media files" on storage.objects for select to anon
  using (bucket_id = 'media');

update public.site_settings set value = jsonb_set(value, '{image_url}', '"/__l5e/assets-v1/dc68c02a-37c3-4980-a338-3080917dac5b/hero-forest.jpg"') where key = 'hero';

with cols as (select id, slug from public.collections),
cats as (select id, slug from public.categories)
insert into public.products (name, slug, description, price_cents, compare_at_price_cents, sku, category_id, collection_id, is_featured, is_new, tags)
select * from (
  select 'Cloud Nine Hoodie','cloud-nine-hoodie','Heavyweight charcoal hoodie with a terracotta mountain mark. Brushed fleece interior, relaxed fit.',5800,6800,'FYN-GD-H01',(select id from cats where slug='apparel'),(select id from cols where slug='good-day'),true,false,'{hoodie,featured}'::text[]
  union all select 'Trailhead Tee','trailhead-tee','Cream heavyweight tee with a forest green pine graphic. Garment-dyed, pre-shrunk.',3400,3800,'FYN-RT-T01',(select id from cats where slug='apparel'),(select id from cols where slug='roots'),true,false,'{tee,featured}'::text[]
  union all select 'Anchor Hoodie','anchor-hoodie','Deep navy hoodie with a white anchor emblem. Built for cold mornings on the lake.',6200,null,'FYN-FA-H01',(select id from cats where slug='apparel'),(select id from cols where slug='faith'),true,false,'{hoodie,featured}'::text[]
  union all select 'Black Tee','black-tee','Everyday black tee with a clean cut. Soft combed cotton.',3200,3800,'FYN-SC-T01',(select id from cats where slug='apparel'),(select id from cols where slug='street-culture'),true,false,'{tee}'::text[]
  union all select 'Golden Tee','golden-tee','Mustard tee with a retro sun graphic. A Forever series staple.',3600,null,'FYN-FV-T01',(select id from cats where slug='apparel'),(select id from cols where slug='forever'),true,false,'{tee}'::text[]
  union all select '''98 Hoodie','98-hoodie','Forest green crewneck with a cream mountainline graphic. Nostalgia series.',6000,null,'FYN-NO-H01',(select id from cats where slug='apparel'),(select id from cols where slug='nostalgia'),true,true,'{hoodie,new}'::text[]
  union all select 'Sawtooth Sticker','sawtooth-sticker','Die-cut vinyl sticker of the Sawtooth range. Weatherproof.',350,null,'FYN-ST-01',(select id from cats where slug='stickers'),(select id from cols where slug='local-love'),false,false,'{sticker}'::text[]
  union all select 'Pine Die-Cut Sticker','pine-die-cut-sticker','Die-cut pine tree vinyl sticker. Weatherproof.',300,null,'FYN-ST-02',(select id from cats where slug='stickers'),(select id from cols where slug='local-love'),false,false,'{sticker}'::text[]
  union all select 'Good Day Sun Sticker','good-day-sun-sticker','Retro sun vinyl sticker from the Good Day series.',250,null,'FYN-ST-03',(select id from cats where slug='stickers'),(select id from cols where slug='good-day'),false,false,'{sticker}'::text[]
  union all select 'FYN Logo Sticker','fyn-logo-sticker','The classic FYN compass mark, die-cut vinyl.',400,null,'FYN-ST-04',(select id from cats where slug='stickers'),(select id from cols where slug='roots'),false,false,'{sticker}'::text[]
  union all select 'Bald Eagle Sticker','bald-eagle-sticker','Bald eagle in flight, die-cut vinyl. Weatherproof.',350,null,'FYN-ST-05',(select id from cats where slug='stickers'),(select id from cols where slug='nostalgia'),false,false,'{sticker}'::text[]
) s(name, slug, description, price_cents, compare_at_price_cents, sku, category_id, collection_id, is_featured, is_new, tags);

insert into public.product_images (product_id, url, alt, position)
select p.id, v.url, p.name, 0 from public.products p
join (values
  ('cloud-nine-hoodie','/__l5e/assets-v1/2c0312c5-e2d5-445b-b37f-fd7db4ba73ea/product-hoodie.jpg'),
  ('trailhead-tee','/__l5e/assets-v1/34930f65-d649-490c-8c4a-183df0044ca7/product-tee.jpg'),
  ('anchor-hoodie','/__l5e/assets-v1/7ccd2c0e-9855-4f00-95a7-56e483e6378c/product-anchor-hoodie.jpg'),
  ('black-tee','/__l5e/assets-v1/34930f65-d649-490c-8c4a-183df0044ca7/product-tee.jpg'),
  ('golden-tee','/__l5e/assets-v1/a26988d8-a191-41b1-bdf5-99c20f1566c6/product-golden-tee.jpg'),
  ('98-hoodie','/__l5e/assets-v1/a343ceab-a6f5-408e-86a5-c4210482b8c7/product-forest-crew.jpg'),
  ('sawtooth-sticker','/__l5e/assets-v1/6c4e6cd6-fcea-4279-989d-df23a5b275b7/product-stickers.jpg'),
  ('pine-die-cut-sticker','/__l5e/assets-v1/6c4e6cd6-fcea-4279-989d-df23a5b275b7/product-stickers.jpg'),
  ('good-day-sun-sticker','/__l5e/assets-v1/6c4e6cd6-fcea-4279-989d-df23a5b275b7/product-stickers.jpg'),
  ('fyn-logo-sticker','/__l5e/assets-v1/6c4e6cd6-fcea-4279-989d-df23a5b275b7/product-stickers.jpg'),
  ('bald-eagle-sticker','/__l5e/assets-v1/6c4e6cd6-fcea-4279-989d-df23a5b275b7/product-stickers.jpg')
) v(slug, url) on v.slug = p.slug;

insert into public.product_variants (product_id, name, sku, stock, options, position)
select p.id, s.size, p.sku || '-' || s.size, case when p.slug = 'golden-tee' then 0 else 12 end, jsonb_build_object('size', s.size), s.pos
from public.products p
cross join (values ('S',1),('M',2),('L',3),('XL',4),('XXL',5)) s(size, pos)
where p.category_id = (select id from public.categories where slug = 'apparel');

insert into public.product_variants (product_id, name, sku, stock, options, position)
select p.id, 'One Size', p.sku || '-OS', 100, '{}'::jsonb, 0
from public.products p
where p.category_id = (select id from public.categories where slug = 'stickers');