
-- ... [Existing Schema Content] ...
-- PROFILES (Users/Admins)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  full_name text,
  phone text,
  role text default 'client' check (role in ('client', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICES
create table if not exists public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null,
  duration_minutes integer not null,
  category text check (category in ('Ear', 'Face', 'Body', 'Jewelry')),
  image_url text,
  pain_level integer default 1 check (pain_level >= 0 and pain_level <= 10),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- APPOINTMENTS
create table if not exists public.appointments (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles(id),
  guest_name text,
  guest_email text,
  guest_phone text,
  service_id uuid references public.services(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  signature text,
  
  -- New Columns for AI Stylist & Pricing
  ai_recommendation_text text, 
  visual_plan text,
  price decimal(10,2),
  final_price decimal(10,2),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MIGRATION COMMANDS (Run these in Supabase SQL Editor if table already exists)
-- ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS price decimal(10,2);
-- ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS final_price decimal(10,2);
-- ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS visual_plan text;
-- ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ai_recommendation_text text;

-- SETTINGS (Key-Value Store for config)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- GALLERY
create table if not exists public.gallery (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STORAGE BUCKETS (Requires Storage Extension)
-- insert into storage.buckets (id, name) values ('service-images', 'service-images');
-- insert into storage.buckets (id, name) values ('gallery-images', 'gallery-images');

-- RLS POLICIES (Example)
-- alter table public.appointments enable row level security;
-- create policy "Public appointments insert" on public.appointments for insert with check (true);
-- create policy "Public services view" on public.services for select using (true);
