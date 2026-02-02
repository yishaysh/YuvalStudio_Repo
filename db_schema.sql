
-- ... (Existing tables)

-- JEWELRY LIBRARY FOR EAR ARCHITECT
create table if not exists public.jewelry_library (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policy
alter table public.jewelry_library enable row level security;
create policy "Public Read Jewelry Library" on jewelry_library for select using (true);
create policy "Admin All Jewelry Library" on jewelry_library for all using (true);

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('jewelry-library', 'jewelry-library', true) on conflict do nothing;
