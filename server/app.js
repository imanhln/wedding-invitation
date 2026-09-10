import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultContent, DEFAULT_MUSIC_URL } from './defaultContent.js';
import { issueToken, verifyToken } from './session.js';
import { injectMeta, fallbackHtml } from './shareMeta.js';
import {
  SITE_ID,
  useRemote,
  UPLOAD_DIR,
  readJson,
  writeJson,
  saveUpload,
  listUploads,
  removeUpload
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1';

/* ------------------------------ Nội dung thiệp ---------------------------- */

// Bổ sung các khóa mới của defaultContent vào file đã lưu (khi nâng cấp schema)
function withDefaults(content) {
  const merge = (base, over) => {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base && typeof base === 'object') {
      const out = { ...base };
      for (const k of Object.keys(over || {})) {
        out[k] = k in base ? merge(base[k], over[k]) : over[k];
      }
      return out;
    }
    return over === undefined ? base : over;
  };
  const merged = migrateRsvp(withSectionDefaults(merge(defaultContent, content)));

  // Để trống ô nhạc trong trang quản trị = dùng lại bài mặc định.
  if (!merged.music?.url) merged.music = { ...merged.music, url: DEFAULT_MUSIC_URL };

  return merged;
}

// merge() ở trên để bản lưu thắng nguyên khối mảng `sections`, nên khoá mới của
// từng section phải bù riêng — ghép theo id, không khớp id thì ghép theo type.
function withSectionDefaults(content) {
  const bases = defaultContent.sections;
  const sections = (content.sections || []).map((saved) => {
    const base = bases.find((d) => d.id === saved.id) || bases.find((d) => d.type === saved.type);
    return base ? migrateMapUrl(migrateVenue({ ...base, ...saved }, saved), saved) : saved;
  });
  return { ...content, sections };
}

// Bản cũ gộp cả nơi cử hành vào `venueLine` (".. cử hành tại" + xuống dòng +
// "Tư gia"); bản mới tách dòng cuối ra `venuePlace` để trang quản trị chọn
// được nhà trai / nhà gái.
// Khoá cũ tên `directionUrl` vì nút ngày trước mở thẳng màn chỉ đường. Giờ nút
// chỉ ghim vị trí nên khoá đổi thành `mapUrl` — dữ liệu cũ và file backup cũ vẫn
// đọc được nhờ bước này.
function migrateMapUrl(section, saved) {
  if (section.type !== 'map' || !saved.directionUrl) return section;
  const { directionUrl, ...rest } = section;
  // Phải soi `saved` chứ không soi `rest.mapUrl`: sau bước ghép mặc định thì
  // `mapUrl` luôn có giá trị (của defaultContent), lấy nó là nuốt mất toạ độ
  // người dùng từng đặt ở khoá cũ.
  return { ...rest, mapUrl: saved.mapUrl || directionUrl };
}

function migrateVenue(section, saved) {
  if (section.type !== 'invitation' || 'venuePlace' in saved) return section;
  const lines = String(section.venueLine || '').split('\n');
  if (lines.length < 2) return section;
  return { ...section, venueLine: lines.slice(0, -1).join('\n'), venuePlace: lines.at(-1).trim() };
}

// Section 'rsvp' nay chỉ là cấu hình cho nút + modal trong panel tiệc cưới
// (không còn là một khối riêng trên thiệp). Bổ sung khóa mới cho dữ liệu cũ,
// và dựng lại section này nếu bản lưu từng đặt cấu hình trong calendar.rsvp.
function migrateRsvp(content) {
  const sections = content.sections || [];
  const defaults = defaultContent.sections.find((s) => s.type === 'rsvp');
  const isCalendar = (s) => s.type === 'calendar' || s.type === 'countdown';

  // Cấu hình từng nằm lồng trong section lịch — lấy ra rồi xoá khỏi đó
  const nested = sections.find((s) => isCalendar(s) && s.rsvp)?.rsvp || {};
  const clean = sections.map((s) => (isCalendar(s) && s.rsvp ? omit(s, 'rsvp') : s));

  const old = clean.find((s) => s.type === 'rsvp');
  const merged = migrateDeadline({ ...defaults, ...nested, ...(old || {}), type: 'rsvp' });
  if (old) return { ...content, sections: clean.map((s) => (s === old ? merged : s)) };

  // Chưa có section 'rsvp': chèn ngay sau section lịch cuối cùng
  const at = clean.reduce((last, s, i) => (isCalendar(s) ? i : last), -1);
  const next = [...clean];
  next.splice(at < 0 ? next.length : at + 1, 0, merged);
  return { ...content, sections: next };
}

// Bản cũ viết thẳng ngày hạn vào câu `note` ("... trước ngày 10.09.2026").
// Nay ngày nằm ở khoá `deadline` riêng: cắt ngày ở cuối câu ra, đổi sang
// yyyy-mm-dd để trang quản trị chỉnh bằng ô chọn ngày.
function migrateDeadline(rsvp) {
  const m = /^(.*?)[\s,]*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\s*$/.exec(rsvp.note || '');
  if (!m) return rsvp;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    ...rsvp,
    note: m[1].trim(),
    deadline: `${m[4]}-${pad(m[3])}-${pad(m[2])}`
  };
}

const omit = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

// Trang quản trị đọc bản đã bù mặc định rồi lưu nguyên cả cục đó xuống, nên nếu
// không gỡ ra thì bài mặc định bị "đóng đinh" vào dữ liệu ngay lần Lưu đầu tiên
// và ô nhạc không còn là "để trống = dùng mặc định" nữa.
function normalizeContent(content) {
  if (content.music?.url !== DEFAULT_MUSIC_URL) return content;
  return { ...content, music: { ...content.music, url: '' } };
}

const getContent = async () => withDefaults(await readJson('content', defaultContent));

/* -------------------------------- Sessions ------------------------------- */

function auth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (verifyToken(token)) return next();
  res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
}

/* --------------------------------- Upload -------------------------------- */

const ALLOWED = /\.(jpe?g|png|webp|gif|avif|mp3|m4a|wav|ogg|svg)$/i;

// Serverless function của Vercel chặn request body lớn hơn 4.5 MB, nên đặt trần
// dưới mức đó khi chạy trên R2. Ảnh đã được thu nhỏ sẵn ở phía trình duyệt.
const MAX_UPLOAD = useRemote ? 4 * 1024 * 1024 : 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD },
  fileFilter: (_req, file, cb) =>
    ALLOWED.test(file.originalname) ? cb(null, true) : cb(new Error('Định dạng file không được hỗ trợ'))
});

/* ---------------------------------- App ---------------------------------- */

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

// Chỉ cần khi chạy máy cá nhân; trên Vercel ảnh nằm trên R2 với URL tuyệt đối.
if (!useRemote) app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

/** Express 4 không bắt được lỗi của handler async — bọc lại để lỗi rơi vào error handler. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------ Public API ------------------------------- */

app.get('/api/config', (_req, res) =>
  res.json({ site: SITE_ID, storage: useRemote ? 'r2' : 'local', maxUpload: MAX_UPLOAD })
);

app.get('/api/content', wrap(async (_req, res) => res.json(await getContent())));

app.get(
  '/api/wishes',
  wrap(async (_req, res) => {
    const wishes = (await readJson('wishes', []))
      .filter((w) => !w.hidden)
      .map(({ hidden, ...w }) => w);

    // Lời nhắn khi xác nhận tham dự cũng là một lời chúc, nên gộp luôn vào
    // đây — gộp lúc đọc để không phải sửa dữ liệu RSVP đã có từ trước.
    const rsvpWishes = (await readJson('rsvp', []))
      .filter((r) => !r.hidden && String(r.message || '').trim())
      .map((r) => ({ id: `rsvp:${r.id}`, name: r.name, message: r.message, createdAt: r.createdAt }));

    const merged = [...wishes, ...rsvpWishes].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(merged);
  })
);

app.post(
  '/api/wishes',
  wrap(async (req, res) => {
    const { name, message } = req.body || {};
    if (!name || !String(name).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'Thiếu tên hoặc lời chúc' });
    }
    const wishes = await readJson('wishes', []);
    const wish = {
      id: crypto.randomUUID(),
      name: String(name).trim().slice(0, 80),
      message: String(message).trim().slice(0, 1000),
      createdAt: new Date().toISOString(),
      hidden: false
    };
    wishes.unshift(wish);
    await writeJson('wishes', wishes);
    res.json({ ok: true, wish: { id: wish.id, name: wish.name, message: wish.message, createdAt: wish.createdAt } });
  })
);

/* Khách nhập số điện thoại rất tự do: "0912 345 678", "0912.345.678",
   "(+84) 912-345-678". Chỉ giữ chữ số (và dấu + nếu là số quốc tế) để bấm gọi
   được ngay từ trang quản trị và dễ soi trùng, nhưng vẫn phải là số thật mới
   nhận — 8..15 chữ số theo chuẩn E.164. */
function normalizePhone(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: true, value: '' };
  const plus = text.startsWith('+') || text.startsWith('(+') ? '+' : '';
  const digits = text.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return { ok: false, value: '' };
  return { ok: true, value: `${plus}${digits}` };
}

app.post(
  '/api/rsvp',
  wrap(async (req, res) => {
    const { name, phone, attending, guests, side, pickup, stay, message } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Vui lòng nhập tên của bạn' });

    const willAttend = attending === true || attending === 'yes';

    const tel = normalizePhone(phone);
    if (!tel.ok) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });

    // Bắt buộc hay không do trang quản trị quyết định (section 'rsvp'), nên
    // phải soi cấu hình ở đây chứ không tin mỗi kiểm tra phía trình duyệt.
    // Chỉ đòi số của khách sẽ đến — khách đã báo bận thì không cần liên lạc.
    const cfg = (await getContent()).sections?.find((s) => s.type === 'rsvp') || {};
    if (cfg.askPhone && cfg.phoneRequired && willAttend && !tel.value) {
      return res.status(400).json({ error: 'Vui lòng nhập số điện thoại' });
    }

    const guestName = String(name).trim().slice(0, 80);
    const guestMessage = String(message || '').slice(0, 500);
    const now = new Date().toISOString();

    const list = await readJson('rsvp', []);
    list.unshift({
      id: crypto.randomUUID(),
      name: guestName,
      phone: tel.value,
      attending: willAttend,
      guests: Number(guests) || 1,
      side: String(side || '').slice(0, 40),
      pickup: String(pickup || '').slice(0, 120),
      // 'yes' = ở lại chơi, 'no' = về luôn, '' = không hỏi / khách báo bận.
      stay: willAttend && (stay === 'yes' || stay === 'no') ? stay : '',
      message: guestMessage,
      createdAt: now
    });
    await writeJson('rsvp', list);
    res.json({ ok: true });
  })
);

/* ------------------------------- Admin API ------------------------------- */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mật khẩu không đúng' });
  }
  res.json({ token: issueToken() });
});

// Token tự hết hạn theo chữ ký nên đăng xuất chỉ cần xoá ở phía trình duyệt.
app.post('/api/admin/logout', auth, (_req, res) => res.json({ ok: true }));

app.get('/api/admin/me', auth, (_req, res) => res.json({ ok: true }));

app.put(
  '/api/admin/content',
  auth,
  wrap(async (req, res) => {
    const content = req.body;
    if (!content || typeof content !== 'object' || !Array.isArray(content.sections)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }
    await writeJson('content', normalizeContent(content));
    res.json({ ok: true, savedAt: new Date().toISOString() });
  })
);

app.post(
  '/api/admin/content/reset',
  auth,
  wrap(async (_req, res) => {
    await writeJson('content', defaultContent);
    res.json(defaultContent);
  })
);

app.post(
  '/api/admin/upload',
  auth,
  upload.array('files', 40),
  wrap(async (req, res) => {
    const files = [];
    for (const file of req.files || []) files.push(await saveUpload(file));
    res.json({ files });
  })
);

app.get(
  '/api/admin/uploads',
  auth,
  wrap(async (_req, res) => res.json({ files: await listUploads(ALLOWED) }))
);

app.delete(
  '/api/admin/uploads/:name',
  auth,
  wrap(async (req, res) => {
    await removeUpload(req.params.name);
    res.json({ ok: true });
  })
);

app.get('/api/admin/rsvp', auth, wrap(async (_req, res) => res.json(await readJson('rsvp', []))));

app.delete(
  '/api/admin/rsvp/:id',
  auth,
  wrap(async (req, res) => {
    const list = await readJson('rsvp', []);
    await writeJson('rsvp', list.filter((r) => r.id !== req.params.id));
    res.json({ ok: true });
  })
);

app.get('/api/admin/wishes', auth, wrap(async (_req, res) => res.json(await readJson('wishes', []))));

app.patch(
  '/api/admin/wishes/:id',
  auth,
  wrap(async (req, res) => {
    const wishes = (await readJson('wishes', [])).map((w) =>
      w.id === req.params.id ? { ...w, hidden: !!req.body.hidden } : w
    );
    await writeJson('wishes', wishes);
    res.json({ ok: true });
  })
);

app.delete(
  '/api/admin/wishes/:id',
  auth,
  wrap(async (req, res) => {
    const wishes = await readJson('wishes', []);
    await writeJson('wishes', wishes.filter((w) => w.id !== req.params.id));
    res.json({ ok: true });
  })
);

app.get(
  '/api/admin/export',
  auth,
  wrap(async (_req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="wedding-${SITE_ID}-backup.json"`);
    res.json({
      site: SITE_ID,
      content: await getContent(),
      rsvp: await readJson('rsvp', []),
      wishes: await readJson('wishes', [])
    });
  })
);

app.post(
  '/api/admin/import',
  auth,
  wrap(async (req, res) => {
    const { content, rsvp, wishes } = req.body || {};
    // File backup do /export tạo ra chứa nội dung đã bù mặc định, nên phải gỡ
    // lại y như lúc lưu từ trang quản trị (xem normalizeContent).
    if (content) await writeJson('content', normalizeContent(content));
    if (Array.isArray(rsvp)) await writeJson('rsvp', rsvp);
    if (Array.isArray(wishes)) await writeJson('wishes', wishes);
    res.json({ ok: true });
  })
);

/* ---------------------- Serve built client (production) ------------------ */
/* File tĩnh (js/css/ảnh) vẫn do CDN của Vercel phục vụ; rewrite chỉ đẩy sang đây
   những đường dẫn không trùng file nào, tức là các trang HTML. Trang HTML phải
   đi qua đây để được chèn sẵn thẻ og:* — xem shareMeta.js.                    */

// index: false để "/" không bị express.static trả index.html thô, bỏ qua bước
// chèn thẻ meta ở dưới.
if (fs.existsSync(CLIENT_DIST)) app.use(express.static(CLIENT_DIST, { index: false }));

const baseUrl = (req) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto']?.split(',')[0] || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
};

// Khung HTML không đổi giữa các request nên đọc một lần rồi giữ lại.
let shellCache = '';

/**
 * Lấy index.html đã build. Chạy máy cá nhân thì đọc từ đĩa; trên Vercel thì
 * client/dist không nằm trong bundle của serverless function nên tải qua
 * /index.html — đường dẫn đó trùng một file tĩnh thật nên bước `handle:
 * filesystem` trong vercel.json phục vụ luôn, không quay lại đây.
 *
 * redirect: 'manual' là chốt an toàn: '/' giờ do chính function này phục vụ, nên
 * nếu một ngày '/index.html' bị chuyển hướng về '/' (ví dụ bật cleanUrls) thì
 * fetch đi theo sẽ thành vòng lặp vô tận. Gặp 3xx thì coi như thất bại và dùng
 * fallbackHtml.
 */
async function loadShell(req) {
  if (shellCache) return shellCache;
  const local = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(local)) return (shellCache = fs.readFileSync(local, 'utf8'));
  try {
    const res = await fetch(`${baseUrl(req)}/index.html`, { redirect: 'manual' });
    const html = res.ok ? await res.text() : '';
    if (html.includes('id="root"')) return (shellCache = html);
    console.error('[shell] /index.html tra ve khong hop le:', res.status);
  } catch (err) {
    console.error('[shell]', err.message);
  }
  return '';
}

app.get(
  '*',
  wrap(async (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    const base = baseUrl(req);
    const pageUrl = `${base}${req.originalUrl}`;
    const search = req.originalUrl.slice(req.path.length);
    const content = await getContent();
    const shell = await loadShell(req);

    // CDN giữ HTML 60s để không phải gọi function mỗi lượt xem. Nội dung thiệp
    // vẫn lấy từ /api/content nên sửa trong trang quản trị hiện ra ngay; chỉ
    // riêng thẻ chia sẻ là chậm tối đa 60s.
    res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400');
    res.type('html').send(
      shell
        ? await injectMeta(shell, content, base, pageUrl)
        : await fallbackHtml(content, base, pageUrl, search)
    );
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  const tooBig = err.code === 'LIMIT_FILE_SIZE';
  res.status(tooBig ? 413 : 400).json({
    error: tooBig
      ? `File vượt quá ${Math.round(MAX_UPLOAD / 1024 / 1024)} MB. Hãy nén bớt rồi tải lại.`
      : err.message || 'Lỗi máy chủ'
  });
});

export default app;
