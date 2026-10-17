import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string, fallback: string) => process.env[key] || fallback;

export const handler: Handler = async (event) => {
  const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL', process.env.VITE_SUPABASE_URL || 'https://bdaqtpyzqutelkdgcoex.supabase.co');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (event.httpMethod === "GET") {
    const galleryId = event.queryStringParameters?.id || event.queryStringParameters?.galleryId;
    if (!galleryId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing gallery id" }) };
    }

    try {
      const { data, error } = await supabase
        .from("files")
        .select("id")
        .eq("gallery_id", galleryId)
        .eq("file_path", "GALLERY_PASSWORD")
        .maybeSingle();

      if (error) {
        console.error("Error checking gallery password status:", error);
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow"
        },
        body: JSON.stringify({ requiresPassword: Boolean(data?.id) })
      };
    } catch (err: any) {
      return { statusCode: 500, body: JSON.stringify({ error: "Internal error checking password status" }) };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const galleryId = body.galleryId || body.id || event.queryStringParameters?.id;
      const submittedPassword = (body.password || "").trim();

      if (!galleryId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing gallery id" }) };
      }

      const { data, error } = await supabase
        .from("files")
        .select("caption")
        .eq("gallery_id", galleryId)
        .eq("file_path", "GALLERY_PASSWORD")
        .maybeSingle();

      if (error) {
        console.error("Error verifying password:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to verify password" }) };
      }

      // If no password set, gallery is public
      if (!data || !data.caption || data.caption.trim() === "") {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" },
          body: JSON.stringify({ success: true, requiresPassword: false })
        };
      }

      const expectedPassword = data.caption.trim();
      if (submittedPassword === expectedPassword) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" },
          body: JSON.stringify({ success: true, requiresPassword: true })
        };
      } else {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" },
          body: JSON.stringify({ success: false, error: "Incorrect password" })
        };
      }
    } catch (err: any) {
      return { statusCode: 500, body: JSON.stringify({ error: "Invalid request payload" }) };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
