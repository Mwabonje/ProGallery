-- 1. TABLES

-- Create galleries table
CREATE TABLE public.galleries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  title text,
  agreed_balance numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  link_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create files table
CREATE TABLE public.files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_type text CHECK (file_type IN ('image', 'video')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  download_count integer DEFAULT 0
);

-- Create activity logs
CREATE TABLE public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE,
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
CREATE POLICY "Photographers can manage own galleries"
ON public.galleries
FOR ALL
USING (auth.uid() = photographer_id);

-- Public can VIEW galleries only if link_enabled is true (for gallery details page)
CREATE POLICY "Public can view active galleries"
ON public.galleries
FOR SELECT
USING (link_enabled = true);


-- POLICIES FOR FILES

-- Photographers can manage files in their galleries
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
CREATE POLICY "Public can view non-expired files in active galleries"
ON public.files
FOR SELECT
USING (
  expires_at > now() AND
  gallery_id IN (
    SELECT id FROM public.galleries WHERE link_enabled = true
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

-- 4. STORAGE SETUP (Manual Step required in Supabase Dashboard usually, but here is policy)
-- Bucket: 'gallery-files'
-- Policy: Public Access allowed for READ, Auth required for INSERT/UPDATE/DELETE
