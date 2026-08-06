import * as Minio from 'minio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const ak = process.env.MINIO_ACCESS_KEY?.replace(/['"]/g, '');
const sk = process.env.MINIO_SECRET_KEY?.replace(/['"]/g, '');
const endpoint = process.env.MINIO_ENDPOINT?.replace(/^https?:\/\//, '');
const bucket = process.env.MINIO_MEDIA_BUCKET || 'imobfluow';

console.log('Endpoint:', endpoint);
console.log('Access Key:', ak);
console.log('Secret Key:', sk?.substring(0, 5) + '...');
console.log('Bucket:', bucket);

const minioClient = new Minio.Client({
  endPoint: endpoint,
  port: 443,
  useSSL: true,
  accessKey: ak,
  secretKey: sk,
  pathStyle: true,
});

// Teste 1: listar buckets
console.log('\n--- Teste 1: Listar Buckets ---');
try {
  const buckets = await minioClient.listBuckets();
  console.log(
    'Buckets:',
    buckets.map((b) => b.name)
  );
} catch (e) {
  console.error('Erro listBuckets:', e.code, e.message);

  // Se falhar, tentar com região explícita
  console.log('\n--- Tentando com região sa-east-1 ---');
  const minioClient2 = new Minio.Client({
    endPoint: endpoint,
    port: 443,
    useSSL: true,
    accessKey: ak,
    secretKey: sk,
    pathStyle: true,
    region: 'sa-east-1',
  });

  try {
    const buckets2 = await minioClient2.listBuckets();
    console.log(
      'Buckets:',
      buckets2.map((b) => b.name)
    );
  } catch (e2) {
    console.error('Erro (sa-east-1):', e2.code, e2.message);
  }
}

// Teste 2: upload simples
console.log('\n--- Teste 2: Upload simples ---');
try {
  const testData = Buffer.from('hello minio test');
  await minioClient.putObject(
    bucket,
    'test/hello.txt',
    testData,
    testData.length,
    {
      'Content-Type': 'text/plain',
    }
  );
  console.log('Upload OK!');

  // Limpar
  await minioClient.removeObject(bucket, 'test/hello.txt');
  console.log('Cleanup OK!');
} catch (e) {
  console.error('Erro upload:', e.code, e.message);
}
