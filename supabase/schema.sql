-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLES

-- Create galleries table
CREATE TABLE IF NOT EXISTS public.galleries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  title text,
  agreed_balance numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  link_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_type text CHECK (file_type IN ('image', 'video')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  download_count integer DEFAULT 0
);

-- Create activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- 2. ROW LEVEL SECURITY (RLS)

-- Enable RLS
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR GALLERIES

-- Photographers can do everything to their own galleries
DROP POLICY IF EXISTS "Photographers can manage own galleries" ON public.galleries;
CREATE POLICY "Photographers can manage own galleries"
ON public.galleries
FOR ALL
USING (auth.uid() = photographer_id);

-- Public can VIEW galleries only if link_enabled is true
DROP POLICY IF EXISTS "Public can view active galleries" ON public.galleries;
CREATE POLICY "Public can view active galleries"
ON public.galleries
FOR SELECT
USING (link_enabled = true);


-- POLICIES FOR FILES

-- Photographers can manage files in their galleries
DROP POLICY IF EXISTS "Photographers can manage own files" ON public.files;
CREATE POLICY "Photographers can manage own files"
ON public.files
FOR ALL
USING (
  gallery_id IN (
    SELECT id FROM public.galleries WHERE photographer_id = auth.uid()
  )
);

-- Public can VIEW/SELECT files only if:
-- 1. Gallery is enabled
-- 2. File is NOT expired
DROP POLICY IF EXISTS "Public can view non-expired files in active galleries" ON public.files;
CREATE POLICY "Public can view non-expired files in active galleries"
ON public.files
FOR SELECT
USING (
  expires_at > now() AND
  gallery_id IN (
    SELECT id FROM public.galleries WHERE link_enabled = true
  )
);

-- POLICIES FOR ACTIVITY LOGS
DROP POLICY IF EXISTS "Photographers can manage logs" ON public.activity_logs;
CREATE POLICY "Photographers can manage logs"
ON public.activity_logs
FOR ALL
USING (
  gallery_id IN (
    SELECT id FROM public.galleries WHERE photographer_id = auth.uid()
  )
);


-- 3. FUNCTIONS

-- Helper to increment download count safely
CREATE OR REPLACE FUNCTION increment_download(row_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.files
  SET download_count = download_count + 1
  WHERE id = row_id;
END;
$$;

-- 5. ACCOUNT MANAGEMENT

-- Explicitly drop the function if it exists to ensure signature matches
DROP FUNCTION IF EXISTS public.delete_own_account();

-- Allow users to delete their own account
-- Using RETURNS json to prevent issues with void returns in some clients
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
-- Set search path to include storage schema access
SET search_path = public, storage, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if user exists/authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Delete all storage objects owned by the user to prevent FK constraint violations
  -- This handles orphaned files that might not be in the public.files table
  -- We delete from storage.objects where owner is the current user
  DELETE FROM storage.objects 
  WHERE owner = current_user_id;

  -- 2. Delete the user
  DELETE FROM auth.users WHERE id = current_user_id;
  
  RETURN json_build_object('status', 'success');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- 4. STORAGE SETUP

-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-files', 'gallery-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'gallery-files' );

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'gallery-files' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'gallery-files' AND auth.role() = 'authenticated' );

-- FORCE CACHE RELOAD
-- This notifies PostgREST to reload the schema cache immediately
NOTIFY pgrst, 'reload schema';
