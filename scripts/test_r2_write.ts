import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const accountId = (process.env.R2_ACCOUNT_ID || '').replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '').replace(/\/$/, '');
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://' + accountId + '.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function run() {
  const cmd = new PutObjectCommand({
    Bucket: 'my-photo-galleries',
    Key: 'portfolio/test.txt',
    Body: 'hello world',
    ContentType: 'text/plain',
  });
  const res = await s3.send(cmd);
  console.log('Put object success:', res.$metadata.httpStatusCode);
  const testUrl = 'https://pub-722a104adad649c9bb882d954680ee50.r2.dev/portfolio/test.txt';
  const fetchRes = await fetch(testUrl);
  console.log('Public URL status:', fetchRes.status, await fetchRes.text());
}
run();
