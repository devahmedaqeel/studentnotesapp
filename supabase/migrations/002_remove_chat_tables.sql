-- Migration: 002_remove_chat_tables.sql
-- Safely drop user-to-user chat tables and associated RLS policies from Supabase

-- 1. Drop chat messages table and policies
drop table if exists public.chat_messages cascade;

-- 2. Drop chat conversation members and conversations
drop table if exists public.chat_conversation_members cascade;
drop table if exists public.chat_conversations cascade;

-- 3. Drop chat reports table if exists
drop table if exists public.chat_reports cascade;

-- Note: All unrelated tables (profiles, student_profiles, username_history, student_connections,
-- student_statuses, chat_status_views, notes, pdfs, documents, diary, timetable, saved_links) remain intact.
