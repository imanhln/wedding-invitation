// Trên Vercel mỗi request có thể rơi vào một container khác nhau, không có chỗ
// nào lưu danh sách phiên đăng nhập. Nên token được ký sẵn hạn dùng bằng HMAC:
// server chỉ cần kiểm chữ ký, không cần nhớ gì cả.
import crypto from 'node:crypto';

const TTL = 1000 * 60 * 60 * 24 * 7; // 7 ngày

const secret = () =>
  process.env.SESSION_SECRET || `${process.env.ADMIN_PASSWORD || '1'}:${process.env.SITE_ID || 'default'}`;

const sign = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export function issueToken() {
  const body = Buffer.from(String(Date.now() + TTL)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return false;
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(Buffer.from(body, 'base64url').toString()) > Date.now();
}
