import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Canonical Domain Consolidation: 301 redirect legacy netlify hostname to mwabonje.co.ke
  if (url.hostname.includes("mwabonje.netlify.app")) {
    return Response.redirect(`https://mwabonje.co.ke${path}${url.search}`, 301);
  }

  // Fast bypass for API endpoints, Netlify internal functions, and static files
  if (
    path === "/api" ||
    path.startsWith("/api/") ||
    path.startsWith("/.netlify/") ||
    path.startsWith("/assets/") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.endsWith(".xml") ||
    path.endsWith(".txt") ||
    path.endsWith(".json") ||
    path.endsWith(".webmanifest")
  ) {
    return context.next();
  }

  // Fetch the original HTML response
  const response = await context.next();
  // Ensure we only process HTML responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  const isUUID = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path);
  const isProtectedAdminRoute = path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/login');
  const isPrivateGalleryRoute = path.startsWith('/g/') || path.startsWith('/gallery/') || isUUID;
  
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  const isBlogPostRoute = cleanPath.startsWith('/blog/') && cleanPath !== '/blog';
  const isBlogIndex = cleanPath === '/blog';
  const isAboutRoute = cleanPath === '/about';
  const isFaqRoute = cleanPath === '/faq';
  const isHomeRoute = cleanPath === '/' || cleanPath === '';

  // @ts-ignore
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL") || "https://bdaqtpyzqutelkdgcoex.supabase.co";
  // @ts-ignore
  const supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY") || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`
  };

  const responseHeaders = new Headers(response.headers);

  // Ensures exactly one canonical tag, og:url, and twitter:url exist
  const setCanonicalAndUrl = (targetHtml: string, canonicalUrl: string): string => {
    let out = targetHtml;
    // Strip existing tags
    out = out.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, '');
    out = out.replace(/<link\s+[^>]*href=["'][^"']*["']\s+rel=["']canonical["'][^>]*>/gi, '');
    out = out.replace(/<meta\s+[^>]*property=["']og:url["'][^>]*>/gi, '');
    out = out.replace(/<meta\s+[^>]*name=["']twitter:url["'][^>]*>/gi, '');

    // Inject exactly one pristine set right before </head>
    const injection = `  <link rel="canonical" href="${canonicalUrl}" />\n  <meta property="og:url" content="${canonicalUrl}" />\n  <meta name="twitter:url" content="${canonicalUrl}" />\n</head>`;
    return out.replace('</head>', injection);
  };

  const setMetaTags = (targetHtml: string, title: string, description: string, image?: string, type = "website") => {
    let out = targetHtml;
    out = out.replace(/<title>.*?<\/title>/i, `<title>${title.replace(/</g, '&lt;')}</title>`);
    out = out.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`);
    out = out.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`);
    out = out.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`);
    out = out.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="${type}" />`);
    out = out.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`);
    out = out.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`);
    if (image) {
      out = out.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${image}" />`);
      out = out.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${image}" />`);
    }
    return out;
  };

  try {
    if (isPrivateGalleryRoute || isProtectedAdminRoute) {
      // SECURITY & SEO PROTECTION:
      // 1. Strictly set X-Robots-Tag response header
      responseHeaders.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

      // 2. Inject meta robots noindex tags into HTML
      const robotsTags = `  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />\n  <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />\n</head>`;
      html = html.replace('</head>', robotsTags);

      // 3. Remove any canonical URL tag on protected routes
      html = html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, '');
      html = html.replace(/<link\s+[^>]*href=["'][^"']*["']\s+rel=["']canonical["'][^>]*>/gi, '');

      // 4. Scrub crawler metadata: do NOT expose private client names, titles, or private photos
      const genericTitle = isProtectedAdminRoute 
        ? (path.startsWith('/login') ? "Photographer Portal | Mwabonje" : "Dashboard | Mwabonje") 
        : "Private Client Gallery | Mwabonje";
      const genericDescription = isProtectedAdminRoute 
        ? "Mwabonje Photographer Portal" 
        : "Private client delivery gallery.";
      
      html = setMetaTags(html, genericTitle, genericDescription, "", "website");
      html = html.replace(/<meta property="og:image" content=".*?" \/>/i, '');
      html = html.replace(/<meta name="twitter:image" content=".*?" \/>/i, '');
    } else if (isBlogPostRoute) {
      const canonicalOrigin = "https://mwabonje.co.ke";
      const canonicalUrl = `${canonicalOrigin}${cleanPath}`;
      html = setCanonicalAndUrl(html, canonicalUrl);

      const slug = cleanPath.split('/').pop();
      const res = await fetch(`${supabaseUrl}/rest/v1/blogs?slug=eq.${slug}&select=title,excerpt,cover_image&limit=1`, { headers });
      
      if (res.ok) {
        const posts = await res.json();
        if (posts && posts.length > 0) {
          const post = posts[0];
          const title = `${post.title} | Mwabonje`;
          const description = post.excerpt || "";
          const image = post.cover_image || "https://mwabonje.co.ke/og-image.jpg";
          html = setMetaTags(html, title, description, image, "article");
        }
      }
    } else if (isAboutRoute) {
      const canonicalUrl = "https://mwabonje.co.ke/about";
      html = setCanonicalAndUrl(html, canonicalUrl);
      const title = "About Mwabonje — Portrait & Lifestyle Photographer in Malindi, Kenya";
      const description = "Meet Mwabonje, an East African visual storyteller and lifestyle photographer based in Malindi, Kilifi County — capturing documentary portraits, coastal weddings, and architectural narratives across Watamu, Malindi, and Lamu.";
      html = setMetaTags(html, title, description, "https://mwabonje.co.ke/og-image.jpg", "profile");
    } else if (isFaqRoute) {
      const canonicalUrl = "https://mwabonje.co.ke/faq";
      html = setCanonicalAndUrl(html, canonicalUrl);
      const title = "Photography FAQs & Investment Guide | Mwabonje Malindi, Kenya";
      const description = "Find answers to frequently asked questions about booking wedding photography, portraits, hospitality shoots, payment schedules, and photo delivery with Mwabonje in Malindi, Watamu, and Lamu.";
      html = setMetaTags(html, title, description, "https://mwabonje.co.ke/og-image.jpg", "website");
    } else if (isBlogIndex) {
      const canonicalUrl = "https://mwabonje.co.ke/blog";
      html = setCanonicalAndUrl(html, canonicalUrl);
      const title = "Journal & Stories | Mwabonje Photography — Malindi, Kenya";
      const description = "Stories, wedding photography highlights, behind-the-scenes journals, and coastal visual narratives from Mwabonje Photography across Malindi, Watamu, and Lamu.";
      html = setMetaTags(html, title, description, "https://mwabonje.co.ke/og-image.jpg", "website");
    } else if (isHomeRoute) {
      const canonicalUrl = "https://mwabonje.co.ke/";
      html = setCanonicalAndUrl(html, canonicalUrl);
    } else {
      // Any other public route: normalize to canonical absolute URL on https://mwabonje.co.ke
      const canonicalUrl = `https://mwabonje.co.ke${cleanPath}`;
      html = setCanonicalAndUrl(html, canonicalUrl);
    }
  } catch (e) {
    console.error("OG injection error:", e);
  }

  // Return the modified response with updated headers
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};