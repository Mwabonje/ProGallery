import fs from 'fs';
import path from 'path';

const CANONICAL_ORIGIN = 'https://mwabonje.co.ke';
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  'https://bdaqtpyzqutelkdgcoex.supabase.co';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';

const STATIC_PUBLIC_PATHS = ['/', '/about', '/faq', '/blog'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISALLOWED_PATH_PREFIXES = ['/g/', '/gallery/', '/dashboard', '/admin', '/login', '/api/', '/.netlify/', '/p/', '/prints'];

function resolveCanonicalOrigin() {
  const raw = process.env.SITE_URL;
  if (!raw) return CANONICAL_ORIGIN;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes('netlify.app')) return CANONICAL_ORIGIN;
    return `https://${parsed.host}`.replace(/\/$/, '');
  } catch {
    return CANONICAL_ORIGIN;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatW3CDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function isAllowedPublicPath(pathname) {
  if (!pathname.startsWith('/')) return false;
  if (DISALLOWED_PATH_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix))) {
    return false;
  }
  const stripped = pathname.replace(/^\/+|\/+$/g, '');
  if (UUID_REGEX.test(stripped)) return false;
  return true;
}

function isIndexablePublishedPost(post, now) {
  if (!post || typeof post.slug !== 'string') return false;
  const cleanSlug = post.slug.trim().replace(/^\/+|\/+$/g, '');
  if (!cleanSlug || cleanSlug.includes('/') || UUID_REGEX.test(cleanSlug)) return false;

  const status = String(post.status || 'published').toLowerCase().trim();
  if (status === 'scheduled') {
    const postDate = new Date(post.date);
    if (isNaN(postDate.getTime()) || postDate > now) return false;
  } else if (status !== 'published') {
    return false;
  }

  if (post.password && String(post.password).trim() !== '') return false;
  if (post.noindex === true) return false;

  return true;
}

async function fetchAllPublishedBlogs() {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  const pageSize = 1000;
  const allRows = [];
  let offset = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/blogs?select=slug,date,created_at,status&or=(status.eq.published,status.eq.scheduled,status.is.null)&order=date.desc`;
    const res = await fetch(url, {
      headers: {
        ...headers,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Supabase blogs query failed (${res.status} ${res.statusText}): ${errorBody}`);
    }

    const batch = await res.json();
    if (!Array.isArray(batch)) {
      throw new Error('Unexpected non-array response from Supabase blogs endpoint.');
    }

    allRows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  const now = new Date();
  return allRows.filter((post) => isIndexablePublishedPost(post, now));
}

async function generateSitemap() {
  const domain = resolveCanonicalOrigin();
  const blogs = await fetchAllPublishedBlogs();

  const urlEntries = new Map();

  for (const staticPath of STATIC_PUBLIC_PATHS) {
    if (!isAllowedPublicPath(staticPath)) continue;
    const canonicalPath = staticPath === '/' ? '/' : staticPath.replace(/\/+$/, '');
    const loc = `${domain}${canonicalPath}`;
    if (!urlEntries.has(loc)) {
      urlEntries.set(loc, { loc, lastmod: null });
    }
  }

  for (const blog of blogs) {
    const cleanSlug = blog.slug.trim().replace(/^\/+|\/+$/g, '');
    const blogPath = `/blog/${encodeURIComponent(cleanSlug)}`;
    if (!isAllowedPublicPath(blogPath)) continue;

    const loc = `${domain}${blogPath}`;
    const lastmod = formatW3CDate(blog.date) || formatW3CDate(blog.created_at);
    if (!urlEntries.has(loc)) {
      urlEntries.set(loc, { loc, lastmod });
    }
  }

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const entry of urlEntries.values()) {
    sitemap += `\n  <url>\n    <loc>${escapeXml(entry.loc)}</loc>`;
    if (entry.lastmod) {
      sitemap += `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`;
    }
    sitemap += `\n  </url>`;
  }

  sitemap += `\n</urlset>\n`;

  const distDir = path.join(process.cwd(), 'dist');
  const distPath = path.join(distDir, 'sitemap.xml');
  const publicPath = path.join(process.cwd(), 'public', 'sitemap.xml');

  if (fs.existsSync(distDir)) {
    fs.writeFileSync(distPath, sitemap, 'utf8');
  }
  fs.writeFileSync(publicPath, sitemap, 'utf8');

  console.log(`Sitemap generated successfully with ${urlEntries.size} URLs (${blogs.length} published blog posts).`);
}

generateSitemap().catch((err) => {
  console.error('Failed to generate sitemap.xml:', err);
  process.exit(1);
});
