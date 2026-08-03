import * as Minio from 'minio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const minioClient = new Minio.Client({
  endPoint: (process.env.MINIO_ENDPOINT || '').replace(/^https?:\/\//, ''),
  port: 443,
  useSSL: true,
  accessKey: (process.env.MINIO_ACCESS_KEY || '').replace(/['"]/g, ''),
  secretKey: (process.env.MINIO_SECRET_KEY || '').replace(/['"]/g, ''),
  pathStyle: true
});

const BUCKET = process.env.MINIO_MEDIA_BUCKET || 'imobfluow';

async function listObjects(prefix) {
  const objects = [];
  const stream = minioClient.listObjectsV2(BUCKET, prefix, true);
  
  for await (const obj of stream) {
    if (obj.name) {
      objects.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified
      });
    }
  }
  
  return objects;
}

async function run() {
  console.log('=== MINIO OBJECTS BY PREFIX ===\n');
  
  const prefixes = ['pamas/', 'mega/', 'megainvest/', 'properties/', 'property-images/'];
  
  for (const prefix of prefixes) {
    const objects = await listObjects(prefix);
    console.log(`Prefix "${prefix}": ${objects.length} objects`);
    if (objects.length > 0 && objects.length <= 10) {
      objects.slice(0, 5).forEach(obj => {
        console.log(`  ${obj.name} (${(obj.size / 1024).toFixed(1)} KB)`);
      });
    } else if (objects.length > 10) {
      console.log(`  Sample:`);
      objects.slice(0, 3).forEach(obj => {
        console.log(`    ${obj.name} (${(obj.size / 1024).toFixed(1)} KB)`);
      });
    }
  }
  
  // Also list root level
  console.log('\n=== ROOT LEVEL OBJECTS ===');
  const rootObjects = await listObjects('');
  console.log(`Root: ${rootObjects.length} objects`);
  if (rootObjects.length > 0) {
    rootObjects.slice(0, 10).forEach(obj => {
      console.log(`  ${obj.name} (${(obj.size / 1024).toFixed(1)} KB)`);
    });
  }
}

run().catch(console.error);
