/* Chuyển dữ liệu (ảnh + JSON) từ Vercel Blob cũ sang Cloudflare R2 mới.
 *
 *   npm run migrate:blob-to-r2
 *
 * Chạy MỘT LẦN sau khi đã tạo bucket R2 và thêm đủ biến môi trường (đọc từ
 * .env ở gốc repo, giống lúc chạy server):
 *   - BLOB_READ_WRITE_TOKEN         : token của Blob store cũ (vẫn còn đọc được).
 *   - R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
 *   - R2_PUBLIC_HOST                : domain public của bucket R2.
 *
 * Script tự nối đúng đường dẫn cũ (SITE_ID + băm từ DATA_SECRET), nên KHÔNG
 * được đổi SITE_ID/DATA_SECRET trước khi chạy — đổi là copy sai chỗ. Copy
 * xong, mọi URL ảnh/nhạc tuyệt đối nằm bên trong các file JSON (content.json…)
 * cũng được viết lại từ host Blob cũ sang host R2 mới.
 *
 * Cần cài `@vercel/blob` tạm thời để đọc kho cũ (không có trong dependencies
 * chính vì chỉ dùng một lần):
 *   npm install --no-save @vercel/blob
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

try { process.loadEnvFile?.(new URL('../../.env', import.meta.url)); } catch { /* chưa có .env */ }

const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  Object.entries(process.env).find(([k, v]) => k.endsWith('READ_WRITE_TOKEN') && v)?.[1] ||
  '';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const R2_PUBLIC_HOST = (process.env.R2_PUBLIC_HOST || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

if (!BLOB_TOKEN) {
  console.error('Thiếu BLOB_READ_WRITE_TOKEN — cần token của Blob store CŨ để đọc dữ liệu ra.');
  process.exit(1);
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_HOST) {
  console.error('Thiếu một trong các biến R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_HOST.');
  process.exit(1);
}

let list;
try {
  ({ list } = await import('@vercel/blob'));
} catch {
  console.error('Chưa cài @vercel/blob. Chạy: npm install --no-save @vercel/blob rồi thử lại.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
});

async function listAllBlobs() {
  const out = [];
  let cursor;
  do {
    const page = await list({ token: BLOB_TOKEN, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

console.log('Đang liệt kê file trên Vercel Blob...');
const blobs = await listAllBlobs();
if (!blobs.length) {
  console.log('Không tìm thấy file nào — có thể store đang bị khoá hoặc token sai.');
  process.exit(0);
}
console.log(`Tìm thấy ${blobs.length} file. Bắt đầu copy sang R2 (${R2_BUCKET})...\n`);

const oldHost = new URL(blobs[0].url).hostname;
const jsonKeys = [];
let done = 0;
let bytes = 0;

for (const b of blobs) {
  const res = await fetch(b.url);
  if (!res.ok) {
    console.warn(`  [bỏ qua] ${b.pathname} — tải lỗi HTTP ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const isJson = b.pathname.endsWith('.json');

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: b.pathname,
      Body: buf,
      ContentType: isJson ? 'application/json' : res.headers.get('content-type') || 'application/octet-stream',
      CacheControl: isJson ? 'no-store' : `public, max-age=${60 * 60 * 24 * 365}, immutable`
    })
  );

  if (isJson) jsonKeys.push(b.pathname);
  done += 1;
  bytes += buf.length;
  console.log(`  [${done}/${blobs.length}] ${b.pathname} (${(buf.length / 1024).toFixed(0)} KB)`);
}

console.log(`\nĐã copy ${done} file (${(bytes / 1024 / 1024).toFixed(1)} MB).`);

if (jsonKeys.length) {
  console.log(`\nĐang viết lại URL ảnh/nhạc bên trong ${jsonKeys.length} file JSON (${oldHost} -> ${R2_PUBLIC_HOST})...`);
  for (const key of jsonKeys) {
    const res = await fetch(`https://${R2_PUBLIC_HOST}/${key}`, { cache: 'no-store' });
    const text = await res.text();
    const rewritten = text.split(`https://${oldHost}`).join(`https://${R2_PUBLIC_HOST}`);
    if (rewritten !== text) {
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: rewritten,
          ContentType: 'application/json',
          CacheControl: 'no-store'
        })
      );
      console.log(`  [sửa] ${key}`);
    }
  }
}

console.log(`
Xong. Việc còn lại:
  1. Thêm R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
     R2_PUBLIC_HOST vào Environment Variables của CẢ HAI project trên Vercel.
  2. Sửa "hostname" trong vercel.json (images.remotePatterns) thành đúng
     R2_PUBLIC_HOST rồi commit.
  3. Redeploy cả hai project, mở thử thiệp + trang /admin để kiểm tra ảnh/nhạc/
     danh sách khách còn nguyên.
  4. Kiểm tra xong thì gỡ biến BLOB_READ_WRITE_TOKEN khỏi Vercel và xoá Blob
     store cũ (Storage -> wedding-blob -> Delete) để khỏi tốn phí hai nơi.
`);
