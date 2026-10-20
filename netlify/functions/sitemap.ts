import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Safe environment variable retrieval
const getEnv = (key: string, fallback: string) => process.env[key] || fallback;

const FALLBACK_PUBLISHED_BLOGS = [
  { slug: "why-professional-photography-is-better-than-smartphone-photos", date: "2026-07-19" },
  { slug: "top-beach-photography-spots-in-watamu", date: "2026-07-19" },
  { slug: "indoor-vs-outdoor-photography-which-is-better", date: "2026-07-19" },
  { slug: "why-golden-hour-is-the-best-time-for-photos", date: "2026-07-19" },
  { slug: "professional-photographers-in-malindi", date: "2026-07-20" },
  { slug: "why-lamu-is-perfect-for-pre-wedding-photography", date: "2026-10-15" },
  { slug: "best-places-for-a-photoshoot-in-lamu-kenya", date: "2026-10-15" }
];

function formatW3CDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL', process.env.VITE_SUPABASE_URL || 'https://bdaqtpyzqutelkdgcoex.supabase.co');
  const supabaseKey = getEnv('REACT_APP_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let blogs = [];
    const { data, error } = await supabase
      .from("blogs")
      .select("slug, date, status, password")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching blogs:", error);
    } else if (data) {
      const now = new Date();
      blogs = data.filter((b) => {
        if (!b.slug) return false;
        const status = b.status || 'published';
        if (status === 'draft') return false;
        if (status === 'scheduled') {
          const postDate = new Date(b.date);
          if (isNaN(postDate.getTime()) || postDate > now) return false;
        }
        if (b.password && b.password.trim() !== '') return false;
        return true;
      });
    }

    if (!blogs || blogs.length === 0) {
      blogs = FALLBACK_PUBLISHED_BLOGS;
    }

    const baseUrl = (process.env.SITE_URL && !process.env.SITE_URL.includes("netlify.app"))
      ? process.env.SITE_URL.replace(/\/$/, '')
      : "https://mwabonje.co.ke";
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
  </url>
  <url>
    <loc>${baseUrl}/faq</loc>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
  </url>`;

    for (const blog of blogs) {
      const lastmod = formatW3CDate(blog.date);
      xml += `
  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
    }

    xml += `\n</urlset>\n`;

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
