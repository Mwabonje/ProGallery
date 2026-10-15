import { Handler } from "@netlify/functions";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  "https://bdaqtpyzqutelkdgcoex.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
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

    if (!filesRes.ok) {
      const errText = await filesRes.text();
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to query expired files: " + errText }),
      };
    }

    const expiredFiles = (await filesRes.json()) as any[];

    if (!Array.isArray(expiredFiles) || expiredFiles.length === 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          purgedCount: 0,
          purgedR2Objects: 0,
          message: "No expired files found to purge.",
        }),
      };
    }

    const pathsToDelete = new Set<string>();
    const fileIdsToDelete: string[] = [];

    for (const f of expiredFiles) {
      if (f.id) fileIdsToDelete.push(f.id);
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

    // Delete from Cloudflare R2 if credentials exist
    let purgedR2Count = 0;
    if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
      const accountId = R2_ACCOUNT_ID.replace(/^https?:\/\//, "")
        .replace(/\.r2\.cloudflarestorage\.com.*$/, "")
        .replace(/\/$/, "");

      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      });

      const pathsArray = Array.from(pathsToDelete);
      for (let i = 0; i < pathsArray.length; i += 1000) {
        const chunk = pathsArray.slice(i, i + 1000);
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: {
              Objects: chunk.map((Key: string) => ({ Key })),
              Quiet: true,
            },
          })
        );
      }
      purgedR2Count = pathsArray.length;
    }

    // Delete database records from Supabase
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        purgedCount: fileIdsToDelete.length,
        purgedR2Objects: purgedR2Count,
      }),
    };
  } catch (error: any) {
    console.error("Purge expired error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to purge expired files" }),
    };
  }
};
