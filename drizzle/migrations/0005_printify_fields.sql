ALTER TABLE public.products ADD COLUMN IF NOT EXISTS printify_product_id text, ADD COLUMN IF NOT EXISTS fulfillment_source text NOT NULL DEFAULT 'in_house';
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS printify_variant_id bigint;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printify_order_id text, ADD COLUMN IF NOT EXISTS printify_status text, ADD COLUMN IF NOT EXISTS carrier text;
CREATE UNIQUE INDEX IF NOT EXISTS products_printify_product_id_key ON public.products(printify_product_id) WHERE printify_product_id IS NOT NULL;