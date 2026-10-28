import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import { Readable } from "stream";
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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

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
  app.use("/api", (req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", r2Configured: isR2Configured });
  });

  // Generate a Pre-signed URL for uploading
  app.post("/api/upload-url", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured on the server" });
    }

    try {
      const { fileName, fileType, folderPath } = req.body;
      
      if (!fileName || !fileType) {
         return res.status(400).json({ error: "fileName and fileType are required" });
      }

      // Generate a clean, unique file path mimicking what the app does
      const uniqueId = Math.random().toString(36).substring(2);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\_-]/g, "_");
      
      let filePath;
      if (folderPath) {
          filePath = `${folderPath}/${sanitizedFileName}`;
      } else {
          filePath = `uploads/${Date.now()}_${uniqueId}/${sanitizedFileName}`;
      }

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
      const rawPaths = filePaths || (filePath ? [filePath] : []);

      if (rawPaths.length === 0) {
        return res.status(400).json({ error: "No files to delete" });
      }

      // Automatically include corresponding watermark copies in R2
      const allPaths = new Set<string>();
      for (const p of rawPaths) {
        if (!p || typeof p !== "string") continue;
        allPaths.add(p);
        const dir = p.substring(0, p.lastIndexOf("/"));
        const name = p.split("/").pop();
        if (dir && name) {
          allPaths.add(`${dir}/watermark_${name}`);
          allPaths.add(`${dir}/watermark_${name}.jpg`);
          const baseName = name.replace(/\.[^/.]+$/, "");
          allPaths.add(`${dir}/watermark_${baseName}.jpg`);
        }
      }

      const pathsToDelete = Array.from(allPaths);

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
      
      res.json({ success: true, deletedCount: pathsToDelete.length });
    } catch (e) {
      console.error("Delete error:", e);
      res.status(500).json({ error: "Failed to delete file(s) from R2." });
    }
  });

  // Return Cloudflare R2 storage usage statistics
  app.get("/api/storage-stats", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured" });
    }

    try {
      let totalBytes = 0;
      let totalCount = 0;
      let continuationToken = undefined;

      do {
        const listCmd = new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME!,
          ContinuationToken: continuationToken,
        });
        const listRes = (await s3.send(listCmd)) as any;
        if (listRes.Contents) {
          totalCount += listRes.Contents.length;
          for (const item of listRes.Contents) {
            totalBytes += item.Size || 0;
          }
        }
        continuationToken = listRes.NextContinuationToken;
      } while (continuationToken);

      const totalGB = totalBytes / (1024 * 1024 * 1024);
      const limitGB = 10;
      const usagePercentage = Math.min(100, Math.round((totalGB / limitGB) * 100));

      res.json({
        totalBytes,
        totalGB: Number(totalGB.toFixed(2)),
        limitGB,
        usagePercentage,
        totalFiles: totalCount,
      });
    } catch (e: any) {
      console.error("Storage stats error:", e);
      res.status(500).json({ error: "Failed to fetch storage stats" });
    }
  });

  // Automatically purge expired delivery files from R2 and Supabase
  app.post("/api/purge-expired", async (req, res) => {
    if (!s3 || !isR2Configured) {
      return res.status(500).json({ error: "R2 is not configured" });
    }

    try {
      const now = new Date().toISOString();
      const filesRes = await fetch(
        `${supabaseUrl}/rest/v1/files?expires_at=lt.${now}&select=id,file_path,gallery_id`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      const expiredFiles = (await filesRes.json()) as any;

      if (!Array.isArray(expiredFiles) || expiredFiles.length === 0) {
        return res.json({
          success: true,
          purgedCount: 0,
          message: "No expired files found to purge.",
        });
      }

      const pathsToDelete = new Set<string>();
      const fileIdsToDelete: string[] = [];

      for (const f of expiredFiles) {
        fileIdsToDelete.push(f.id);
        if (f.file_path) {
          pathsToDelete.add(f.file_path);
          const dir = f.file_path.substring(0, f.file_path.lastIndexOf("/"));
          const name = f.file_path.split("/").pop();
          if (dir && name) {
            pathsToDelete.add(`${dir}/watermark_${name}`);
            pathsToDelete.add(`${dir}/watermark_${name}.jpg`);
            const baseName = name.replace(/\.[^/.]+$/, "");
            pathsToDelete.add(`${dir}/watermark_${baseName}.jpg`);
          }
        }
      }

      const pathsArray = Array.from(pathsToDelete);
      for (let i = 0; i < pathsArray.length; i += 1000) {
        const chunk = pathsArray.slice(i, i + 1000);
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME!,
            Delete: {
              Objects: chunk.map((Key: string) => ({ Key })),
              Quiet: true,
            },
          })
        );
      }

      for (let i = 0; i < fileIdsToDelete.length; i += 100) {
        const idChunk = fileIdsToDelete.slice(i, i + 100);
        await fetch(`${supabaseUrl}/rest/v1/files?id=in.(${idChunk.join(",")})`, {
          method: "DELETE",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
      }

      res.json({
        success: true,
        purgedCount: fileIdsToDelete.length,
        purgedR2Objects: pathsArray.length,
      });
    } catch (e: any) {
      console.error("Purge expired error:", e);
      res.status(500).json({ error: "Failed to purge expired files: " + e.message });
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

      const listResult = (await s3.send(listCommand)) as any;

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

  // Robust download proxy endpoint with Content-Disposition attachment
  // This allows mobile browsers (iOS Safari, Android Chrome, in-app webviews) to natively download files without client-side memory exhaustion or popup blocks
  app.get("/api/download", async (req, res) => {
    try {
      const fileUrl = req.query.url as string;
      const fileName = (req.query.name as string) || "download";
      const fileKey = req.query.key as string;

      if (!fileUrl && !fileKey) {
        return res.status(400).json({ error: "Missing url or key parameter" });
      }

      let stream: any = null;
      let contentType = "application/octet-stream";
      let contentLength: number | undefined;

      // Clean the key from URL or parameter
      let targetKey = fileKey;
      if (!targetKey && fileUrl) {
        try {
          const parsed = new URL(fileUrl);
          targetKey = parsed.pathname.replace(/^\/+/, "");
        } catch {
          targetKey = fileUrl.replace(/^https?:\/\/[^\/]+\//, "");
        }
      }

      // Try reading directly from S3 / R2 if configured
      if (s3 && isR2Configured && targetKey) {
        try {
          const getCmd = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME!,
            Key: targetKey,
          });
          const s3Res = await s3.send(getCmd);
          stream = s3Res.Body;
          contentType = s3Res.ContentType || "application/octet-stream";
          contentLength = s3Res.ContentLength;
        } catch (s3Err: any) {
          console.warn("Direct R2 fetch failed for key:", targetKey, s3Err?.message);
        }
      }

      // Fallback: fetch via HTTP if direct S3 stream failed or not configured
      if (!stream && fileUrl) {
        try {
          const fetchRes = await fetch(fileUrl);
          if (fetchRes.ok && fetchRes.body) {
            contentType = fetchRes.headers.get("content-type") || "application/octet-stream";
            const cl = fetchRes.headers.get("content-length");
            if (cl) contentLength = parseInt(cl, 10);
            stream = Readable.fromWeb(fetchRes.body as any);
          }
        } catch (fetchErr) {
          console.error("HTTP proxy fetch failed:", fetchErr);
        }
      }

      if (!stream) {
        return res.status(404).send("File not found or unavailable.");
      }

      // Encode filename for Content-Disposition header
      const safeFileName = fileName.replace(/["'\r\n]/g, "_");
      const encodedFileName = encodeURIComponent(safeFileName);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
      );
      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (req.method === "HEAD") {
        return res.end();
      }

      stream.pipe(res);
    } catch (err: any) {
      console.error("Download endpoint error:", err);
      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    }
  });

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

  // --- GALLERY PASSWORD MANAGEMENT ---
  const GALLERY_PASSWORDS_FILE = path.join(process.cwd(), "data", "gallery_passwords.json");
  const readGalleryPasswords = (): Record<string, string> => {
    try {
      if (fs.existsSync(GALLERY_PASSWORDS_FILE)) {
        return JSON.parse(fs.readFileSync(GALLERY_PASSWORDS_FILE, "utf8"));
      }
    } catch (e) {
      console.error("Error reading gallery passwords file:", e);
    }
    return {};
  };

  const writeGalleryPasswords = (passwords: Record<string, string>) => {
    try {
      const dir = path.dirname(GALLERY_PASSWORDS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(GALLERY_PASSWORDS_FILE, JSON.stringify(passwords, null, 2), "utf8");
    } catch (e) {
      console.error("Error writing gallery passwords file:", e);
    }
  };

  // Check if gallery requires password - NEVER returns the plaintext password!
  app.get("/api/gallery/:id/auth-status", async (req, res) => {
    const { id } = req.params;
    const passwords = readGalleryPasswords();
    let hasPassword = Boolean(passwords[id] && passwords[id].trim() !== "");
    
    // Fallback check in Supabase files table if not in local json
    if (!hasPassword && supabaseUrl && supabaseKey) {
      try {
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/files?gallery_id=eq.${id}&file_path=eq.GALLERY_PASSWORD&select=id&limit=1`, {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });
        if (checkRes.ok) {
          const files = await checkRes.json();
          if (files && files.length > 0) hasPassword = true;
        }
      } catch (e) {}
    }
    
    res.json({ requiresPassword: hasPassword });
  });

  // Verify password securely on the server
  app.post("/api/gallery/:id/verify-password", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const passwords = readGalleryPasswords();
    let target = passwords[id] || null;

    if (!target && supabaseUrl && supabaseKey) {
      try {
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/files?gallery_id=eq.${id}&file_path=eq.GALLERY_PASSWORD&select=caption&limit=1`, {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });
        if (checkRes.ok) {
          const files = await checkRes.json();
          if (files && files.length > 0 && files[0].caption) {
            target = files[0].caption.trim();
          }
        }
      } catch (e) {}
    }

    if (!target) {
      // Gallery has no password, access is open
      return res.json({ success: true, requiresPassword: false });
    }

    const cleanInput = (password || "").trim();
    if (cleanInput && cleanInput === target) {
      return res.json({ success: true, requiresPassword: true });
    }

    return res.status(401).json({ success: false, error: "Incorrect password" });
  });

  app.post("/api/gallery/:id/password", (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const passwords = readGalleryPasswords();
    if (password && typeof password === "string" && password.trim()) {
      passwords[id] = password.trim();
    } else {
      delete passwords[id];
    }
    writeGalleryPasswords(passwords);
    res.json({ success: true, password: passwords[id] || null });
  });

  app.delete("/api/gallery/:id/password", (req, res) => {
    const { id } = req.params;
    const passwords = readGalleryPasswords();
    delete passwords[id];
    writeGalleryPasswords(passwords);
    res.json({ success: true, password: null });
  });

  // --- RATE LIMITING FOR GALLERY ACCESS ---
  // Protect against brute-forcing gallery passwords
  const galleryLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // limit each IP
    message: "Too many password verification attempts from this IP, please try again after 5 minutes.",
    skip: (req) => {
      // Always skip rate limiting in development or for any code/asset requests
      if (process.env.NODE_ENV !== "production") return true;
      return req.path.startsWith('/assets/') || 
             req.path.startsWith('/@') || 
             req.path.startsWith('/node_modules/') || 
             !!req.path.match(/\.(js|jsx|ts|tsx|mjs|css|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i);
    }
  });

  // Apply rate limiter specifically to password attempts, not global scripts
  app.use("/api/gallery/:id/verify-password", galleryLimiter);

  // 301 Permanent Redirect from legacy Netlify hostname to canonical domain
  app.use((req, res, next) => {
    const host = (req.headers.host || '').toLowerCase();
    if (host.includes('mwabonje.netlify.app')) {
      // Preserve API endpoints and Netlify functions without disrupting client calls
      if (req.path.startsWith('/api') || req.path.startsWith('/.netlify')) {
        return next();
      }
      return res.redirect(301, `https://mwabonje.co.ke${req.originalUrl}`);
    }
    next();
  });

  // --- VITE FRONTEND MIDDLEWARE & OG TAG INJECTION ---
  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  const injectOGTags = (html: string, title: string, description: string, image: string, type: string = "website", canonicalUrl?: string) => {
    let newHtml = html;
    newHtml = newHtml.replace(/<title>.*?<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`);
    newHtml = newHtml.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`);
    newHtml = newHtml.replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="${type}" />`);
    
    newHtml = newHtml.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`);
    newHtml = newHtml.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${image}" />`);

    if (canonicalUrl) {
      if (newHtml.includes('<link rel="canonical"')) {
        newHtml = newHtml.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonicalUrl}" />`);
      } else {
        newHtml = newHtml.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
      }
      if (newHtml.includes('<meta property="og:url"')) {
        newHtml = newHtml.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonicalUrl}" />`);
      } else {
        newHtml = newHtml.replace('</head>', `  <meta property="og:url" content="${canonicalUrl}" />\n</head>`);
      }
      if (newHtml.includes('<meta name="twitter:url"')) {
        newHtml = newHtml.replace(/<meta name="twitter:url"[^>]*>/, `<meta name="twitter:url" content="${canonicalUrl}" />`);
      }
    }

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
      const distSitemap = path.join(process.cwd(), "dist", "sitemap.xml");
      const publicSitemap = path.join(process.cwd(), "public", "sitemap.xml");
      const targetFile = fs.existsSync(distSitemap) ? distSitemap : (fs.existsSync(publicSitemap) ? publicSitemap : null);

      if (targetFile) {
        res.header('Content-Type', 'application/xml');
        return res.sendFile(targetFile);
      }

      const domain = (process.env.SITE_URL && !process.env.SITE_URL.includes('netlify.app')) 
        ? process.env.SITE_URL.replace(/\/$/, '') 
        : 'https://mwabonje.co.ke';

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
  </url>
</urlset>
`;
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      next(err);
    }
  });

  // SECURITY & SEO PROTECTION: Middleware for gallery and admin routes
  app.use(async (req, res, next) => {
    const path = req.path;
    const isGallery = path.startsWith('/g/') || path.startsWith('/gallery/');
    const isUUID = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(path);
    const isAdmin = path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/login');

    if (isGallery || isUUID || isAdmin) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    }

    if (isGallery || isUUID || isAdmin) {
      // Do not intercept public routes
      if (path === '/' || path.startsWith('/about') || path.startsWith('/faq') || path.startsWith('/blog') || path.startsWith('/assets') || path.startsWith('/api')) {
        return next();
      }

      try {
        let html = await getBaseHtml(req);
        const isDisplay = path.includes('/display');
        const genericTitle = isAdmin
          ? (path.startsWith('/login') ? "Photographer Portal | Mwabonje" : "Dashboard | Mwabonje")
          : (isDisplay ? "Live Display | Mwabonje" : "Private Client Gallery | Mwabonje");
        const genericDesc = isAdmin
          ? "Mwabonje Photographer Portal"
          : (isDisplay ? "Live gallery display." : "Private client delivery gallery.");
        
        html = html.replace(/<title>.*?<\/title>/, `<title>${genericTitle}</title>`);
        html = html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, '');
        html = html.replace(/<link\s+[^>]*href=["'][^"']*["']\s+rel=["']canonical["'][^>]*>/gi, '');
        html = html.replace('</head>', `  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />\n  <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />\n</head>`);
        html = injectOGTags(html, genericTitle, genericDesc, "", "website");

        return res.send(html);
      } catch (err) {
        console.error("Gallery/Admin protection handler error:", err);
        return next();
      }
    }

    next();
  });

  app.get(["/about", "/faq", "/blog"], async (req, res, next) => {
    try {
      let html = await getBaseHtml(req);
      const cleanPath = req.path.replace(/\/+$/, '');
      const canonicalUrl = `https://mwabonje.co.ke${cleanPath}`;

      if (cleanPath === '/about') {
        const title = "About Mwabonje — Portrait & Lifestyle Photographer in Malindi, Kenya";
        const desc = "Meet Mwabonje, an East African visual storyteller and lifestyle photographer based in Malindi, Kilifi County — capturing documentary portraits, coastal weddings, and architectural narratives across Watamu, Malindi, and Lamu.";
        html = injectOGTags(html, title, desc, "https://mwabonje.co.ke/og-image.jpg", "profile", canonicalUrl);
      } else if (cleanPath === '/faq') {
        const title = "Photography FAQs & Investment Guide | Mwabonje Malindi, Kenya";
        const desc = "Find answers to frequently asked questions about booking wedding photography, portraits, hospitality shoots, payment schedules, and photo delivery with Mwabonje in Malindi, Watamu, and Lamu.";
        html = injectOGTags(html, title, desc, "https://mwabonje.co.ke/og-image.jpg", "website", canonicalUrl);
      } else if (cleanPath === '/blog') {
        const title = "Journal & Stories | Mwabonje Photography — Malindi, Kenya";
        const desc = "Stories, wedding photography highlights, behind-the-scenes journals, and coastal visual narratives from Mwabonje Photography across Malindi, Watamu, and Lamu.";
        html = injectOGTags(html, title, desc, "https://mwabonje.co.ke/og-image.jpg", "website", canonicalUrl);
      }
      res.send(html);
    } catch (err) {
      console.error("Public route SEO handler error in server.ts:", err);
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
            const image = post.cover_image || "https://mwabonje.co.ke/og-image.jpg";
            const canonicalUrl = `https://mwabonje.co.ke/blog/${slug}`;
            
            html = injectOGTags(html, title, description, image, "article", canonicalUrl);
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
