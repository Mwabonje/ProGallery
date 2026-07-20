import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

async function generateSitemap() {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`
  };

  try {
    const blogsRes = await fetch(`${SUPABASE_URL}/rest/v1/blogs?select=slug,date`, { headers });
    let blogs = [];
    if (blogsRes.ok) {
       blogs = await blogsRes.json();
    }

    const galleriesRes = await fetch(`${SUPABASE_URL}/rest/v1/galleries?select=id,created_at&link_enabled=eq.true`, { headers });
    let galleries = [];
    if (galleriesRes.ok) {
        galleries = await galleriesRes.json();
    }

    const domain = 'https://mwabonje.com';

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${domain}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${domain}/prints</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const blog of blogs) {
      sitemap += `
  <url>
    <loc>${domain}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.date || Date.now()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    for (const gallery of galleries) {
      sitemap += `
  <url>
    <loc>${domain}/g/${gallery.id}</loc>
    <lastmod>${new Date(gallery.created_at || Date.now()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;

    // Write to both dist and public so it works in dev and prod
    const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
    const publicPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      fs.writeFileSync(distPath, sitemap);
    }
    fs.writeFileSync(publicPath, sitemap);
    
    console.log("Sitemap generated successfully.");
  } catch (err) {
    console.error("Error generating sitemap:", err);
  }
}

generateSitemap();
