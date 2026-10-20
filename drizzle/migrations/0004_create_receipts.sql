CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1001;
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL DEFAULT ('R-' || nextval('public.receipt_number_seq')::text),
  order_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_label text,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  tip_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  amount_tendered_cents integer,
  change_cents integer,
  notes text,
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
GRANT USAGE ON SEQUENCE public.receipt_number_seq TO authenticated, service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read receipts" ON public.receipts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create receipts" ON public.receipts FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update receipts" ON public.receipts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));