-- ==========================================
-- SCRIPT: db_fix_schema_and_policies.sql
-- PURPOSE: Fix RLS policies to allow:
-- 1. Public Reading of Gallery, Services, Settings
-- 2. Public Creation of Appointments
-- 3. Admin Management of Appointments (Currently via public access due to client-side auth)
-- ==========================================

-- 1. Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
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


-- 3. Create Permissive Policies (Since Admin authentication is client-side only)

-- APPOINTMENTS
-- Allow anyone to INSERT (Booking)
CREATE POLICY "Public appointments insert" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to SELECT (Admin View + User History)
CREATE POLICY "Public appointments view" 
ON public.appointments 
FOR SELECT 
USING (true);

-- Allow anyone to UPDATE (Admin Status Updates)
CREATE POLICY "Public appointments update" 
ON public.appointments 
FOR UPDATE 
USING (true);

-- Allow anyone to DELETE (Admin Cancellation)
CREATE POLICY "Public appointments delete" 
ON public.appointments 
FOR DELETE 
USING (true);


-- SERVICES
-- Allow anyone to READ
CREATE POLICY "Public services view" 
ON public.services 
FOR SELECT 
USING (true);

-- Allow anyone to MANAGE (Admin)
CREATE POLICY "Public services manage"
ON public.services
FOR ALL
USING (true);


-- GALLERY
-- Allow anyone to READ
CREATE POLICY "Public gallery view" 
ON public.gallery 
FOR SELECT 
USING (true);

-- Allow anyone to MANAGE (Admin Uploads)
CREATE POLICY "Public gallery manage"
ON public.gallery
FOR ALL
USING (true);


-- SETTINGS
-- Allow anyone to READ
CREATE POLICY "Public settings view" 
ON public.settings 
FOR SELECT 
USING (true);

-- Allow anyone to MANAGE (Admin)
CREATE POLICY "Public settings manage"
ON public.settings
FOR ALL
USING (true);


-- PROFILES (Users)
-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to select their own profile
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
CREATE POLICY "Users can select their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 4. Fix Foreign Keys (If missing)
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
