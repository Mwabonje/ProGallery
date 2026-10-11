import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = (process.env.R2_ACCOUNT_ID || '').replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '').replace(/\/$/, '');
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://' + accountId + '.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const candidates = [
  'my-photo-galleries',
  'portfolio',
  'portfolios',
  'portfolio-images',
  'portfolio-gallery',
  'portfolio-galleries',
  'mwabonje',
  'mwabonje-portfolio',
  'mwabonje-studio',
  'mwabonje-photos',
  'mwabonje-galleries',
  'photos',
  'galleries',
  'gallery',
  'client-galleries',
  'deliveries',
  'delivery',
  'prints',
  'lookbook',
  'images',
  'public',
  'photo-galleries',
  'progallery',
  'studio',
  'studio-portfolio',
  'michael-mwabonje',
  'ringa',
  'mwabonje-public',
  'my-portfolio',
  'main-portfolio',
  'assets',
  'media'
];

async function testAll() {
  for (const b of candidates) {
    try {
      const res = await s3.send(new ListObjectsV2Command({ Bucket: b, MaxKeys: 2 }));
      console.log(`FOUND BUCKET: ${b} -> ${res.KeyCount} keys, first: ${res.Contents?.[0]?.Key}`);
    } catch (e: any) {
      if (e.name !== 'NoSuchBucket' && e.name !== 'AccessDenied') {
        console.log(`Bucket ${b} error: ${e.name}`);
      }
    }
  }
}

testAll();
