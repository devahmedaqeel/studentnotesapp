# SUPABASE SETUP & CONFIGURATION GUIDE

This document provides step-by-step instructions to set up and configure your **Supabase Cloud Project** for StudentNotes optional cloud backup and synchronization.

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
3. Copy and paste the complete contents of `supabase/migrations/001_initial_schema.sql` (or `SUPABASE_SCHEMA.sql`).
4. Click **Run**.

This initializes the following tables with **Row Level Security (RLS)** policies enabled:
- `profiles` (`id = auth.uid()`)
- `subjects` (`user_id = auth.uid()`)
- `folders` (`user_id = auth.uid()`)
- `notes` (`user_id = auth.uid()`)
- `note_pages` (`user_id = auth.uid()`)
- `pdfs` (`user_id = auth.uid()`)
- `tags` & `note_tags`
- `trash` (`user_id = auth.uid()`)

---

## 4. Storage Buckets Setup

1. Go to Supabase Dashboard -> **Storage**.
2. Click **New Bucket** and create the following three buckets:
   - Bucket Name: `note-files` (Public: **Yes**)
   - Bucket Name: `pdf-files` (Public: **Yes**)
   - Bucket Name: `avatars` (Public: **Yes**)

Storage access rules applied by `001_initial_schema.sql` ensure users can only upload to and manage their own folder path (`{userId}/*`).

---

## 5. Enable Authentication Providers

### Email & Password Authentication
1. Go to **Authentication -> Providers -> Email**.
2. Toggle **Enable Email provider**.
3. (Optional) Disable **Confirm Email** if you want instant login during development.

### Google OAuth Authentication
1. Go to **Authentication -> Providers -> Google**.
2. Toggle **Enable Google provider**.
3. Provide your Google Cloud OAuth Client ID and Secret.
4. Set Redirect URL: `studentnotes://` and `https://your-project-id.supabase.co/auth/v1/callback`.

---

## 6. Testing Cloud Backup & Sync

1. Open StudentNotes in **Expo Go**.
2. Tap **Create Account** or **Sign In**.
3. Go to **Settings** or **Profile** and tap **Sync & Backup Now**.
4. Check your Supabase Dashboard -> **Table Editor** (`notes`, `pdfs`) and **Storage** to confirm files and metadata are backed up cleanly.
