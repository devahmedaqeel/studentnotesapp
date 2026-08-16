# SUPABASE SETUP & CONFIGURATION GUIDE

This document provides step-by-step instructions to configure your **Supabase Cloud Project** for StudentNotes cloud backup, authentication, and synchronization.

---

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, enter project name `StudentNotes`, set a secure database password, and select your region.
3. Once provisioned, navigate to **Project Settings -> API** and copy:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon / public key** (JWT token starting with `ey...`)

---

## 2. Environment Variables (.env)

Create a `.env` file in the root of your React Native application using `.env.example` as a template:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> [!WARNING]
> Never include your `service_role` secret in your React Native app. Only `EXPO_PUBLIC_SUPABASE_ANON_KEY` is safe for client applications.

---

## 3. Database Schema & RLS Migrations

1. Go to your Supabase Dashboard -> **SQL Editor**.
2. Click **New Query**.
3. Copy and paste the complete contents of `SUPABASE_SCHEMA.sql`.
4. Click **Run**.

This initializes the tables with **Row Level Security (RLS)** policies enabled:
- `profiles` & `student_profiles`
- `subjects` & `folders`
- `notes`, `note_pages`, `tags`, `note_tags`
- `pdfs`
- `documents` & `document_folders`
- `diary_events` & `diary_attachments`
- `timetable_classes` & `timetable_settings`
- `saved_links`
- `student_connections` & `student_blocked`
- `student_statuses` & `status_views`
- `username_history` & `user_privacy_settings`

---

## 4. Storage Buckets Setup

1. Go to Supabase Dashboard -> **Storage**.
2. Click **New Bucket** and create the following buckets:
   - `note-files` (Public: **Yes**)
   - `pdf-files` (Public: **Yes**)
   - `avatars` (Public: **Yes**)
   - `documents` (Public: **Yes**)
   - `status-media` (Public: **Yes**)

Storage access rules applied by `SUPABASE_SCHEMA.sql` ensure users can only upload to and manage their own folder path (`{userId}/*`).

---

## 5. Enable Authentication Providers

### Email & Password Authentication
1. Go to **Authentication -> Providers -> Email**.
2. Toggle **Enable Email provider**.

### Google OAuth Authentication
1. Go to **Authentication -> Providers -> Google**.
2. Toggle **Enable Google provider**.
3. Provide your Google Cloud OAuth Client ID and Secret.
4. Set Redirect URL: `studentnotes://` and `https://your-project-id.supabase.co/auth/v1/callback`.

---

## 6. Testing Cloud Backup & Sync

1. Open StudentNotes in **Expo Go** or native build.
2. Tap **Create Account** or **Sign In**.
3. Go to **Settings** or **Profile** and tap **Sync & Backup Now**.
4. Check your Supabase Dashboard -> **Table Editor** and **Storage** to confirm files and metadata are backed up cleanly.
