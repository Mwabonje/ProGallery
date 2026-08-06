import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Check required environment variables
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  const VITE_R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL;

  const isR2Configured = Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    VITE_R2_PUBLIC_URL
  );

  let s3: S3Client | null = null;
  if (isR2Configured) {
    const accountId = R2_ACCOUNT_ID!.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '').replace(/\/$/, '');
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  // --- API ROUTES ---

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", r2Configured: isR2Configured });
  });

  // Generate a Pre-signed URL for uploading
  app.post("/api/upload-url", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured on the server" });
    }

    try {
      const { fileName, fileType } = req.body;
      
      if (!fileName || !fileType) {
         return res.status(400).json({ error: "fileName and fileType are required" });
      }

      // Generate a clean, unique file path mimicking what the app does
      const uniqueId = Math.random().toString(36).substring(2);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\_-]/g, "_");
      const filePath = `uploads/${Date.now()}_${uniqueId}/${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filePath,
        ContentType: fileType,
      });

      // URL expires in 15 minutes
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      
      // Clean up the public URL to ensure no double slashes
      const cleanPublicUrlBase = VITE_R2_PUBLIC_URL!.replace(/\/$/, "");
      const publicUrl = `${cleanPublicUrlBase}/${filePath}`;

      res.json({
        presignedUrl,
        publicUrl,
        filePath
      });
    } catch (e: any) {
      console.error("Presign error:", e);
      res.status(500).json({ error: "Failed to generate upload URL." });
    }
  });

  // Delete an object or objects
  app.post("/api/delete-file", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured" });
    }

    try {
      const { filePath, filePaths } = req.body;
      const pathsToDelete = filePaths || (filePath ? [filePath] : []);

      if (pathsToDelete.length === 0) {
        return res.status(400).json({ error: "No files to delete" });
      }

      for (let i = 0; i < pathsToDelete.length; i += 1000) {
        const chunk = pathsToDelete.slice(i, i + 1000);
        const command = new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME!,
          Delete: {
            Objects: chunk.filter(Boolean).map((Key: string) => ({ Key })),
            Quiet: true,
          },
        });
        await s3.send(command);
      }
      
      res.json({ success: true });
    } catch (e) {
      console.error("Delete error:", e);
      res.status(500).json({ error: "Failed to delete file(s) from R2." });
    }
  });

  // Delete an entire folder using a prefix
  app.post("/api/delete-folder", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured" });
    }

    try {
      const { folderPath } = req.body;
      if (!folderPath || folderPath === "uploads" || folderPath === "uploads/") {
        return res.status(400).json({ error: "Cannot delete the root folder" });
      }

      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME!,
        Prefix: folderPath.endsWith("/") ? folderPath : folderPath + "/",
      });

      const listResult = await s3.send(listCommand) as any;

      if (listResult.Contents && listResult.Contents.length > 0) {
        const pathsToDelete = listResult.Contents.map((obj: any) => obj.Key);
        
        for (let i = 0; i < pathsToDelete.length; i += 1000) {
          const chunk = pathsToDelete.slice(i, i + 1000);
          const command = new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME!,
            Delete: {
              Objects: chunk.map((Key: string) => ({ Key })),
              Quiet: true,
            },
          });
          await s3.send(command);
        }
      }
      
      res.json({ success: true });
    } catch (e) {
      console.error("Delete folder error:", e);
      res.status(500).json({ error: "Failed to delete folder from R2." });
    }
  });

  // Proxy the download to bypass CORS if Cloudflare bucket doesn't have CORS setup
  // While Cloudflare supports CORS, proxying makes it zero-setup for the user.
  // We'll redirect instead of streaming to save server bandwidth since Cloudflare R2 is fast, 
  // wait actually, for zip generation JSZip needs the actual data, so JSZip fetches the public URL
  // The public URL requires CORS if fetched directly via XHR/fetch!
  // BUT the user just sets up Cloudflare. Let's tell the user to set CORS OR proxy it.
  // Actually, wait, R2 public bucket access DOES NOT support CORS easily unless on a custom domain according to old docs.
  // Actually, R2 supports CORS. But it's easier to just fetch proxy if needed, though for large zips it's bad.
  // Given we are downloading photos locally to browser to zip, we MUST have CORS on Cloudflare R2.
  // We'll instruct the user.

  app.get("/api/storage-usage", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured" });
    }
    try {
      let totalBytes = 0;
      let isTruncated = true;
      let continuationToken = undefined;

      while (isTruncated) {
        const command: any = new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME!,
          ContinuationToken: continuationToken,
        });
        const response: any = await s3.send(command);
        if (response.Contents) {
          totalBytes += response.Contents.reduce((acc: number, item: any) => acc + (item.Size || 0), 0);
        }
        isTruncated = response.IsTruncated;
        continuationToken = response.NextContinuationToken;
      }
      
      const totalMB = totalBytes / (1024 * 1024);
      res.json({ totalStorageUsedMB: totalMB });
    } catch (e: any) {
      console.error("Storage usage error:", e);
      res.status(500).json({ error: "Failed to fetch storage usage", details: e.message || e.toString() });
    }
  });

  // --- Analytics APIs ---
  interface AnalyticsData {
      galleries: Record<string, {
          views: number;
          clicks: number;
          daily: Record<string, { views: number; clicks: number }>;
      }>;
  }
  let cachedAnalytics: AnalyticsData | null = null;
  const ANALYTICS_FILE = "analytics/data_v2.json";

  const getAnalytics = async (): Promise<AnalyticsData> => {
      if (!s3 || !isR2Configured) return { galleries: {} };
      if (cachedAnalytics !== null) return cachedAnalytics;
      try {
          const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME!, Key: ANALYTICS_FILE });
          const response = await s3.send(command);
          const str = await response.Body?.transformToString();
          cachedAnalytics = str ? JSON.parse(str) : { galleries: {} };
          return cachedAnalytics!;
      } catch (e: any) {
          if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
              cachedAnalytics = { galleries: {} };
              return cachedAnalytics;
          }
          console.error("Error reading analytics:", e);
          return { galleries: {} };
      }
  };

  const saveAnalytics = async (data: AnalyticsData) => {
      if (!s3 || !isR2Configured) return;
      try {
          const command = new PutObjectCommand({
              Bucket: R2_BUCKET_NAME!,
              Key: ANALYTICS_FILE,
              Body: JSON.stringify(data),
              ContentType: "application/json"
          });
          await s3.send(command);
      } catch (e) {
          console.error("Error saving analytics:", e);
      }
  };

  app.get("/api/sys/state", async (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      const data = await getAnalytics();
      res.json(data);
  });

  app.post("/api/sys/interaction", async (req, res) => {
      const { galleryId, event } = req.body; // event: 'view' | 'click'
      if (!galleryId || !event) return res.status(400).json({ error: "missing galleryId or event" });
      
      const data = await getAnalytics();
      const dateStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

      if (!data.galleries) data.galleries = {};
      if (!data.galleries[galleryId]) {
          data.galleries[galleryId] = { views: 0, clicks: 0, daily: {} };
      }
      if (!data.galleries[galleryId].daily[dateStr]) {
          data.galleries[galleryId].daily[dateStr] = { views: 0, clicks: 0 };
      }

      const galData = data.galleries[galleryId];

      if (event === 'view') {
          galData.views++;
          galData.daily[dateStr].views++;
      } else if (event === 'click') {
          galData.clicks++;
          galData.daily[dateStr].clicks++;
      }

      cachedAnalytics = data;
      saveAnalytics(data).catch(console.error);
      
      res.json({ success: true, count: galData[event === 'click' ? 'clicks' : 'views'] });
  });

  // Backwards compatibility for the dashboard
  app.get("/api/views", async (req, res) => {
      const data = await getAnalytics();
      const viewsOnly: Record<string, number> = {};
      Object.keys(data.galleries || {}).forEach(gid => {
          viewsOnly[gid] = data.galleries[gid].views;
      });
      res.json(viewsOnly);
  });

  app.post("/api/track-view", async (req, res) => {
      const { galleryId } = req.body;
      if (!galleryId) return res.status(400).json({ error: "missing galleryId" });
      
      const data = await getAnalytics();
      const dateStr = new Date().toISOString().split('T')[0];

      if (!data.galleries) data.galleries = {};
      if (!data.galleries[galleryId]) data.galleries[galleryId] = { views: 0, clicks: 0, daily: {} };
      if (!data.galleries[galleryId].daily[dateStr]) data.galleries[galleryId].daily[dateStr] = { views: 0, clicks: 0 };

      data.galleries[galleryId].views++;
      data.galleries[galleryId].daily[dateStr].views++;

      cachedAnalytics = data;
      saveAnalytics(data).catch(console.error);
      res.json({ success: true, count: data.galleries[galleryId].views });
  });

  // --- RATE LIMITING FOR GALLERY ACCESS ---
  // Protect against brute-forcing gallery URLs by rate-limiting HTML page requests
  const galleryLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: "Too many requests to access galleries from this IP, please try again after 5 minutes.",
    skip: (req) => {
      // Skip rate limiting for static assets and API routes
      return req.path.startsWith('/assets/') || 
             req.path.startsWith('/api/') || 
             !!req.path.match(/\.(js|css|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i);
    }
  });

  app.use(galleryLimiter);

  // --- VITE FRONTEND MIDDLEWARE & OG TAG INJECTION ---
  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  const injectOGTags = (html: string, title: string, description: string, image: string, type: string = "website") => {
    let newHtml = html;
    newHtml = newHtml.replace(/<title>.*?<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`);
    newHtml = newHtml.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`);
    newHtml = newHtml.replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="${type}" />`);
    
    newHtml = newHtml.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${image}" />`);
    return newHtml;
  };

  const getBaseHtml = async (req: express.Request) => {
    let html = "";
    if (process.env.NODE_ENV !== "production") {
      html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = fs.readFileSync(path.join(process.cwd(), "dist", "index.html"), "utf-8");
    }
    return html;
  };

  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";
      
      const headers = {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      };

      const domain = 'https://mwabonje.netlify.app';
      let blogs = [];
      let galleries = [];

      if (supabaseUrl && supabaseKey) {
        const blogsRes = await fetch(`${supabaseUrl}/rest/v1/blogs?select=slug,date&published=eq.true`, { headers });
        if (blogsRes.ok) blogs = await blogsRes.json();

        const galleriesRes = await fetch(`${supabaseUrl}/rest/v1/galleries?select=id,created_at&link_enabled=eq.true`, { headers });
        if (galleriesRes.ok) galleries = await galleriesRes.json();
      }

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

      sitemap += `\n</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      next(err);
    }
  });

  app.get(["/g/:id", "/gallery/:id", "/:id"], async (req, res, next) => {
    try {
      const { id } = req.params;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id as string);
      
      if (!isUUID) {
        return next();
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";
      
      let html = await getBaseHtml(req);

      if (supabaseUrl && supabaseKey) {
        const headers = {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        };

        const response = await fetch(`${supabaseUrl}/rest/v1/galleries?id=eq.${id}&select=client_name,title&limit=1`, { headers });
        
        if (response.ok) {
          const galleries = await response.json();
          if (galleries && galleries.length > 0) {
            const gallery = galleries[0];
            const title = gallery.title || `${gallery.client_name} Gallery | Mwabonje`;
            const description = `View the ${gallery.client_name} photography gallery by Mwabonje. Discover stunning visual storytelling and beautiful moments.`;
            let image = "https://mwabonje.netlify.app/og-image.jpg";

            // Fetch cover image from files
            const filesResponse = await fetch(`${supabaseUrl}/rest/v1/files?gallery_id=eq.${id}&select=file_url&limit=1&order=expires_at.asc`, { headers });
            if (filesResponse.ok) {
              const files = await filesResponse.json();
              if (files && files.length > 0 && files[0].file_url) {
                image = files[0].file_url;
              }
            }

            html = injectOGTags(html, title, description, image, "website");
          }
        }
      }
      res.send(html);
    } catch (err) {
      console.error("Gallery OG injection error:", err);
      next();
    }
  });

  app.get("/blog/:slug", async (req, res, next) => {
    try {
      const { slug } = req.params;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";
      
      let html = await getBaseHtml(req);

      if (supabaseUrl && supabaseKey) {
        const response = await fetch(`${supabaseUrl}/rest/v1/blogs?slug=eq.${slug}&select=title,excerpt,cover_image&limit=1`, {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });
        
        if (response.ok) {
          const posts = await response.json();
          if (posts && posts.length > 0) {
            const post = posts[0];
            const title = `${post.title} | Mwabonje`;
            const description = post.excerpt || "";
            const image = post.cover_image || "https://mwabonje.netlify.app/og-image.jpg";
            
            html = injectOGTags(html, title, description, image, "article");
          }
        }
      }
      res.send(html);
    } catch (err) {
      console.error("OG injection error:", err);
      next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
