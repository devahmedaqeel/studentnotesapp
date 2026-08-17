-- ==============================================================================
-- MIGRATION: 003_remove_social_and_username_tables.sql
-- DESCRIPTION: Safely drops obsolete social, friend connection, 24h status,
--              privacy settings, and username history tables and policies.
-- ==============================================================================

-- 1. Drop 24-hour status views and statuses tables
drop table if exists public.status_views cascade;
drop table if exists public.student_statuses cascade;

-- 2. Drop student reports and privacy settings tables
drop table if exists public.student_reports cascade;
drop table if exists public.user_privacy_settings cascade;

-- 3. Drop student connections and blocked tables
drop table if exists public.student_blocked cascade;
drop table if exists public.student_connections cascade;

-- 4. Drop username history and public student profiles tables
drop table if exists public.username_history cascade;
drop table if exists public.student_profiles cascade;

-- 5. Drop obsolete storage bucket policies if any exist
drop policy if exists "Status media isolation" on storage.objects;
