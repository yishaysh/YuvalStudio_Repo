-- 1. Create Profiles Table (If not exists)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  full_name text,
  phone text,
  role text default 'client' check (role in ('client', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS on profiles (optional but recommended)
alter table public.profiles enable row level security;

-- 3. Create Function to Auto-Create Profile on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client');
  return new;
end;
$$ language plpgsql security definer;

-- 4. Create Trigger (Drop if exists to avoid duplication)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Add 'client_id' to appointments table (safe run)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'client_id') then
      alter table public.appointments add column client_id uuid references public.profiles(id);
  end if;
end $$;

-- 6. Add 'price' and 'final_price' to appointments table (safe run - if missing)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'price') then
      alter table public.appointments add column price decimal(10,2);
  end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'final_price') then
      alter table public.appointments add column final_price decimal(10,2);
  end if;
end $$;

-- 7. Add 'ai_recommendation_text' and 'visual_plan' (safe run - if missing)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'ai_recommendation_text') then
      alter table public.appointments add column ai_recommendation_text text;
  end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'visual_plan') then
      alter table public.appointments add column visual_plan text;
  end if;
end $$;
