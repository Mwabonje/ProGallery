import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const CANONICAL_ORIGIN = "https://mwabonje.co.ke";
const STATIC_PUBLIC_PATHS = ["/", "/about", "/faq", "/blog"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveCanonicalOrigin(): string {
  const raw = process.env.SITE_URL;
  if (!raw) return CANONICAL_ORIGIN;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("netlify.app")) return CANONICAL_ORIGIN;
    return `https://${parsed.host}`.replace(/\/$/, "");
  } catch {
    return CANONICAL_ORIGIN;
  }
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatW3CDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    "https://bdaqtpyzqutelkdgcoex.supabase.co";
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const pageSize = 1000;
    const allRows: Array<{ slug: string; date?: string | null; created_at?: string | null; status?: string | null }> = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("blogs")
        .select("slug, date, created_at, status")
        .or("status.eq.published,status.eq.scheduled,status.is.null")
        .order("date", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Supabase blogs query failed: ${error.message}`);
      }

      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    const now = new Date();
    const publishedBlogs = allRows.filter((b) => {
      if (!b || typeof b.slug !== "string") return false;
      const cleanSlug = b.slug.trim().replace(/^\/+|\/+$/g, "");
      if (!cleanSlug || cleanSlug.includes("/") || UUID_REGEX.test(cleanSlug)) return false;

      const status = String(b.status || "published").toLowerCase().trim();
      if (status === "scheduled") {
        const postDate = b.date ? new Date(b.date) : null;
        if (!postDate || isNaN(postDate.getTime()) || postDate > now) return false;
      } else if (status !== "published") {
        return false;
      }

      return true;
    });

    const baseUrl = resolveCanonicalOrigin();
    const urlEntries = new Map<string, { loc: string; lastmod: string | null }>();

    for (const staticPath of STATIC_PUBLIC_PATHS) {
      const loc = `${baseUrl}${staticPath}`;
      urlEntries.set(loc, { loc, lastmod: null });
    }

    for (const blog of publishedBlogs) {
      const cleanSlug = blog.slug.trim().replace(/^\/+|\/+$/g, "");
      const loc = `${baseUrl}/blog/${encodeURIComponent(cleanSlug)}`;
      const lastmod = formatW3CDate(blog.date) || formatW3CDate(blog.created_at);
      if (!urlEntries.has(loc)) {
        urlEntries.set(loc, { loc, lastmod });
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    for (const entry of urlEntries.values()) {
      xml += `\n  <url>\n    <loc>${escapeXml(entry.loc)}</loc>`;
      if (entry.lastmod) {
        xml += `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`;
      }
      xml += `\n  </url>`;
    }

    xml += `\n</urlset>\n`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
        "Cache-Control": "public, max-age=3600",
      },
      body: xml,
    };
  } catch (err) {
    console.error("Sitemap generation error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
