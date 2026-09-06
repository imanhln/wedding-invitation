// Lớp lưu trữ dùng chung cho cả 2 môi trường:
//   - Local (npm run dev): ghi file xuống server/data + server/uploads như cũ.
//   - Vercel: filesystem chỉ đọc và bị xoá mỗi lần deploy, nên đẩy hết lên
//     Cloudflare R2 (tương thích API S3).
// Mọi khoá lưu trữ đều gắn tiền tố SITE_ID => nhà trai và nhà gái dùng chung
// một R2 bucket nhưng dữ liệu hoàn toàn tách biệt.
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const slug = (v, fallback) =>
  String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || fallback;

export const SITE_ID = slug(process.env.SITE_ID, 'default');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET = process.env.R2_BUCKET || '';
// Domain công khai để đọc file (Public Development URL dạng pub-xxxx.r2.dev,
// hoặc custom domain đã gắn cho bucket). Không kèm https:// hay dấu / cuối.
export const R2_PUBLIC_HOST = (process.env.R2_PUBLIC_HOST || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

export const useRemote = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);

// Tren Vercel filesystem chi doc, ghi xuong dia se nem ENOENT kho hieu. Chan
// truoc bang thong bao noi dung phai lam gi.
const ON_VERCEL = Boolean(process.env.VERCEL);
const NO_REMOTE_MSG =
  'Chua noi R2 vao project: thieu R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_HOST trong Environment Variables. Xem README phan Cloudflare R2.';
if (ON_VERCEL && !useRemote) console.error('[store]', NO_REMOTE_MSG);
if (useRemote && !R2_PUBLIC_HOST) console.warn('[store] Thieu R2_PUBLIC_HOST — khong dung URL cong khai cho anh/nhac.');

const s3 = useRemote
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
    })
  : null;

const publicUrl = (key) => `https://${R2_PUBLIC_HOST}/${key}`;

// Ảnh nằm ở đường dẫn đoán được (phải công khai để hiển thị trên thiệp),
// còn file JSON chứa danh sách khách + lời chúc thì giấu sau một thư mục băm
// từ DATA_SECRET để không ai dò ra URL.
//
// ĐỪNG đổi DATA_SECRET sau khi đã có dữ liệu — đổi là đổi luôn đường dẫn,
// dữ liệu cũ vẫn nằm đó nhưng site sẽ không tìm thấy nữa.
const DATA_SECRET = process.env.DATA_SECRET || `fallback:${SITE_ID}`;
if (useRemote && !process.env.DATA_SECRET) {
  console.warn('[store] Chua dat DATA_SECRET — duong dan file du lieu co the bi doan ra.');
}
const VAULT = crypto.createHash('sha256').update(`${SITE_ID}:${DATA_SECRET}`).digest('hex').slice(0, 24);

const DATA_PREFIX = `${SITE_ID}/${VAULT}/`;
export const UPLOAD_PREFIX = `${SITE_ID}/uploads/`;

/* -------------------------------- Cloudflare R2 -------------------------------- */

async function listAll(prefix) {
  const out = [];
  let ContinuationToken;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken })
    );
    out.push(...(page.Contents || []));
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return out;
}

async function remoteRead(name, fallback) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: `${DATA_PREFIX}${name}.json` }));
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    if (err?.name === 'NoSuchKey') return structuredClone(fallback);
    console.error('[store] remoteRead lỗi', name, err.message);
    return structuredClone(fallback);
  }
}

async function remoteWrite(name, value) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: `${DATA_PREFIX}${name}.json`,
      Body: JSON.stringify(value, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-store'
    })
  );
  return value;
}

/* -------------------------------- Local FS ------------------------------- */

const DATA_DIR = path.join(__dirname, 'data');
export const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!useRemote) {
  // Filesystem của Vercel chỉ đọc — nếu quên nối R2 thì báo lỗi rõ ràng
  // ngay lúc khởi động thay vì để từng request hỏng một cách khó hiểu.
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('[store] Khong ghi duoc xuong dia. Tren Vercel hay them R2 vao project.', err.message);
  }
}

function fsRead(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

function fsWrite(name, value) {
  if (ON_VERCEL) throw new Error(NO_REMOTE_MSG);
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return value;
}

/* -------------------------------- Public --------------------------------- */

export const readJson = (name, fallback) =>
  useRemote ? remoteRead(name, fallback) : Promise.resolve(fsRead(name, fallback));

export const writeJson = (name, value) =>
  useRemote ? remoteWrite(name, value) : Promise.resolve(fsWrite(name, value));

/** Đặt tên file an toàn, bỏ dấu tiếng Việt, chống trùng bằng hậu tố thời gian. */
export function safeName(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const base =
    path
      .basename(originalname, ext)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'file';
  return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${ext}`;
}

export async function saveUpload(file) {
  const name = safeName(file.originalname);
  if (!useRemote) {
    if (ON_VERCEL) throw new Error(NO_REMOTE_MSG);
    fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
    return { name, url: `/uploads/${name}`, size: file.size, type: file.mimetype };
  }
  const key = `${UPLOAD_PREFIX}${name}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: `public, max-age=${60 * 60 * 24 * 365}, immutable`
    })
  );
  return { name, url: publicUrl(key), size: file.size, type: file.mimetype };
}

export async function listUploads(allowed) {
  if (!useRemote) {
    if (ON_VERCEL) return [];
    return fs
      .readdirSync(UPLOAD_DIR)
      .filter((f) => allowed.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(UPLOAD_DIR, f));
        return { name: f, url: `/uploads/${f}`, size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  }
  const objects = await listAll(UPLOAD_PREFIX);
  return objects
    .map((o) => ({
      name: o.Key.slice(UPLOAD_PREFIX.length),
      url: publicUrl(o.Key),
      size: o.Size,
      mtime: new Date(o.LastModified).getTime()
    }))
    .filter((f) => allowed.test(f.name))
    .sort((a, b) => b.mtime - a.mtime);
}

export async function removeUpload(name) {
  const safe = path.basename(name);
  if (!useRemote) {
    const file = path.join(UPLOAD_DIR, safe);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: `${UPLOAD_PREFIX}${safe}` }));
}
