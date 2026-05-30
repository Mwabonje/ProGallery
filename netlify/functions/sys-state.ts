import { Handler } from "@netlify/functions";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const ANALYTICS_FILE = "analytics/data_v2.json";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
     return { statusCode: 500, body: JSON.stringify({ error: "Missing Cloudflare keys" }) };
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

    const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME!, Key: ANALYTICS_FILE });
    const response = await s3.send(command);
    const str = await response.Body?.transformToString();
    const data = str ? JSON.parse(str) : { galleries: {} };

    return { 
        statusCode: 200, 
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Expires": "0",
            "Surrogate-Control": "no-store"
        },
        body: JSON.stringify(data) 
    };
  } catch (e: any) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
        return { statusCode: 200, body: JSON.stringify({ galleries: {} }) };
    }
    console.error("Error reading analytics:", e);
    return { statusCode: 200, body: JSON.stringify({ galleries: {} }) };
  }
};
