import { Handler } from "@netlify/functions";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
     return { statusCode: 500, body: JSON.stringify({ error: "Missing Cloudflare keys in Netlify Variables" }) };
  }

  try {
    const accountId = R2_ACCOUNT_ID.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '').replace(/\/$/, '');
    
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const body = JSON.parse(event.body || "{}");
    const { filePath, filePaths } = body;
    const rawPaths = filePaths || (filePath ? [filePath] : []);

    if (rawPaths.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No files to delete" }) };
    }

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

    // Process in chunks of 1000 (S3 limit for DeleteObjectsCommand)
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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, deletedCount: pathsToDelete.length }),
    };
  } catch (error) {
    console.error("Delete error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to delete" }) };
  }
};
