import { Handler } from "@netlify/functions";

// Allowlist of trusted domains where application assets and client delivery photos reside
const ALLOWED_HOST_SUFFIXES = [
  "mwabonje.co.ke",
  "r2.cloudflarestorage.com",
  "r2.dev",
  "supabase.co",
  "wsrv.nl",
  "images.unsplash.com",
];

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  // Disallow loopback, private ranges and metadata endpoints
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "169.254.169.254" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  ) {
    return false;
  }

  // Check against env var if configured
  const envR2Host = process.env.VITE_R2_PUBLIC_URL 
    ? new URL(process.env.VITE_R2_PUBLIC_URL).hostname.toLowerCase() 
    : null;
  if (envR2Host && host === envR2Host) {
    return true;
  }

  return ALLOWED_HOST_SUFFIXES.some((allowed) => host === allowed || host.endsWith("." + allowed));
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const fileUrl = event.queryStringParameters?.url;
  const fileName = event.queryStringParameters?.name || "download";

  if (!fileUrl) {
    return {
      statusCode: 400,
      headers: { 
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex, nofollow" 
      },
      body: JSON.stringify({ error: "Missing url parameter" }),
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    return {
      statusCode: 400,
      headers: { 
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex, nofollow" 
      },
      body: JSON.stringify({ error: "Invalid url parameter" }),
    };
  }

  // Only http or https
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return {
      statusCode: 400,
      headers: { 
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex, nofollow" 
      },
      body: JSON.stringify({ error: "Unsupported protocol" }),
    };
  }

  // Host validation to prevent SSRF and open proxy abuse
  if (!isAllowedHost(parsedUrl.hostname)) {
    return {
      statusCode: 403,
      headers: { 
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex, nofollow" 
      },
      body: JSON.stringify({ error: "Access denied to requested host" }),
    };
  }

  // Guard against requesting sensitive system/credential records
  const lowerPath = parsedUrl.pathname.toLowerCase();
  if (
    lowerPath.includes("gallery_password") ||
    lowerPath.includes(".env") ||
    lowerPath.includes("credentials")
  ) {
    return {
      statusCode: 403,
      headers: { 
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex, nofollow" 
      },
      body: JSON.stringify({ error: "Access to requested resource is forbidden" }),
    };
  }

  try {
    // Check HEAD or preliminary GET to evaluate Content-Length
    const headRes = await fetch(fileUrl, { method: "HEAD" });
    const contentLengthHeader = headRes.headers.get("content-length");
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

    // Netlify Lambda functions have a 6MB payload response limit.
    // If the image or video is >= 5MB, return a secure 302 redirect directly to the validated asset
    if (contentLength >= 5 * 1024 * 1024) {
      return {
        statusCode: 302,
        headers: {
          "Location": fileUrl,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
        body: "",
      };
    }

    const res = await fetch(fileUrl);
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 
          "Content-Type": "text/plain",
          "X-Robots-Tag": "noindex, nofollow" 
        },
        body: "File not found or unavailable.",
      };
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await res.arrayBuffer();

    // Secondary check on actual received byte length
    if (arrayBuffer.byteLength >= 5.5 * 1024 * 1024) {
      return {
        statusCode: 302,
        headers: {
          "Location": fileUrl,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
        body: "",
      };
    }

    const buffer = Buffer.from(arrayBuffer);
    const safeFileName = fileName.replace(/["'\r\n]/g, "_");
    const encodedFileName = encodeURIComponent(safeFileName);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "text/plain",
        "X-Robots-Tag": "noindex, nofollow" 
      },
      body: "Error processing download: " + (err?.message || String(err)),
    };
  }
};
