import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Safe environment variable retrieval
const getEnv = (key: string, fallback: string) => process.env[key] || fallback;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL', process.env.VITE_SUPABASE_URL || 'https://bdaqtpyzqutelkdgcoex.supabase.co');
  const supabaseKey = getEnv('REACT_APP_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: galleries, error } = await supabase
      .from("galleries")
      .select("id, created_at")
      .eq("link_enabled", true);

    if (error) {
      console.error("Error fetching galleries:", error);
      return { statusCode: 500, body: "Internal Server Error" };
    }

    const baseUrl = "https://mwabonje.netlify.app";
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    galleries?.forEach((gallery) => {
      xml += `
  <url>
    <loc>${baseUrl}/g/${gallery.id}</loc>
    <lastmod>${new Date(gallery.created_at || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += `\n</urlset>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
      body: xml,
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
