import { Handler } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authenticatePhotographer, ownsGallery } from "./_shared/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_ORIGIN || "https://mwabonje.co.ke",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const VITE_R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL;

const allowedMime = /^(image\/(jpeg|png|webp|gif|heic|heif|tiff|x-[a-z0-9.+-]+)|video\/(mp4|quicktime|webm|x-msvideo|x-matroska|x-ms-wmv))$/i;

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = process.env.APP_ORIGIN || "https://mwabonje.co.ke";
  const headers = { ...corsHeaders, ...(origin === allowedOrigin ? { "Access-Control-Allow-Origin": origin } : {}) };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };

  const auth = await authenticatePhotographer(event.headers.authorization || event.headers.Authorization);
  if (!auth) return { statusCode: 401, headers, body: JSON.stringify({ error: "Authentication required" }) };

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !VITE_R2_PUBLIC_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Storage is not configured" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { fileName, fileType, galleryId } = body;
    if (typeof galleryId !== "string" || !/^[0-9a-f-]{36}$/i.test(galleryId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "A valid galleryId is required" }) };
    }
    if (typeof fileName !== "string" || fileName.length < 1 || fileName.length > 180 ||
        typeof fileType !== "string" || !allowedMime.test(fileType)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "A valid filename and supported image/video MIME type are required" }) };
    }
    if (!(await ownsGallery(auth.admin, galleryId, auth.userId))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "You do not own this gallery" }) };
    }

    const accountId = R2_ACCOUNT_ID.replace(/^https?:\/\//, "").replace(/\.r2\.cloudflarestorage\.com.*$/, "").replace(/\/$/, "");
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    const sanitizedFileName = fileName.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `galleries/${galleryId}/${randomUUID()}-${sanitizedFileName}`;
    const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: filePath, ContentType: fileType });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${VITE_R2_PUBLIC_URL.replace(/\/$/, "")}/${filePath}`;

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ presignedUrl, publicUrl, filePath }),
    };
  } catch (error) {
    console.error("Upload URL error:", error);
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid upload request" }) };
  }
};
