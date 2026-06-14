-- Supabase schema for the Spend Basket MVP.
-- Run this file in the Supabase SQL Editor after Auth/Google OAuth is enabled.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  terms_agreed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  original_image_url text,
  removed_bg_image_url text,
  price integer not null check (price >= 0),
  category text check (
    category is null or category in (
      'food',
      'cafe-snack',
      'shopping',
      'hobby-leisure',
      'daily-supplies',
      'health',
      'self-development',
      'gift',
      'etc'
    )
  ),
  reason text check (
    reason is null or reason in (
      'necessary',
      'planned',
      'no-reason',
      'refresh',
      'gift-purpose',
      'hobby-fandom',
      'discount',
      'hungry',
      'other'
    )
  ),
  cart_color text not null default 'yellow' check (
    cart_color in (
      'warm-pink',
      'pink',
      'cool-pink',
      'red',
      'yellow',
      'green',
      'mint',
      'purple',
      'grey'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.no_spend_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists items_user_date_idx
  on public.items(user_id, date);

create index if not exists no_spend_days_user_date_idx
  on public.no_spend_days(user_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, email, display_name, avatar_url, created_at)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url',
  coalesce(created_at, now())
from auth.users
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

create or replace function public.prevent_item_on_no_spend_day()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.no_spend_days
    where user_id = new.user_id
      and date = new.date
  ) then
    raise exception 'Cannot save an item on a no-spend day.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_item_on_no_spend_day on public.items;
create trigger prevent_item_on_no_spend_day
before insert or update of user_id, date on public.items
for each row
execute function public.prevent_item_on_no_spend_day();

create or replace function public.prevent_no_spend_day_with_items()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.items
    where user_id = new.user_id
      and date = new.date
  ) then
    raise exception 'Cannot save a no-spend day when items already exist.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_no_spend_day_with_items on public.no_spend_days;
create trigger prevent_no_spend_day_with_items
before insert or update of user_id, date on public.no_spend_days
for each row
execute function public.prevent_no_spend_day_with_items();

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.no_spend_days enable row level security;

drop policy if exists "Profiles are selectable by owner" on public.profiles;
create policy "Profiles are selectable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "Items are selectable by owner" on public.items;
create policy "Items are selectable by owner"
on public.items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Items are insertable by owner" on public.items;
create policy "Items are insertable by owner"
on public.items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Items are updatable by owner" on public.items;
create policy "Items are updatable by owner"
on public.items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Items are deletable by owner" on public.items;
create policy "Items are deletable by owner"
on public.items
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "No-spend days are selectable by owner" on public.no_spend_days;
create policy "No-spend days are selectable by owner"
on public.no_spend_days
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "No-spend days are insertable by owner" on public.no_spend_days;
create policy "No-spend days are insertable by owner"
on public.no_spend_days
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "No-spend days are updatable by owner" on public.no_spend_days;
create policy "No-spend days are updatable by owner"
on public.no_spend_days
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "No-spend days are deletable by owner" on public.no_spend_days;
create policy "No-spend days are deletable by owner"
on public.no_spend_days
for delete
to authenticated
using (auth.uid() = user_id);
