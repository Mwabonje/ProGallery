import { Handler } from "@netlify/functions";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const ANALYTICS_FILE = "analytics/data_v2.json";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

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

    const body = JSON.parse(event.body || "{}");
    const { galleryId, event: interactionEvent } = body;
    if (!galleryId || !interactionEvent) return { statusCode: 400, body: JSON.stringify({ error: "missing galleryId or event" }) };

    // 1. Fetch
    let data: any = { galleries: {} };
    try {
        const getCommand = new GetObjectCommand({ Bucket: R2_BUCKET_NAME!, Key: ANALYTICS_FILE });
        const response = await s3.send(getCommand);
        const str = await response.Body?.transformToString();
        data = str ? JSON.parse(str) : { galleries: {} };
    } catch (e: any) {
        if (e.name !== 'NoSuchKey' && e.$metadata?.httpStatusCode !== 404) {
            console.error("Fetch analytics error:", e);
        }
    }

    // 2. Update
    const dateStr = new Date().toISOString().split('T')[0];
    if (!data.galleries) data.galleries = {};
    if (!data.galleries[galleryId]) data.galleries[galleryId] = { views: 0, clicks: 0, daily: {} };
    if (!data.galleries[galleryId].daily[dateStr]) data.galleries[galleryId].daily[dateStr] = { views: 0, clicks: 0 };

    const galData = data.galleries[galleryId];
    if (interactionEvent === 'view') {
        galData.views++;
        galData.daily[dateStr].views++;
    } else if (interactionEvent === 'click') {
        galData.clicks++;
        galData.daily[dateStr].clicks++;
    }

    // 3. Save
    const putCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME!,
        Key: ANALYTICS_FILE,
        Body: JSON.stringify(data),
        ContentType: "application/json"
    });
    await s3.send(putCommand);

    return { 
        statusCode: 200, 
        body: JSON.stringify({ success: true, count: galData[interactionEvent === 'click' ? 'clicks' : 'views'] }) 
    };
  } catch (error) {
    console.error("Track interaction error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to track interaction" }) };
  }
};
