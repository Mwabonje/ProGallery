import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type AuthenticatedPhotographer = { userId: string; admin: ReturnType<typeof createClient> };

export async function authenticatePhotographer(authorization?: string): Promise<AuthenticatedPhotographer | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { userId: data.user.id, admin };
}

export async function ownsGallery(admin: ReturnType<typeof createClient>, galleryId: string, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("galleries")
    .select("id")
    .eq("id", galleryId)
    .eq("photographer_id", userId)
    .maybeSingle();
  return !error && Boolean(data?.id);
}
