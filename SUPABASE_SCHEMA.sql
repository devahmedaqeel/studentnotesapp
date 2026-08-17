-- ====================================================================
-- STUDENTNOTES DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
-- Run this script in your backend SQL Editor to initialize all tables,
-- Row Level Security (RLS) policies, and storage bucket access rules.

-- 1. PROFILES TABLE (Enhanced with Student Information)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  department text,
  university text,
  institution text,
  student_status text default 'Student',
  student_id text,
  program text,
  semester text,
  graduation_year text,
  bio text,
  gender text default 'male',
  avatar_preset text default 'male_student',
  avatar_url text,
  ring_color text default '#6366F1',
  profile_completed boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Non-destructive columns addition for existing deployments
alter table public.profiles add column if not exists institution text;
alter table public.profiles add column if not exists student_status text default 'Student';
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists program text;
alter table public.profiles add column if not exists graduation_year text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists gender text default 'male';
alter table public.profiles add column if not exists avatar_preset text default 'male_student';
alter table public.profiles add column if not exists ring_color text default '#6366F1';
alter table public.profiles add column if not exists profile_completed boolean default false;

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. SUBJECTS TABLE
create table if not exists public.subjects (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#4F46E5',
  icon text default 'book-outline',
  description text,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.subjects enable row level security;

create policy "Users manage own subjects" on public.subjects
  for all using (auth.uid() = user_id);

-- 3. FOLDERS TABLE
create table if not exists public.folders (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id text not null,
  name text not null,
  color text default '#4F46E5',
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.folders enable row level security;

create policy "Users manage own folders" on public.folders
  for all using (auth.uid() = user_id);

-- 4. NOTES TABLE
create table if not exists public.notes (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id text not null,
  folder_id text,
  title text not null,
  description text,
  is_favorite boolean default false,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.notes enable row level security;

create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id);

-- 5. NOTE PAGES TABLE
create table if not exists public.note_pages (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  note_id text not null,
  page_number integer not null,
  image_url text not null,
  created_at bigint not null,
  primary key (id, user_id)
);

alter table public.note_pages enable row level security;

create policy "Users manage own note pages" on public.note_pages
  for all using (auth.uid() = user_id);

-- 6. PDFS TABLE
create table if not exists public.pdfs (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id text not null,
  folder_id text,
  title text not null,
  file_url text not null,
  page_count integer default 1,
  file_size_bytes bigint default 0,
  is_favorite boolean default false,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.pdfs add column if not exists folder_id text;

alter table public.pdfs enable row level security;

create policy "Users manage own pdfs" on public.pdfs
  for all using (auth.uid() = user_id);

-- 7. TAGS TABLE
create table if not exists public.tags (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#4F46E5',
  primary key (id, user_id)
);

alter table public.tags enable row level security;

create policy "Users manage own tags" on public.tags
  for all using (auth.uid() = user_id);

-- 8. NOTE TAGS TABLE
create table if not exists public.note_tags (
  note_id text not null,
  tag_id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  primary key (note_id, tag_id, user_id)
);

alter table public.note_tags enable row level security;

create policy "Users manage own note tags" on public.note_tags
  for all using (auth.uid() = user_id);

-- 9. DOCUMENT FOLDERS TABLE
create table if not exists public.document_folders (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#4F46E5',
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.document_folders enable row level security;

create policy "Users manage own document folders" on public.document_folders
  for all using (auth.uid() = user_id);

-- 10. DOCUMENTS (VAULT) TABLE
create table if not exists public.documents (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  original_file_name text not null,
  file_url text not null,
  file_type text not null,
  mime_type text not null,
  file_size_bytes bigint default 0,
  folder_id text,
  category text,
  is_favorite boolean default false,
  thumbnail_url text,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.documents enable row level security;

create policy "Users manage own documents" on public.documents
  for all using (auth.uid() = user_id);

-- 11. DIARY EVENTS TABLE
create table if not exists public.diary_events (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  event_type text not null,
  subject_id text,
  description text,
  due_date text not null,
  due_time text,
  due_timestamp bigint not null,
  priority text default 'medium',
  status text default 'upcoming',
  is_important boolean default false,
  reminder_enabled boolean default true,
  reminder_type text default '1_day',
  daily_until_completed boolean default false,
  completed_at bigint,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.diary_events enable row level security;

create policy "Users manage own diary events" on public.diary_events
  for all using (auth.uid() = user_id);

-- 12. DIARY ATTACHMENTS TABLE
create table if not exists public.diary_attachments (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  event_id text not null,
  document_id text,
  title text not null,
  file_url text not null,
  file_type text not null,
  file_size_bytes bigint default 0,
  created_at bigint not null,
  primary key (id, user_id)
);

alter table public.diary_attachments enable row level security;

create policy "Users manage own diary attachments" on public.diary_attachments
  for all using (auth.uid() = user_id);

-- 13. TIMETABLE CLASSES TABLE
create table if not exists public.timetable_classes (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id text,
  subject_name text not null,
  subject_color text,
  teacher_name text,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  room text,
  building text,
  notes text,
  reminder_enabled boolean default true,
  reminder_minutes int default 10,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.timetable_classes enable row level security;

create policy "Users manage own timetable classes" on public.timetable_classes
  for all using (auth.uid() = user_id);

-- 14. TIMETABLE SETTINGS TABLE
create table if not exists public.timetable_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  daily_notification_enabled boolean default true,
  notification_time text default '01:00',
  notify_free_days boolean default false,
  class_reminders_enabled boolean default true,
  default_reminder_minutes int default 10,
  updated_at bigint not null
);

alter table public.timetable_settings enable row level security;

create policy "Users manage own timetable settings" on public.timetable_settings
  for all using (auth.uid() = user_id);

-- 15. SAVED LINKS TABLE (Account-Specific Web Resources)
create table if not exists public.saved_links (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  original_url text not null,
  cleaned_url text not null,
  title text not null,
  resource_type text not null,
  custom_type text,
  domain text not null,
  favicon_url text,
  preview_image_url text,
  description text,
  subject_id text,
  subject_name text,
  category text,
  tags text default '[]',
  personal_note text,
  is_favorite boolean default false,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

alter table public.saved_links enable row level security;

create policy "Users manage own saved links" on public.saved_links
  for all using (auth.uid() = user_id);

create index if not exists idx_saved_links_user_id on public.saved_links(user_id);
create index if not exists idx_saved_links_cleaned_url on public.saved_links(cleaned_url);

-- STORAGE BUCKETS POLICIES
-- Note: Buckets 'note-files', 'pdf-files', 'avatars', 'documents' in Storage

-- Storage policies for note-files bucket
create policy "Note files isolation" on storage.objects
  for all using (bucket_id = 'note-files' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for pdf-files bucket
create policy "PDF files isolation" on storage.objects
  for all using (bucket_id = 'pdf-files' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket
create policy "Avatars isolation" on storage.objects
  for all using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for documents bucket
create policy "Documents isolation" on storage.objects
  for all using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

