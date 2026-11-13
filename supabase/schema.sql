-- Kartotéka: each signed-in user owns exactly one private library (collection, wishlist, decks).
-- Run once in the Supabase SQL editor. Same pattern as Fakturo's account_data.
create table if not exists public.library_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.library_data enable row level security;

grant select, insert, update on public.library_data to authenticated;
revoke all on public.library_data from anon;

drop policy if exists "Users read their own library" on public.library_data;
create policy "Users read their own library"
  on public.library_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own library" on public.library_data;
create policy "Users create their own library"
  on public.library_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own library" on public.library_data;
create policy "Users update their own library"
  on public.library_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
