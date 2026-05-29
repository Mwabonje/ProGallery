import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.VITE_R2_PUBLIC_URL ? process.env.VITE_R2_PUBLIC_URL.replace("https://pub-", "https://").split('.')[0] + ".r2.cloudflarestorage.com" : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
    }
});

async function run() {
    try {
        const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: "analytics/data_v2.json" });
        const res = await s3.send(cmd);
        const str = await res.Body?.transformToString();
        console.log("R2 contains:", str);
    } catch (e) {
        console.error(e);
    }
}
run();
