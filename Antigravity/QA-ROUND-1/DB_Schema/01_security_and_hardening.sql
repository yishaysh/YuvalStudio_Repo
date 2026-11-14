-- =============================================================================
-- Yuval Studio - QA Round 1 Security & Production Hardening Migration
-- Compatible with Neon PostgreSQL 18+ and PostgreSQL 15+ (idempotent)
-- =============================================================================

BEGIN;

-- 1. Ensure appointments supports coupon tracking, minor/parent consent & anatomy metadata
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_under_16 boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS parent_id text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total_cost numeric(10, 2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total_profit numeric(10, 2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cart_items jsonb;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS visual_plan text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ai_recommendation_text text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS anatomy_image_url text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS anatomy_status text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS signature text;

-- Fast slot-overlap lookup for active appointments
CREATE INDEX IF NOT EXISTS idx_appointments_active_window
  ON public.appointments (start_time, end_time)
  WHERE status <> 'cancelled';

-- 2. Ensure jewelry_orders stores durable server notification state cleanly
CREATE TABLE IF NOT EXISTS public.jewelry_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  client_email text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
  delivery_method text NOT NULL DEFAULT 'pickup' CHECK (delivery_method IN ('pickup', 'delivery')),
  shipping_address text,
  shipping_cost numeric(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  notes text,
  notification_status text NOT NULL DEFAULT 'pending',
  notification_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.jewelry_orders ADD COLUMN IF NOT EXISTS notification_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.jewelry_orders ADD COLUMN IF NOT EXISTS notification_error text;

CREATE INDEX IF NOT EXISTS idx_jewelry_orders_created_at ON public.jewelry_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jewelry_orders_status ON public.jewelry_orders (status);

-- 3. Dedicated waitlist_requests table (replaces settings JSONB fallback cleanly)
CREATE TABLE IF NOT EXISTS public.waitlist_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_phone text NOT NULL,
  preferred_date text,
  service_names text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_waitlist_requests_created_at ON public.waitlist_requests (created_at DESC);

-- 4. Lock down legacy permissive RLS policies (zero USING (true) anonymous PII/admin policies)
-- All application reads/writes execute through Vercel Serverless API handlers using server credentials.
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewelry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public appointments view" ON public.appointments;
DROP POLICY IF EXISTS "Public appointments insert" ON public.appointments;
DROP POLICY IF EXISTS "Public appointments update" ON public.appointments;
DROP POLICY IF EXISTS "Public appointments delete" ON public.appointments;

DROP POLICY IF EXISTS "Public services view" ON public.services;
DROP POLICY IF EXISTS "Public services manage" ON public.services;

DROP POLICY IF EXISTS "Public gallery view" ON public.gallery;
DROP POLICY IF EXISTS "Public gallery manage" ON public.gallery;

DROP POLICY IF EXISTS "Public settings view" ON public.settings;
DROP POLICY IF EXISTS "Public settings manage" ON public.settings;

DROP POLICY IF EXISTS "Public expenses view" ON public.expenses;
DROP POLICY IF EXISTS "Public expenses manage" ON public.expenses;

-- Public catalog-only read policies (non-PII tables) when direct SQL roles exist
DROP POLICY IF EXISTS "Catalog services public read" ON public.services;
CREATE POLICY "Catalog services public read" ON public.services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Catalog gallery public read" ON public.gallery;
CREATE POLICY "Catalog gallery public read" ON public.gallery FOR SELECT USING (true);

-- Note: appointments, profiles, expenses, settings, jewelry_orders, waitlist_requests
-- intentionally have ZERO public/anon SELECT or write policies.

COMMIT;
