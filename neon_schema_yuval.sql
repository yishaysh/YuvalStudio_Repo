-- ==========================================
-- NEON POSTGRESQL 18 FULL SCHEMA FOR YUVAL STUDIO
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  role text DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  referral_code text UNIQUE,
  referred_by text,
  credit_balance decimal(10,2) DEFAULT 0,
  auth_provider text DEFAULT 'email',
  avatar_url text,
  wishlist text[] DEFAULT '{}',
  last_aftercare_checkin timestamp with time zone
);

-- 2. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  category text CHECK (category IN ('Ear', 'Face', 'Body', 'Jewelry')) DEFAULT 'Ear',
  image_url text,
  pain_level integer DEFAULT 1 CHECK (pain_level >= 0 AND pain_level <= 10),
  cost_price decimal(10,2) DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  guest_phone text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  price decimal(10,2),
  final_price decimal(10,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  signature text,
  total_cost decimal(10,2) DEFAULT 0,
  total_profit decimal(10,2) DEFAULT 0,
  cart_items jsonb,
  visual_plan text,
  ai_recommendation_text text,
  anatomy_image_url text,
  anatomy_status text DEFAULT 'not_provided' CHECK (anatomy_status IN ('pending', 'approved', 'rejected', 'not_provided')),
  anatomy_review_comment text,
  is_under_16 boolean DEFAULT false,
  parent_name text,
  parent_id text,
  parent_phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. GALLERY
CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text CHECK (category IN ('business', 'course', 'products', 'other')),
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  expense_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
