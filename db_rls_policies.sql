-- RLS Policies for Profiles Table

-- 1. Enable RLS on profiles (Already enabled, but good to ensure)
alter table public.profiles enable row level security;

-- 2. Allow users to INSERT their own profile
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- 3. Allow users to SELECT their own profile
create policy "Users can select their own profile"
on public.profiles
for select
using (auth.uid() = id);

-- 4. Allow users to UPDATE their own profile
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

-- 5. Allow public read access to basic profile info (Optional, useful if you want public profiles later)
-- create policy "Public profiles are viewable by everyone"
-- on public.profiles for select
-- using ( true );
