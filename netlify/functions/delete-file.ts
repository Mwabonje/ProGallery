import { Handler } from "@netlify/functions";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { authenticatePhotographer, ownsGallery } from "./_shared/auth";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const auth = await authenticatePhotographer(event.headers.authorization || event.headers.Authorization);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: "Authentication required" }) };

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return { statusCode: 500, body: JSON.stringify({ error: "Storage is not configured" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const rawPaths: unknown[] = Array.isArray(body.filePaths) ? body.filePaths : (body.filePath ? [body.filePath] : []);
    if (rawPaths.length < 1 || rawPaths.length > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: "Provide between 1 and 100 file paths" }) };
    }
    if (rawPaths.some((p) => typeof p !== "string" || !/^galleries\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/i.test(p))) {
      return { statusCode: 400, body: JSON.stringify({ error: "One or more file paths are invalid" }) };
    }

    const paths = [...new Set(rawPaths as string[])];
    const galleryIds = [...new Set(paths.map((p) => p.split("/")[1]))];
    for (const galleryId of galleryIds) {
      if (!(await ownsGallery(auth.admin, galleryId, auth.userId))) {
        return { statusCode: 403, body: JSON.stringify({ error: "You do not own every requested gallery" }) };
      }
    }

    // Confirm every requested original belongs to a database file record in an owned gallery.
    const { data: fileRows, error } = await auth.admin
      .from("files")
      .select("file_path,gallery_id")
      .in("file_path", paths)
      .in("gallery_id", galleryIds);
    if (error) throw error;
    const ownedPaths = new Set((fileRows || []).map((row: { file_path: string }) => row.file_path));
    if (paths.some((p) => !ownedPaths.has(p))) {
      return { statusCode: 403, body: JSON.stringify({ error: "A requested file is not registered to your gallery" }) };
    }

    const accountId = R2_ACCOUNT_ID.replace(/^https?:\/\//, "").replace(/\.r2\.cloudflarestorage\.com.*$/, "").replace(/\/$/, "");
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    const allPaths = new Set<string>();
    for (const p of paths) {
      allPaths.add(p);
      const dir = p.substring(0, p.lastIndexOf("/"));
      const name = p.split("/").pop()!;
      const baseName = name.replace(/\.[^/.]+$/, "");
      allPaths.add(`${dir}/watermark_${name}`);
      allPaths.add(`${dir}/watermark_${name}.jpg`);
      allPaths.add(`${dir}/watermark_${baseName}.jpg`);
    }
    const keys = [...allPaths];
    for (let i = 0; i < keys.length; i += 1000) {
      await s3.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }));
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, deletedCount: keys.length }) };
  } catch (error) {
    console.error("Delete error:", error);
    return { statusCode: 400, body: JSON.stringify({ error: "Unable to process delete request" }) };
  }
};
