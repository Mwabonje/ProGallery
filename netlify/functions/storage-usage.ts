import { Handler } from "@netlify/functions";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalStorageUsedMB: 0 }),
    };
  }

  try {
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

    let totalBytes = 0;
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });
      const response = await s3.send(command);
      if (response.Contents) {
        totalBytes += response.Contents.reduce(
          (acc: number, item: any) => acc + (item.Size || 0),
          0
        );
      }
      isTruncated = response.IsTruncated ?? false;
      continuationToken = response.NextContinuationToken;
    }

    const totalMB = totalBytes / (1024 * 1024);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalStorageUsedMB: Number(totalMB.toFixed(2)) }),
    };
  } catch (e: any) {
    console.error("Storage usage error:", e);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalStorageUsedMB: 0 }),
    };
  }
};
