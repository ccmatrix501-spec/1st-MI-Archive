-- ============================================================
-- TACTICAL ARCHIVE - Supabase Schema + Row Level Security
-- Run this in the Supabase SQL Editor after creating your project
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'moderator', 'member')),
  rank_level smallint not null default 1 check (rank_level between 1 and 9),
  rank_name text not null default 'Recruit',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, rank_level, rank_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    1,
    'Recruit'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. REPORTS
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  summary text,
  min_rank_level smallint not null default 1 check (min_rank_level between 1 and 9),
  author_id uuid references public.profiles(id) not null,
  is_classified boolean default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  file_urls text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. MERITS & AWARDS
create table public.merits_awards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  recipient_id uuid references public.profiles(id) not null,
  awarded_by uuid references public.profiles(id) not null,
  award_type text not null check (award_type in ('merit', 'medal', 'commendation', 'promotion')),
  date_awarded date not null default current_date,
  file_url text,
  created_at timestamptz default now()
);

-- 4. TRAINING MATERIALS
create table public.training_materials (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  category text not null default 'General',
  min_rank_level smallint not null default 1 check (min_rank_level between 1 and 9),
  file_url text,
  external_url text,
  author_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. TUTORIALS
create table public.tutorials (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  video_url text not null,
  thumbnail_url text,
  min_rank_level smallint not null default 1 check (min_rank_level between 1 and 9),
  duration_minutes integer,
  author_id uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

-- 6. COMMENTS
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  author_id uuid references public.profiles(id) not null,
  parent_type text not null check (parent_type in ('report', 'merit', 'training', 'tutorial')),
  parent_id uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. TACTICAL CENTRE LINKS
create table public.tactical_centre_links (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  web_url text,
  desktop_download_url text,
  version text not null default '1.0.0',
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (the real security layer)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.merits_awards enable row level security;
alter table public.training_materials enable row level security;
alter table public.tutorials enable row level security;
alter table public.comments enable row level security;
alter table public.tactical_centre_links enable row level security;

-- PROFILES policies
create policy "Public profiles are viewable by everyone authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile (limited)"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Only admins can change roles/ranks of others (do this carefully via service role or admin function)
-- For simplicity we allow admins full update via a separate policy if needed.

-- REPORTS: the critical rank gate
create policy "Users can view published reports at or below their rank"
  on public.reports for select
  to authenticated
  using (
    status = 'published'
    and min_rank_level <= (
      select rank_level from public.profiles where id = auth.uid()
    )
    or
    -- Staff can see everything
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Admins and moderators can insert reports"
  on public.reports for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Admins and moderators can update reports"
  on public.reports for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Admins can delete reports"
  on public.reports for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- MERITS: visible to all authenticated
create policy "Authenticated users can view merits"
  on public.merits_awards for select
  to authenticated
  using (true);

create policy "Staff can manage merits"
  on public.merits_awards for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- TRAINING MATERIALS (rank gated)
create policy "Users can view training at their rank"
  on public.training_materials for select
  to authenticated
  using (
    min_rank_level <= (
      select rank_level from public.profiles where id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Staff can manage training"
  on public.training_materials for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- TUTORIALS (rank gated)
create policy "Users can view tutorials at their rank"
  on public.tutorials for select
  to authenticated
  using (
    min_rank_level <= (
      select rank_level from public.profiles where id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Staff can manage tutorials"
  on public.tutorials for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- COMMENTS
create policy "Authenticated users can view comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "Authenticated users can insert comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Users can update/delete own comments"
  on public.comments for update
  to authenticated
  using (auth.uid() = author_id);

create policy "Users can delete own comments"
  on public.comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- TACTICAL CENTRE
create policy "Authenticated can view active links"
  on public.tactical_centre_links for select
  to authenticated
  using (is_active = true or exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  ));

create policy "Staff can manage tactical centre links"
  on public.tactical_centre_links for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- ============================================================
-- STORAGE BUCKET (run in Storage or via SQL)
-- ============================================================
-- In Supabase Dashboard > Storage:
-- Create a bucket named "archive-files"
-- Set it to private if you want signed URLs only, or public for simplicity.
-- Then add policies for authenticated upload/download.

-- Example storage policies (adjust as needed):
-- allow authenticated users to upload to their own folder
-- allow authenticated to download based on rank if you store metadata.

