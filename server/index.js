import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultContent } from './defaultContent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------------------------- JSON file store ---------------------------- */

function readJson(name, fallback) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

function writeJson(name, value) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return value;
}

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
  return migrateRsvp(merge(defaultContent, content));
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
  const merged = { ...defaults, ...nested, ...(old || {}), type: 'rsvp' };
  if (old) return { ...content, sections: clean.map((s) => (s === old ? merged : s)) };

  // Chưa có section 'rsvp': chèn ngay sau section lịch cuối cùng
  const at = clean.reduce((last, s, i) => (isCalendar(s) ? i : last), -1);
  const next = [...clean];
  next.splice(at < 0 ? next.length : at + 1, 0, merged);
  return { ...content, sections: next };
}

const omit = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

if (!fs.existsSync(path.join(DATA_DIR, 'content.json'))) writeJson('content', defaultContent);

const getContent = () => withDefaults(readJson('content', defaultContent));

/* -------------------------------- Sessions ------------------------------- */

const loadSessions = () => readJson('sessions', {});
const saveSessions = (s) => writeJson('sessions', s);
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 ngày

function issueToken() {
  const token = crypto.randomBytes(24).toString('hex');
  const sessions = loadSessions();
  const now = Date.now();
  for (const [t, exp] of Object.entries(sessions)) if (exp < now) delete sessions[t];
  sessions[token] = now + SESSION_TTL;
  saveSessions(sessions);
  return token;
}

function auth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  const sessions = loadSessions();
  if (token && sessions[token] && sessions[token] > Date.now()) return next();
  res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
}

/* --------------------------------- Upload -------------------------------- */

const ALLOWED = /\.(jpe?g|png|webp|gif|avif|mp3|m4a|wav|ogg|svg)$/i;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base =
      path
        .basename(file.originalname, ext)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'file';
    cb(null, `${base}-${Date.now().toString(36)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.test(file.originalname) ? cb(null, true) : cb(new Error('Định dạng file không được hỗ trợ'))
});

/* ---------------------------------- App ---------------------------------- */

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

/* ------------------------------ Public API ------------------------------- */

app.get('/api/content', (_req, res) => res.json(getContent()));

app.get('/api/wishes', (_req, res) => {
  const wishes = readJson('wishes', []).filter((w) => !w.hidden);
  res.json(wishes.map(({ hidden, ...w }) => w));
});

app.post('/api/wishes', (req, res) => {
  const { name, message } = req.body || {};
  if (!name || !String(name).trim() || !message || !String(message).trim()) {
    return res.status(400).json({ error: 'Thiếu tên hoặc lời chúc' });
  }
  const wishes = readJson('wishes', []);
  const wish = {
    id: crypto.randomUUID(),
    name: String(name).trim().slice(0, 80),
    message: String(message).trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
    hidden: false
  };
  wishes.unshift(wish);
  writeJson('wishes', wishes);
  res.json({ ok: true, wish: { id: wish.id, name: wish.name, message: wish.message, createdAt: wish.createdAt } });
});

app.post('/api/rsvp', (req, res) => {
  const { name, attending, guests, side, message } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Vui lòng nhập tên của bạn' });
  const list = readJson('rsvp', []);
  list.unshift({
    id: crypto.randomUUID(),
    name: String(name).trim().slice(0, 80),
    attending: attending === true || attending === 'yes',
    guests: Number(guests) || 1,
    side: String(side || '').slice(0, 40),
    message: String(message || '').slice(0, 500),
    createdAt: new Date().toISOString()
  });
  writeJson('rsvp', list);
  res.json({ ok: true });
});

/* ------------------------------- Admin API ------------------------------- */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mật khẩu không đúng' });
  }
  res.json({ token: issueToken() });
});

app.post('/api/admin/logout', auth, (req, res) => {
  const sessions = loadSessions();
  delete sessions[req.headers['x-admin-token']];
  saveSessions(sessions);
  res.json({ ok: true });
});

app.get('/api/admin/me', auth, (_req, res) => res.json({ ok: true }));

app.put('/api/admin/content', auth, (req, res) => {
  const content = req.body;
  if (!content || typeof content !== 'object' || !Array.isArray(content.sections)) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }
  writeJson('content', content);
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.post('/api/admin/content/reset', auth, (_req, res) => {
  writeJson('content', defaultContent);
  res.json(defaultContent);
});

app.post('/api/admin/upload', auth, upload.array('files', 40), (req, res) => {
  const files = (req.files || []).map((f) => ({
    name: f.filename,
    url: `/uploads/${f.filename}`,
    size: f.size,
    type: f.mimetype
  }));
  res.json({ files });
});

app.get('/api/admin/uploads', auth, (_req, res) => {
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => ALLOWED.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(UPLOAD_DIR, f));
      return { name: f, url: `/uploads/${f}`, size: st.size, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  res.json({ files });
});

app.delete('/api/admin/uploads/:name', auth, (req, res) => {
  const file = path.join(UPLOAD_DIR, path.basename(req.params.name));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

app.get('/api/admin/rsvp', auth, (_req, res) => res.json(readJson('rsvp', [])));

app.delete('/api/admin/rsvp/:id', auth, (req, res) => {
  writeJson('rsvp', readJson('rsvp', []).filter((r) => r.id !== req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/wishes', auth, (_req, res) => res.json(readJson('wishes', [])));

app.patch('/api/admin/wishes/:id', auth, (req, res) => {
  const wishes = readJson('wishes', []).map((w) =>
    w.id === req.params.id ? { ...w, hidden: !!req.body.hidden } : w
  );
  writeJson('wishes', wishes);
  res.json({ ok: true });
});

app.delete('/api/admin/wishes/:id', auth, (req, res) => {
  writeJson('wishes', readJson('wishes', []).filter((w) => w.id !== req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/export', auth, (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="wedding-backup.json"');
  res.json({ content: getContent(), rsvp: readJson('rsvp', []), wishes: readJson('wishes', []) });
});

app.post('/api/admin/import', auth, (req, res) => {
  const { content, rsvp, wishes } = req.body || {};
  if (content) writeJson('content', content);
  if (Array.isArray(rsvp)) writeJson('rsvp', rsvp);
  if (Array.isArray(wishes)) writeJson('wishes', wishes);
  res.json({ ok: true });
});

/* ---------------------- Serve built client (production) ------------------ */

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Lỗi máy chủ' });
});

app.listen(PORT, () => {
  console.log(`\n  Wedding API  -> http://localhost:${PORT}`);
  console.log(`  Mat khau admin: ${ADMIN_PASSWORD} (doi bang bien moi truong ADMIN_PASSWORD)\n`);
});
