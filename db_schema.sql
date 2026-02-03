
-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Tables (Moved up to prevent errors when dropping policies on non-existent tables)

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
  signature text, -- Added signature column
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- GALLERY
create table if not exists public.gallery (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SETTINGS
create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Clean up existing policies
do $$ 
begin
    -- Services
    execute 'drop policy if exists "Public services are viewable by everyone" on services';
    execute 'drop policy if exists "Enable all access for services" on services';
    
    -- Appointments
    execute 'drop policy if exists "Public can insert appointments" on appointments';
    execute 'drop policy if exists "Public can read appointments" on appointments';
    execute 'drop policy if exists "Enable all access for appointments" on appointments';
    
    -- Gallery
    execute 'drop policy if exists "Public can read gallery" on gallery';
    execute 'drop policy if exists "Enable all access for gallery" on gallery';

    -- Settings
    execute 'drop policy if exists "Public can read settings" on settings';
    execute 'drop policy if exists "Enable all access for settings" on settings';
    
    -- Storage
    execute 'drop policy if exists "Public Access" on storage.objects';
    execute 'drop policy if exists "Public Insert" on storage.objects';
end $$;

-- 4. Set up Row Level Security (RLS) & Policies
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.gallery enable row level security;
alter table public.settings enable row level security;

-- Services Policies
create policy "Public services are viewable by everyone" on services for select using ( true );
create policy "Enable all access for services" on services for all using ( true );

-- Appointments Policies
create policy "Public can insert appointments" on appointments for insert with check ( true );
create policy "Public can read appointments" on appointments for select using ( true );
create policy "Enable all access for appointments" on appointments for all using ( true );

-- Gallery Policies
create policy "Public can read gallery" on gallery for select using ( true );
create policy "Enable all access for gallery" on gallery for all using ( true );

-- Settings Policies
create policy "Public can read settings" on settings for select using ( true );
create policy "Enable all access for settings" on settings for all using ( true );

-- 5. STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Public Access"
on storage.objects for select
using ( bucket_id in ('service-images', 'gallery-images') );

create policy "Public Insert"
on storage.objects for insert
with check ( bucket_id in ('service-images', 'gallery-images') );


-- 6. SEED DATA

-- Initial Services
INSERT INTO public.services (name, description, price, duration_minutes, category, image_url, pain_level)
SELECT 'עגיל בתנוך (זוג)', 'ניקוב קלאסי בתנוך עם עגילי טיטניום. זמן החלמה: 6-8 שבועות.', 60, 30, 'Ear', 'https://picsum.photos/400/400?grayscale', 2
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'עגיל בתנוך (זוג)');

INSERT INTO public.services (name, description, price, duration_minutes, category, image_url, pain_level)
SELECT 'הליקס / סחוס', 'ניקוב בחלק העליון של האוזן. טכניקת מחט מדויקת. זמן החלמה: 3-6 חודשים.', 45, 30, 'Ear', 'https://picsum.photos/401/401?grayscale', 4
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'הליקס / סחוס');

INSERT INTO public.services (name, description, price, duration_minutes, category, image_url, pain_level)
SELECT 'נזם', 'מיקום מדויק עם יהלום או זהב. זמן החלמה: 2-4 חודשים.', 55, 30, 'Face', 'https://picsum.photos/402/402?grayscale', 5
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'נזם');

INSERT INTO public.services (name, description, price, duration_minutes, category, image_url, pain_level)
SELECT 'ספטום קליקר', 'פירסינג ספטום מיושר בצורה מושלמת. אפשרויות שדרוג תכשיט.', 70, 45, 'Face', 'https://picsum.photos/403/403?grayscale', 6
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'ספטום קליקר');

-- Initial Settings (Updated to support daily schedule structure)
INSERT INTO public.settings (key, value)
VALUES ('working_hours', '{
  "0": {"isOpen": true, "ranges": [{"start": 11, "end": 20}]},
  "1": {"isOpen": true, "ranges": [{"start": 11, "end": 20}]},
  "2": {"isOpen": true, "ranges": [{"start": 11, "end": 20}]},
  "3": {"isOpen": true, "ranges": [{"start": 11, "end": 20}]},
  "4": {"isOpen": true, "ranges": [{"start": 11, "end": 20}]},
  "5": {"isOpen": true, "ranges": [{"start": 10, "end": 15}]},
  "6": {"isOpen": false, "ranges": []}
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Initial Monthly Goals
INSERT INTO public.settings (key, value)
VALUES ('monthly_goals', '{"revenue": 20000, "appointments": 100}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;