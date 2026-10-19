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
    const { data: blogs, error } = await supabase
      .from("blogs")
      .select("slug, date")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching blogs:", error);
    }

    const baseUrl = (process.env.SITE_URL && !process.env.SITE_URL.includes("netlify.app"))
      ? process.env.SITE_URL
      : "https://mwabonje.co.ke";
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    blogs?.forEach((blog) => {
      xml += `
  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.date || Date.now()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
