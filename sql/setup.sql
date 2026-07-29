-- ============================================================
-- Tactical Archive — full Supabase setup
-- Run in Supabase SQL Editor (can re-run safely)
-- ============================================================

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'member' check (role in ('member','moderator','admin')),
  rank_level int not null default 1,
  company_id uuid,
  created_at timestamptz default now()
);

-- Companies
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  code text,
  created_at timestamptz default now()
);

insert into companies (name, code) values
  ('Demon', 'DMN'),
  ('Nightmare', 'NM'),
  ('Cerberus', 'CBR'),
  ('Hellfire', 'HLF')
on conflict (name) do nothing;

alter table profiles add column if not exists company_id uuid references companies(id);

-- Content tables
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  min_rank_level int not null default 1,
  is_classified boolean default false,
  status text default 'published',
  author_id uuid references profiles(id),
  author_name text,
  company_id uuid references companies(id),
  tagged_admin_ids uuid[] default '{}',
  attachments jsonb default '[]',
  created_at timestamptz default now()
);
alter table reports add column if not exists company_id uuid references companies(id);
alter table reports add column if not exists tagged_admin_ids uuid[] default '{}';
alter table reports add column if not exists attachments jsonb default '[]';

create table if not exists merits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  recipient_name text,
  awarded_by text,
  created_at timestamptz default now()
);

create table if not exists training (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  category text,
  min_rank_level int default 1,
  created_at timestamptz default now()
);

create table if not exists tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  min_rank_level int default 1,
  created_at timestamptz default now()
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  platform text,
  created_at timestamptz default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  user_id uuid references profiles(id),
  username text,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  options text[] not null,
  active boolean default true,
  min_rank_level int default 1,
  company_id uuid references companies(id),
  author_id uuid references profiles(id),
  author_name text,
  created_at timestamptz default now()
);
alter table polls add column if not exists min_rank_level int default 1;
alter table polls add column if not exists company_id uuid references companies(id);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references polls(id) on delete cascade,
  user_id uuid references profiles(id),
  username text,
  option_index int not null,
  created_at timestamptz default now(),
  unique (poll_id, user_id)
);

create table if not exists settings (
  id int primary key default 1,
  background_image text
);
insert into settings (id, background_image) values (1, 'img/unit-logo.jpg')
on conflict (id) do nothing;

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role, rank_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    coalesce((new.raw_user_meta_data->>'rank_level')::int, 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- RLS
alter table profiles enable row level security;
alter table companies enable row level security;
alter table reports enable row level security;
alter table merits enable row level security;
alter table training enable row level security;
alter table tutorials enable row level security;
alter table links enable row level security;
alter table comments enable row level security;
alter table polls enable row level security;
alter table votes enable row level security;
alter table settings enable row level security;

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles for select to authenticated using (true);
drop policy if exists "admin update profiles" on profiles;
create policy "admin update profiles" on profiles for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "self update company" on profiles;
create policy "self update company" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read companies" on companies;
create policy "read companies" on companies for select to authenticated using (true);
drop policy if exists "admin companies" on companies;
create policy "admin companies" on companies for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "read reports by rank" on reports;
drop policy if exists "read reports by rank company tag" on reports;
create policy "read reports by rank company tag" on reports for select to authenticated
  using (
    status = 'published'
    and (
      exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
      or (
        min_rank_level <= (select rank_level from profiles where id = auth.uid())
        and (
          company_id is null
          or company_id = (select company_id from profiles where id = auth.uid())
          or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'moderator')
        )
      )
      or (auth.uid() = any (tagged_admin_ids))
    )
  );
drop policy if exists "staff write reports" on reports;
create policy "staff write reports" on reports for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

drop policy if exists "admin merits" on merits;
create policy "admin merits" on merits for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "read training" on training;
create policy "read training" on training for select to authenticated
  using (min_rank_level <= (select rank_level from profiles where id = auth.uid()));
drop policy if exists "staff write training" on training;
create policy "staff write training" on training for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

drop policy if exists "read tutorials" on tutorials;
create policy "read tutorials" on tutorials for select to authenticated
  using (min_rank_level <= (select rank_level from profiles where id = auth.uid()));
drop policy if exists "staff write tutorials" on tutorials;
create policy "staff write tutorials" on tutorials for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

drop policy if exists "read links" on links;
create policy "read links" on links for select to authenticated using (true);
drop policy if exists "staff links" on links;
create policy "staff links" on links for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

drop policy if exists "read comments" on comments;
create policy "read comments" on comments for select to authenticated using (true);
drop policy if exists "write comments" on comments;
create policy "write comments" on comments for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "read polls" on polls;
create policy "read polls" on polls for select to authenticated using (true);
drop policy if exists "staff polls" on polls;
create policy "staff polls" on polls for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

drop policy if exists "read votes" on votes;
create policy "read votes" on votes for select to authenticated using (true);
drop policy if exists "cast vote" on votes;
create policy "cast vote" on votes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "read settings" on settings;
create policy "read settings" on settings for select to authenticated using (true);
drop policy if exists "admin settings" on settings;
create policy "admin settings" on settings for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Storage
insert into storage.buckets (id, name, public)
values ('archive-files', 'archive-files', true)
on conflict (id) do nothing;

drop policy if exists "auth read archive-files" on storage.objects;
create policy "auth read archive-files" on storage.objects for select to authenticated
  using (bucket_id = 'archive-files');
drop policy if exists "staff upload archive-files" on storage.objects;
create policy "staff upload archive-files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'archive-files'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator'))
  );
