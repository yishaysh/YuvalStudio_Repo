-- ==========================================
-- SCRIPT: db_full_migration_safe.sql
-- PURPOSE: Unified, safe migration script to:
-- 1. Create tables if they don't exist
-- 2. Add missing columns (idempotent)
-- 3. Fix Foreign Keys
-- 4. Enable RLS and apply policies
-- ==========================================

-- 1. Create Tables (If Not Exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  role text DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_minutes integer NOT NULL,
  category text CHECK (category IN ('Ear', 'Face', 'Body', 'Jewelry')),
  image_url text,
  pain_level integer DEFAULT 1 CHECK (pain_level >= 0 AND pain_level <= 10),
  cost_price decimal(10,2) DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  signature text,
  total_cost decimal(10,2) DEFAULT 0,
  total_profit decimal(10,2) DEFAULT 0,
  cart_items jsonb,
  is_under_16 boolean DEFAULT false,
  parent_name text,
  parent_id text,
  parent_phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category text CHECK (category IN ('business', 'course', 'products', 'other')),
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  expense_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 2. Add Columns safely (Idempotent)
DO $$
BEGIN
    -- SERVICES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'duration_minutes') THEN
        ALTER TABLE public.services ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'category') THEN
        ALTER TABLE public.services ADD COLUMN category text CHECK (category IN ('Ear', 'Face', 'Body', 'Jewelry')) DEFAULT 'Ear';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'pain_level') THEN
        ALTER TABLE public.services ADD COLUMN pain_level integer DEFAULT 1 CHECK (pain_level >= 0 AND pain_level <= 10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'cost_price') THEN
        ALTER TABLE public.services ADD COLUMN cost_price decimal(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'stock_quantity') THEN
        ALTER TABLE public.services ADD COLUMN stock_quantity integer DEFAULT 0;
    END IF;

    -- PROFILES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wishlist') THEN
        ALTER TABLE public.profiles ADD COLUMN wishlist text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_aftercare_checkin') THEN
        ALTER TABLE public.profiles ADD COLUMN last_aftercare_checkin timestamp with time zone;
    END IF;

    -- APPOINTMENTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_id') THEN
        ALTER TABLE public.appointments ADD COLUMN client_id uuid REFERENCES public.profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_id') THEN
         ALTER TABLE public.appointments ADD COLUMN service_id uuid REFERENCES public.services(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'guest_name') THEN
        ALTER TABLE public.appointments ADD COLUMN guest_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'guest_email') THEN
         ALTER TABLE public.appointments ADD COLUMN guest_email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'guest_phone') THEN
         ALTER TABLE public.appointments ADD COLUMN guest_phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'price') THEN
        ALTER TABLE public.appointments ADD COLUMN price decimal(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'final_price') THEN
        ALTER TABLE public.appointments ADD COLUMN final_price decimal(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'visual_plan') THEN
        ALTER TABLE public.appointments ADD COLUMN visual_plan text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'ai_recommendation_text') THEN
        ALTER TABLE public.appointments ADD COLUMN ai_recommendation_text text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'total_cost') THEN
        ALTER TABLE public.appointments ADD COLUMN total_cost decimal(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'total_profit') THEN
        ALTER TABLE public.appointments ADD COLUMN total_profit decimal(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'cart_items') THEN
        ALTER TABLE public.appointments ADD COLUMN cart_items jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'anatomy_image_url') THEN
        ALTER TABLE public.appointments ADD COLUMN anatomy_image_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'anatomy_status') THEN
        ALTER TABLE public.appointments ADD COLUMN anatomy_status text DEFAULT 'not_provided' CHECK (anatomy_status IN ('pending', 'approved', 'rejected', 'not_provided'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'anatomy_review_comment') THEN
        ALTER TABLE public.appointments ADD COLUMN anatomy_review_comment text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'is_under_16') THEN
        ALTER TABLE public.appointments ADD COLUMN is_under_16 boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'parent_name') THEN
        ALTER TABLE public.appointments ADD COLUMN parent_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'parent_id') THEN
        ALTER TABLE public.appointments ADD COLUMN parent_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'parent_phone') THEN
        ALTER TABLE public.appointments ADD COLUMN parent_phone text;
    END IF;
END $$;


-- 3. Fix Foreign Keys (If missing)
DO $$
BEGIN
    -- Check APPOINTMENTS -> SERVICES
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'appointments_service_id_fkey') THEN
        ALTER TABLE public.appointments ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);
    END IF;

    -- Check APPOINTMENTS -> PROFILES
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'appointments_client_id_fkey') THEN
        ALTER TABLE public.appointments ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 4. Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid conflicts
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

-- 6. Create Permissive Policies (Since Admin authentication is client-side only)

-- APPOINTMENTS
CREATE POLICY "Public appointments insert" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public appointments view" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Public appointments update" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Public appointments delete" ON public.appointments FOR DELETE USING (true);

-- SERVICES
CREATE POLICY "Public services view" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public services manage" ON public.services FOR ALL USING (true);

-- GALLERY
CREATE POLICY "Public gallery view" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Public gallery manage" ON public.gallery FOR ALL USING (true);

-- SETTINGS
CREATE POLICY "Public settings view" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public settings manage" ON public.settings FOR ALL USING (true);

-- EXPENSES
CREATE POLICY "Public expenses view" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Public expenses manage" ON public.expenses FOR ALL USING (true);

-- PROFILES (Users)
-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to select their own profile
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
CREATE POLICY "Users can select their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 7. Triggers for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to safely recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
