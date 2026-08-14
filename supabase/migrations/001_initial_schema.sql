-- ====================================================================
-- MIGRATION 001: INITIAL STUDENTNOTES SUPABASE SCHEMA & RLS POLICIES
-- ====================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  department text,
  university text,
  semester text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. SUBJECTS TABLE
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#4F46E5',
  icon text default 'book-outline',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.subjects enable row level security;

create policy "Users manage own subjects" on public.subjects
  for all using (auth.uid() = user_id);

-- 3. FOLDERS TABLE
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.folders enable row level security;

create policy "Users manage own folders" on public.folders
  for all using (auth.uid() = user_id);

-- 4. NOTES TABLE
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  thumbnail_path text,
  favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notes enable row level security;

create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id);

-- 5. NOTE PAGES TABLE
create table if not exists public.note_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  note_id uuid references public.notes(id) on delete cascade not null,
  page_number integer not null,
  file_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.note_pages enable row level security;

create policy "Users manage own note pages" on public.note_pages
  for all using (auth.uid() = user_id);

-- 6. PDFS TABLE
create table if not exists public.pdfs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  file_path text not null,
  page_count integer default 1,
  favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.pdfs enable row level security;

create policy "Users manage own pdfs" on public.pdfs
  for all using (auth.uid() = user_id);

-- 7. TAGS TABLE
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tags enable row level security;

create policy "Users manage own tags" on public.tags
  for all using (auth.uid() = user_id);

-- 8. NOTE TAGS TABLE
create table if not exists public.note_tags (
  note_id uuid references public.notes(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  primary key (note_id, tag_id)
);

alter table public.note_tags enable row level security;

create policy "Users manage own note tags" on public.note_tags
  for all using (
    exists (
      select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid()
    )
  );

-- 9. TRASH TABLE
create table if not exists public.trash (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid not null,
  item_type text not null,
  metadata jsonb,
  deleted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.trash enable row level security;

create policy "Users manage own trash" on public.trash
  for all using (auth.uid() = user_id);

-- STORAGE BUCKETS & RLS POLICIES
-- Create buckets: note-files, pdf-files, avatars

create policy "Note files isolation" on storage.objects
  for all using (bucket_id = 'note-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "PDF files isolation" on storage.objects
  for all using (bucket_id = 'pdf-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatars isolation" on storage.objects
  for all using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
