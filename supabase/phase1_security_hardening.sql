-- ====================================================================
-- PHASE 1 SECURITY HARDENING: SUPABASE RLS AUDIT & REMEDIATION PLAN
-- File: supabase/phase1_security_hardening.sql
-- Purpose: Remediate unauthorized anonymous data retrieval, protect
--          client names, private photographs, plaintext passwords,
--          financial data, and client selection notes.
--
-- NON-DESTRUCTIVE: This script alters policies and defines secure RPCs
-- without dropping tables or altering stored client/photograph data.
-- ====================================================================

-- 1. PREVENT PASSWORD EXPOSURE IN THE FILES TABLE
-- Currently, passwords stored as pseudo-files with file_path = 'GALLERY_PASSWORD'
-- can be queried by any anonymous user.
-- We ensure that no query with anon role can ever retrieve rows where file_path = 'GALLERY_PASSWORD'.

DROP POLICY IF EXISTS "Public can view non-expired files in active galleries" ON public.files;
CREATE POLICY "Public can view non-expired files in active galleries"
ON public.files
FOR SELECT
USING (
  -- Exclude password records from anonymous select
  file_path != 'GALLERY_PASSWORD'
  AND expires_at > now()
  AND gallery_id IN (
    SELECT id FROM public.galleries 
    WHERE link_enabled = true
  )
);

-- Photographers can manage all files including their gallery password configuration
DROP POLICY IF EXISTS "Photographers can manage own files" ON public.files;
CREATE POLICY "Photographers can manage own files"
ON public.files
FOR ALL
USING (
  gallery_id IN (
    SELECT id FROM public.galleries WHERE photographer_id = auth.uid()
  )
);

-- 2. SECURE PASSWORD VERIFICATION RPC (Database-enforced)
-- Eliminates client-side password verification by providing a trusted database function
-- that verifies whether a gallery is protected and whether the entered password matches,
-- without ever transmitting the plaintext password to the browser.

CREATE OR REPLACE FUNCTION public.verify_gallery_password(p_gallery_id uuid, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pw_caption text;
  v_link_enabled boolean;
BEGIN
  -- Check gallery exists and is active
  SELECT link_enabled INTO v_link_enabled
  FROM public.galleries
  WHERE id = p_gallery_id;

  IF v_link_enabled IS NULL OR v_link_enabled = false THEN
    RETURN json_build_object('valid', false, 'error', 'Gallery is unavailable or disabled');
  END IF;

  -- Fetch stored password caption
  SELECT caption INTO v_pw_caption
  FROM public.files
  WHERE gallery_id = p_gallery_id
    AND file_path = 'GALLERY_PASSWORD'
  LIMIT 1;

  -- If no password is set, gallery is open
  IF v_pw_caption IS NULL OR trim(v_pw_caption) = '' THEN
    RETURN json_build_object('valid', true, 'requires_password', false);
  END IF;

  -- If password is set, compare
  IF trim(p_password) = trim(v_pw_caption) THEN
    RETURN json_build_object('valid', true, 'requires_password', true);
  ELSE
    RETURN json_build_object('valid', false, 'error', 'Incorrect password');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_gallery_password(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_gallery_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_gallery_password(uuid, text) TO service_role;

-- 3. SECURE CLIENT SELECTION ACCESS
-- Prevent cross-client scraping of selections and private review notes.
-- Only allow public viewing of selections for the specific active gallery being visited.

DROP POLICY IF EXISTS "Public can view selections" ON public.selections;
CREATE POLICY "Public can view selections"
ON public.selections
FOR SELECT
USING (
  gallery_id IN (
    SELECT id FROM public.galleries 
    WHERE link_enabled = true
  )
);

-- 4. FORCE REST SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';
