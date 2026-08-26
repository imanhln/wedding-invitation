// Lớp lưu trữ dùng chung cho cả 2 môi trường:
//   - Local (npm run dev): ghi file xuống server/data + server/uploads như cũ.
//   - Vercel: filesystem chỉ đọc và bị xoá mỗi lần deploy, nên đẩy hết lên Vercel Blob.
// Mọi khoá lưu trữ đều gắn tiền tố SITE_ID => nhà trai và nhà gái dùng chung
// một Blob store nhưng dữ liệu hoàn toàn tách biệt.
import { put, list, del } from '@vercel/blob';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const slug = (v, fallback) =>
  String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || fallback;

export const SITE_ID = slug(process.env.SITE_ID, 'default');

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
export const useBlob = Boolean(BLOB_TOKEN);

// Ảnh nằm ở đường dẫn đoán được (phải công khai để hiển thị trên thiệp),
// còn file JSON chứa danh sách khách + lời chúc thì giấu sau một thư mục băm
// từ DATA_SECRET để không ai dò ra URL.
//
// ĐỪNG đổi DATA_SECRET sau khi đã có dữ liệu — đổi là đổi luôn đường dẫn,
// dữ liệu cũ vẫn nằm đó nhưng site sẽ không tìm thấy nữa.
const DATA_SECRET = process.env.DATA_SECRET || `fallback:${SITE_ID}`;
if (useBlob && !process.env.DATA_SECRET) {
  console.warn('[store] Chua dat DATA_SECRET — duong dan file du lieu co the bi doan ra.');
}
const VAULT = crypto.createHash('sha256').update(`${SITE_ID}:${DATA_SECRET}`).digest('hex').slice(0, 24);

const DATA_PREFIX = `${SITE_ID}/${VAULT}/`;
export const UPLOAD_PREFIX = `${SITE_ID}/uploads/`;

/* ------------------------------ Vercel Blob ------------------------------ */

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token: BLOB_TOKEN });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function blobRead(name, fallback) {
  const pathname = `${DATA_PREFIX}${name}.json`;
  const { blobs } = await list({ prefix: pathname, limit: 100, token: BLOB_TOKEN });
  const hit = blobs.find((b) => b.pathname === pathname);
  if (!hit) return structuredClone(fallback);
  try {
    // Blob URL đi qua CDN nên phải kèm dấu thời gian để luôn lấy bản mới nhất.
    const res = await fetch(`${hit.url}?v=${new Date(hit.uploadedAt).getTime()}`, { cache: 'no-store' });
    if (!res.ok) return structuredClone(fallback);
    return await res.json();
  } catch {
    return structuredClone(fallback);
  }
}

async function blobWrite(name, value) {
  await put(`${DATA_PREFIX}${name}.json`, JSON.stringify(value, null, 2), {
    access: 'public',
    token: BLOB_TOKEN,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0
  });
  return value;
}

/* -------------------------------- Local FS ------------------------------- */

const DATA_DIR = path.join(__dirname, 'data');
export const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!useBlob) {
  // Filesystem của Vercel chỉ đọc — nếu quên nối Blob store thì báo lỗi rõ ràng
  // ngay lúc khởi động thay vì để từng request hỏng một cách khó hiểu.
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('[store] Khong ghi duoc xuong dia. Tren Vercel hay them Blob store vao project.', err.message);
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
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return value;
}

/* -------------------------------- Public --------------------------------- */

export const readJson = (name, fallback) =>
  useBlob ? blobRead(name, fallback) : Promise.resolve(fsRead(name, fallback));

export const writeJson = (name, value) =>
  useBlob ? blobWrite(name, value) : Promise.resolve(fsWrite(name, value));

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
  if (!useBlob) {
    fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
    return { name, url: `/uploads/${name}`, size: file.size, type: file.mimetype };
  }
  const res = await put(`${UPLOAD_PREFIX}${name}`, file.buffer, {
    access: 'public',
    token: BLOB_TOKEN,
    contentType: file.mimetype,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365
  });
  return { name, url: res.url, size: file.size, type: file.mimetype };
}

export async function listUploads(allowed) {
  if (!useBlob) {
    return fs
      .readdirSync(UPLOAD_DIR)
      .filter((f) => allowed.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(UPLOAD_DIR, f));
        return { name: f, url: `/uploads/${f}`, size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  }
  const blobs = await listAll(UPLOAD_PREFIX);
  return blobs
    .map((b) => ({
      name: b.pathname.slice(UPLOAD_PREFIX.length),
      url: b.url,
      size: b.size,
      mtime: new Date(b.uploadedAt).getTime()
    }))
    .filter((f) => allowed.test(f.name))
    .sort((a, b) => b.mtime - a.mtime);
}

export async function removeUpload(name) {
  const safe = path.basename(name);
  if (!useBlob) {
    const file = path.join(UPLOAD_DIR, safe);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  const pathname = `${UPLOAD_PREFIX}${safe}`;
  const { blobs } = await list({ prefix: pathname, limit: 100, token: BLOB_TOKEN });
  const hit = blobs.find((b) => b.pathname === pathname);
  if (hit) await del(hit.url, { token: BLOB_TOKEN });
}
