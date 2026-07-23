import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Fetch the original HTML response
  const response = await context.next();
  // Ensure we only process HTML responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  // @ts-ignore
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL") || "https://bdaqtpyzqutelkdgcoex.supabase.co";
  // @ts-ignore
  const supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY") || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`
  };

  try {
    if (path.startsWith('/blog/')) {
      const slug = path.split('/').pop();
      const res = await fetch(`${supabaseUrl}/rest/v1/blogs?slug=eq.${slug}&select=title,excerpt,cover_image&limit=1`, { headers });
      
      if (res.ok) {
        const posts = await res.json();
        if (posts && posts.length > 0) {
          const post = posts[0];
          const title = `${post.title} | Mwabonje`;
          const description = post.excerpt || "";
          const image = post.cover_image || "https://mwabonje.netlify.app/og-image.jpg";
          
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
    } else if (path.startsWith('/g/') || path.startsWith('/gallery/')) {
      const id = path.split('/').pop();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "");
      
      if (isUUID) {
        const res = await fetch(`${supabaseUrl}/rest/v1/galleries?id=eq.${id}&select=client_name,title&limit=1`, { headers });
        if (res.ok) {
          const galleries = await res.json();
          if (galleries && galleries.length > 0) {
            const gallery = galleries[0];
            const title = gallery.title || `${gallery.client_name} Gallery | Mwabonje`;
            const description = `View the ${gallery.client_name} photography gallery by Mwabonje. Discover stunning visual storytelling and beautiful moments.`;
            let image = "https://mwabonje.netlify.app/og-image.jpg";

            // Fetch cover image
            const filesRes = await fetch(`${supabaseUrl}/rest/v1/files?gallery_id=eq.${id}&select=file_url&limit=1&order=expires_at.asc`, { headers });
            if (filesRes.ok) {
              const files = await filesRes.json();
              if (files && files.length > 0 && files[0].file_url) {
                image = files[0].file_url;
              }
            }

            html = html.replace(/<title>.*?<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`);
            html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`);
            html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`);
            html = html.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`);
            html = html.replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="website" />`);
            html = html.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`);
            html = html.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`);
            html = html.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${image}" />`);
          }
        }
      }
    }
  } catch (e) {
    console.error("OG injection error:", e);
  }

  // Return the modified response
  return new Response(html, response);
};