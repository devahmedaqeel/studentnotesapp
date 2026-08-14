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
  title text not null,
  file_url text not null,
  page_count integer default 1,
  file_size_bytes bigint default 0,
  is_favorite boolean default false,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

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

-- 15. STUDENT CONNECTIONS TABLE
create table if not exists public.student_connections (
  id text not null,
  requester_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at bigint not null,
  updated_at bigint not null,
  primary key (id)
);

alter table public.student_connections enable row level security;

create policy "Users manage involved connections" on public.student_connections
  for all using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- 16. CHAT CONVERSATIONS & MEMBERS
create table if not exists public.chat_conversations (
  id text primary key,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.chat_conversation_members (
  conversation_id text references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  muted_until bigint,
  pinned_message_id text,
  primary key (conversation_id, user_id)
);

alter table public.chat_conversations enable row level security;
alter table public.chat_conversation_members enable row level security;

create policy "Members manage conversations" on public.chat_conversations
  for all using (exists (
    select 1 from public.chat_conversation_members
    where conversation_id = public.chat_conversations.id and user_id = auth.uid()
  ));

create policy "Members view membership" on public.chat_conversation_members
  for all using (user_id = auth.uid());

-- 17. CHAT MESSAGES TABLE (CIPHERTEXT ONLY)
create table if not exists public.chat_messages (
  id text primary key,
  conversation_id text references public.chat_conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  message_type text not null,
  ciphertext text not null,
  iv text not null,
  hmac text not null,
  attachment_path text,
  attachment_type text,
  attachment_size bigint default 0,
  attachment_name text,
  duration int default 0,
  reply_to_id text,
  status text default 'sent',
  is_deleted boolean default false,
  created_at bigint not null,
  edited_at bigint
);

alter table public.chat_messages enable row level security;

create policy "Sender and recipient manage messages" on public.chat_messages
  for all using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- 18. 24-HOUR STUDENT STATUSES TABLE
create table if not exists public.chat_statuses (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status_type text not null,
  content text,
  media_url text,
  media_type text,
  caption text,
  bg_color text,
  created_at bigint not null,
  expires_at bigint not null
);

create table if not exists public.chat_status_views (
  status_id text references public.chat_statuses(id) on delete cascade not null,
  viewer_id uuid references auth.users(id) on delete cascade not null,
  viewed_at bigint not null,
  primary key (status_id, viewer_id)
);

alter table public.chat_statuses enable row level security;
alter table public.chat_status_views enable row level security;

create policy "Active statuses visible to all authenticated students" on public.chat_statuses
  for select using (auth.role() = 'authenticated' and expires_at > (extract(epoch from now()) * 1000));

create policy "Users manage own status" on public.chat_statuses
  for all using (auth.uid() = user_id);

create policy "Users track status views" on public.chat_status_views
  for all using (auth.uid() = viewer_id or exists (
    select 1 from public.chat_statuses where id = status_id and user_id = auth.uid()
  ));

-- 19. REPORTS & PRIVACY SETTINGS
create table if not exists public.chat_reports (
  id text primary key,
  reporter_id uuid references auth.users(id) on delete cascade not null,
  reported_user_id uuid references auth.users(id) on delete cascade not null,
  reason text not null,
  description text,
  created_at bigint not null
);

create table if not exists public.user_privacy_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  show_online_status boolean default true,
  show_last_seen boolean default true,
  read_receipts boolean default true,
  status_visibility text default 'connections',
  updated_at bigint not null
);

alter table public.chat_reports enable row level security;
alter table public.user_privacy_settings enable row level security;

create policy "Users create reports" on public.chat_reports
  for insert with check (auth.uid() = reporter_id);

create policy "Users manage privacy settings" on public.user_privacy_settings
  for all using (auth.uid() = user_id);

-- STORAGE BUCKETS POLICIES
-- Note: Buckets 'note-files', 'pdf-files', 'avatars', 'documents', 'chat-attachments' in Storage

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

-- Storage policies for chat-attachments bucket
create policy "Chat attachments isolation" on storage.objects
  for all using (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');

-- 20. STUDENT PROFILES (CANONICAL PUBLIC STUDENT CONNECT PROFILES)
create table if not exists public.student_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  public_student_id text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  program text,
  semester text,
  university text,
  online_status text default 'offline',
  last_seen text,
  followers_count int default 0,
  following_count int default 0,
  username_changed_at bigint,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.username_history (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  username text not null,
  normalized_username text not null unique,
  is_current boolean default true,
  created_at bigint not null,
  released_at bigint
);

alter table public.student_profiles enable row level security;
alter table public.username_history enable row level security;

-- All authenticated students can search and view public student profiles
create policy "Student profiles visible to authenticated users" on public.student_profiles
  for select using (auth.role() = 'authenticated');

-- Students can only insert and update their own canonical profile
create policy "Users manage own student profile" on public.student_profiles
  for all using (auth.uid() = id);

-- Username history visible to authenticated users for uniqueness validation
create policy "Username history visible to authenticated users" on public.username_history
  for select using (auth.role() = 'authenticated');

create policy "Users insert username history" on public.username_history
  for insert with check (auth.uid() = user_id);
