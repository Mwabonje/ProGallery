import { Handler } from "@netlify/functions";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const body = JSON.parse(event.body || "{}");
    const { filePath, filePaths } = body;
    const pathsToDelete = filePaths || [filePath];

    for (const path of pathsToDelete) {
      if (path) {
        const command = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME!,
          Key: path,
        });
        await s3.send(command);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Delete error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to delete" }) };
  }
};
