
-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Tables

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

-- COUPONS (NEW)
create table if not exists public.coupons (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  type text check (type in ('percent', 'fixed')) not null,
  value decimal(10,2) not null,
  is_active boolean default true,
  usage_count integer default 0,
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

-- 4. Set up Row Level Security (RLS) & Policies
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.coupons enable row level security;
alter table public.appointments enable row level security;
alter table public.gallery enable row level security;
alter table public.settings enable row level security;

-- Policies (Simplified for prototype)
create policy "Public Read Services" on services for select using (true);
create policy "Admin All Services" on services for all using (true);
create policy "Public Read Coupons" on coupons for select using (true);
create policy "Admin All Coupons" on coupons for all using (true);
create policy "Public Read Settings" on settings for select using (true);
create policy "Admin All Settings" on settings for all using (true);
create policy "Public Insert Appointments" on appointments for insert with check (true);
create policy "Admin All Appointments" on appointments for all using (true);
create policy "Public Read Gallery" on gallery for select using (true);
create policy "Admin All Gallery" on gallery for all using (true);

-- 5. STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('service-images', 'service-images', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('gallery-images', 'gallery-images', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('user-uploads', 'user-uploads', true) on conflict do nothing;

create policy "Public Access" on storage.objects for select using (true);
create policy "Public Insert" on storage.objects for insert with check (true);
