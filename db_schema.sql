
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
  ai_recommendation_text text, -- Added for Personal AI Ear Stylist
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- ... [Rest of file unchanged] ...
