import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

// Fallback list of known published articles with their verified publication dates
const FALLBACK_PUBLISHED_BLOGS = [
  { slug: "why-professional-photography-is-better-than-smartphone-photos", date: "2026-07-19" },
  { slug: "top-beach-photography-spots-in-watamu", date: "2026-07-19" },
  { slug: "indoor-vs-outdoor-photography-which-is-better", date: "2026-07-19" },
  { slug: "why-golden-hour-is-the-best-time-for-photos", date: "2026-07-19" },
  { slug: "professional-photographers-in-malindi", date: "2026-07-20" },
  { slug: "why-lamu-is-perfect-for-pre-wedding-photography", date: "2026-10-15" },
  { slug: "best-places-for-a-photoshoot-in-lamu-kenya", date: "2026-10-15" }
];

function formatW3CDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0]; // W3C YYYY-MM-DD format
}

async function generateSitemap() {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`
  };

  let blogs = [];

  try {
    const blogsRes = await fetch(`${SUPABASE_URL}/rest/v1/blogs?select=slug,date,status,password`, { headers });
    if (blogsRes.ok) {
      const rawBlogs = await blogsRes.json();
      const now = new Date();
      blogs = rawBlogs.filter((b) => {
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
  } catch (err) {
    console.warn("Could not fetch remote blogs for sitemap, using fallback verified articles:", err);
  }

  if (!blogs || blogs.length === 0) {
    blogs = FALLBACK_PUBLISHED_BLOGS;
  }

  // Standardise canonical domain: never allow netlify.app
  const domain = (process.env.SITE_URL && !process.env.SITE_URL.includes('netlify.app')) 
    ? process.env.SITE_URL.replace(/\/$/, '') 
    : 'https://mwabonje.co.ke';

  // Build clean, W3C standards-compliant sitemap XML without misleading changefreq/priority
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
  </url>
  <url>
    <loc>${domain}/about</loc>
  </url>
  <url>
    <loc>${domain}/faq</loc>
  </url>
  <url>
    <loc>${domain}/blog</loc>
  </url>`;

  for (const blog of blogs) {
    const lastmod = formatW3CDate(blog.date);
    sitemap += `
  <url>
    <loc>${domain}/blog/${blog.slug}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
  }

  sitemap += `
</urlset>
`;

  // Write to both dist and public so it works in dev and prod
  const distDir = path.join(process.cwd(), 'dist');
  const distPath = path.join(distDir, 'sitemap.xml');
  const publicPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(distPath, sitemap);
  }
  fs.writeFileSync(publicPath, sitemap);
  
  console.log(`Sitemap generated successfully with ${4 + blogs.length} URLs.`);
}

generateSitemap();
