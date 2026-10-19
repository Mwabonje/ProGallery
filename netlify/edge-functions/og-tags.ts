import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Canonical Domain Consolidation: 301 redirect legacy netlify hostname to mwabonje.co.ke
  if (url.hostname.includes("mwabonje.netlify.app")) {
    return Response.redirect(`https://mwabonje.co.ke${path}${url.search}`, 301);
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
  const isBlogRoute = path.startsWith('/blog/');

  // @ts-ignore
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL") || "https://bdaqtpyzqutelkdgcoex.supabase.co";
  // @ts-ignore
  const supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY") || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`
  };

  const responseHeaders = new Headers(response.headers);

  try {
    if (isBlogRoute) {
      // For public blog routes, inject canonical URL and og:url on preferred origin
      const canonicalOrigin = "https://mwabonje.co.ke";
      const canonicalUrl = `${canonicalOrigin}${path}`;
      if (html.includes('<link rel="canonical"')) {
        html = html.replace(/<link rel="canonical"[^>]*>/, `  <link rel="canonical" href="${canonicalUrl}" />`);
      } else {
        html = html.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
      }
      if (html.includes('<meta property="og:url"')) {
        html = html.replace(/<meta property="og:url"[^>]*>/, `  <meta property="og:url" content="${canonicalUrl}" />`);
      } else {
        html = html.replace('</head>', `  <meta property="og:url" content="${canonicalUrl}" />\n</head>`);
      }

      const slug = path.split('/').pop();
      const res = await fetch(`${supabaseUrl}/rest/v1/blogs?slug=eq.${slug}&select=title,excerpt,cover_image&limit=1`, { headers });
      
      if (res.ok) {
        const posts = await res.json();
        if (posts && posts.length > 0) {
          const post = posts[0];
          const title = `${post.title} | Mwabonje`;
          const description = post.excerpt || "";
          const image = post.cover_image || "https://mwabonje.co.ke/og-image.jpg";
          
          html = html.replace(/<title>.*?<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`);
          html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`);
          html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`);
          html = html.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`);
          html = html.replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="article" />`);
          html = html.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`);
          html = html.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`);
          html = html.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${image}" />`);
        }
      }
    } else if (isPrivateGalleryRoute || isProtectedAdminRoute) {
      // SECURITY & SEO PROTECTION:
      // 1. Strictly set X-Robots-Tag response header
      responseHeaders.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

      // 2. Inject meta robots noindex tags into HTML
      const robotsTags = `  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />\n  <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />\n</head>`;
      html = html.replace('</head>', robotsTags);

      // 3. Remove any existing canonical URL tags on protected routes
      html = html.replace(/<link rel="canonical"[^>]*>/g, '');

      // 4. Scrub crawler metadata: do NOT fetch or expose private client names, titles, or private photos
      const genericTitle = isProtectedAdminRoute 
        ? (path.startsWith('/login') ? "Photographer Portal | Mwabonje" : "Dashboard | Mwabonje") 
        : "Private Client Gallery | Mwabonje";
      const genericDescription = isProtectedAdminRoute 
        ? "Mwabonje Photographer Portal" 
        : "Private client delivery gallery.";
      
      html = html.replace(/<title>.*?<\/title>/, `<title>${genericTitle}</title>`);
      html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${genericTitle}" />`);
      html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${genericDescription}" />`);
      html = html.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${genericTitle}" />`);
      html = html.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${genericDescription}" />`);
      
      // Remove any OG/Twitter image that might reference private client files
      html = html.replace(/<meta property="og:image" content=".*?" \/>/, '');
      html = html.replace(/<meta name="twitter:image" content=".*?" \/>/, '');
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