/* Đổi link YouTube thành file nhạc của thiệp.
 *
 *   npm run music:from-youtube -- "https://youtu.be/xxxxxxxxxxx"
 *
 * Vì sao phải làm bước này: iframe YouTube phát được nhạc, nhưng trình duyệt
 * nhúng trong app (Zalo, Messenger...) trên iPhone bung mọi video ra trình phát
 * toàn màn hình của hệ thống — khách bấm "Mở thiệp" là thấy video đè lên thiệp,
 * và trang không có cách nào chặn (xem youtubeAudioBlocked() trong
 * client/src/utils.js). Nhạc là FILE thì không có video nào để bung, lại chạy
 * tiếp được khi khách tắt màn hình. Script tải sẵn phần tiếng của video, lưu vào
 * đúng kho ảnh/nhạc của site rồi gán luôn vào ô nhạc của nội dung thiệp.
 *
 * Cần yt-dlp trên máy (ffmpeg là tuỳ chọn: để ra .mp3 và để cắt đoạn):
 *   winget install yt-dlp.yt-dlp ffmpeg
 *   scoop install yt-dlp ffmpeg          # hoặc: pipx install yt-dlp
 *
 * Ghi vào kho nào là do biến môi trường quyết định, GIỐNG HỆT lúc chạy server:
 *   - Không có BLOB_READ_WRITE_TOKEN -> ghi xuống server/uploads (chỉ máy mình thấy).
 *   - Có token -> ghi lên Vercel Blob của site thật; nhớ đặt đúng cả SITE_ID và
 *     DATA_SECRET như trên Vercel, không thì nội dung bị ghi vào sai chỗ.
 *   Gọn nhất là để các biến đó trong .env ở gốc repo — script tự đọc.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Node 20.12+ có sẵn; đọc .env ở gốc repo để không phải export tay từng biến.
// Phải chạy TRƯỚC khi nạp store.js vì store.js đọc env ngay lúc import.
try { process.loadEnvFile?.(new URL('../../.env', import.meta.url)); } catch { /* chưa có .env */ }

const { saveUpload, readJson, writeJson, useBlob, SITE_ID } = await import('../store.js');
const { defaultContent } = await import('../defaultContent.js');

/* --------------------------------- Tham số -------------------------------- */

const VALUE_FLAGS = new Set(['format', 'bitrate', 'clip', 'name']);

const opts = {};
const rest = [];
for (let i = 0; i < process.argv.length - 2; i += 1) {
  const arg = process.argv[i + 2];
  if (!arg.startsWith('--')) { rest.push(arg); continue; }
  const key = arg.slice(2);
  if (VALUE_FLAGS.has(key)) { i += 1; opts[key] = process.argv[i + 2]; }
  else opts[key] = true;
}

const HELP = `
Dùng: npm run music:from-youtube -- <link YouTube> [tuỳ chọn]

  --format mp3|m4a   mặc định: mp3 nếu máy có ffmpeg, không thì m4a
                     (cả hai đều phát được trên iOS, Android và máy tính)
  --bitrate 128      chỉ với mp3 — kbps, càng thấp file càng nhẹ (mặc định 128)
  --clip 15-105      chỉ lấy từ giây 15 đến giây 105 (cần ffmpeg); nhận cả 0:15-1:45
  --name "ten-bai"   tên file muốn đặt (mặc định lấy tên video)
  --no-apply         chỉ tải + lưu file, KHÔNG sửa ô nhạc trong nội dung thiệp
`;

const link = rest[0] || '';
if (!link || opts.help) {
  console.log(HELP);
  process.exit(link ? 0 : 1);
}

const videoId = (() => {
  const m = link.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(link) ? link : '';
})();

if (!videoId) {
  console.error(`Không đọc được mã video từ: ${link}`);
  console.error('Cần link dạng https://youtu.be/xxxxxxxxxxx hoặc https://www.youtube.com/watch?v=xxxxxxxxxxx');
  process.exit(1);
}

/* ----------------------------- Kiểm tra công cụ --------------------------- */

const YTDLP = process.env.YTDLP || 'yt-dlp';

const canRun = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'ignore' });
  return !r.error && r.status === 0;
};

if (!canRun(YTDLP, ['--version'])) {
  console.error(`Không tìm thấy yt-dlp (đã thử: ${YTDLP}). Cài một trong các cách sau rồi chạy lại:`);
  console.error('  winget install yt-dlp.yt-dlp');
  console.error('  scoop install yt-dlp');
  console.error('  pipx install yt-dlp');
  console.error('Có sẵn file rời thì trỏ thẳng vào: set YTDLP=D:\\tools\\yt-dlp.exe');
  process.exit(1);
}

const hasFfmpeg = canRun('ffmpeg', ['-version']);
const format = String(opts.format || (hasFfmpeg ? 'mp3' : 'm4a')).toLowerCase();

if (!['mp3', 'm4a'].includes(format)) {
  console.error(`--format chỉ nhận mp3 hoặc m4a, không nhận "${format}".`);
  process.exit(1);
}
if (format === 'mp3' && !hasFfmpeg) {
  console.error('Ra file .mp3 thì cần ffmpeg (winget install ffmpeg). Không muốn cài thì thêm --format m4a.');
  process.exit(1);
}
if (opts.clip && !hasFfmpeg) {
  console.error('Cắt đoạn (--clip) cần ffmpeg (winget install ffmpeg).');
  process.exit(1);
}

/* --------------------------------- Tải về --------------------------------- */

const url = `https://www.youtube.com/watch?v=${videoId}`;
const bitrate = String(opts.bitrate || '128');

const title = (() => {
  try {
    return execFileSync(YTDLP, ['--no-warnings', '--print', '%(title)s', url], { encoding: 'utf8' }).trim();
  } catch {
    return videoId; // video giới hạn xem: vẫn cứ thử tải, chỉ là không có tên đẹp
  }
})();

console.log(`Bài: ${title}`);
console.log(
  `Định dạng: .${format}${format === 'mp3' ? ` ${bitrate}kbps` : ''}${opts.clip ? ` · cắt ${opts.clip}` : ''}`
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-music-'));

// Chỉ lấy luồng audio: nhẹ hơn tải cả video, và giữ nguyên m4a thì không cần ffmpeg.
const args = ['--no-warnings', '--no-playlist', '-o', path.join(tmp, 'audio.%(ext)s')];
if (format === 'mp3') args.push('-x', '--audio-format', 'mp3', '--audio-quality', `${bitrate}K`);
else args.push('-f', 'bestaudio[ext=m4a]/bestaudio');
if (opts.clip) args.push('--download-sections', `*${opts.clip}`);
args.push(url);

const fail = (...msg) => {
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const m of msg) console.error(m);
  process.exit(1);
};

try {
  execFileSync(YTDLP, args, { stdio: 'inherit' });
} catch {
  fail(
    '\nyt-dlp tải không xong. Hay gặp nhất: link riêng tư / giới hạn tuổi, hoặc yt-dlp đã cũ.',
    'Thử cập nhật rồi chạy lại: yt-dlp -U'
  );
}

const file = fs.readdirSync(tmp).find((f) => f.startsWith('audio.'));
if (!file) fail('Không thấy file nhạc sau khi tải.');

const ext = path.extname(file).toLowerCase();

/* Safari không phát được opus/webm — thà dừng ở đây còn hơn để thiệp im lặng
   trên iPhone, đúng cái mà cả script này sinh ra để tránh. */
if (!['.mp3', '.m4a'].includes(ext)) {
  fail(
    `Video này chỉ có luồng ${ext} — iPhone không phát được.`,
    'Cài ffmpeg rồi chạy lại (winget install ffmpeg) để chuyển sang .mp3.'
  );
}

const buffer = fs.readFileSync(path.join(tmp, file));
fs.rmSync(tmp, { recursive: true, force: true });

const mb = buffer.length / 1024 / 1024;

/* ------------------------- Lưu vào kho của site --------------------------- */

// saveUpload nhận đúng hình dạng file của multer: originalname / buffer / size / mimetype.
const saved = await saveUpload({
  originalname: `${opts.name || title || 'nhac-nen'}${ext}`,
  buffer,
  size: buffer.length,
  mimetype: ext === '.mp3' ? 'audio/mpeg' : 'audio/mp4'
});

console.log(`\nĐã lưu: ${saved.url}`);
console.log(
  `Kích thước: ${mb.toFixed(1)} MB · kho: ${useBlob ? `Vercel Blob (site "${SITE_ID}")` : 'server/uploads (chỉ máy này)'}`
);
if (mb > 8) {
  console.warn('File hơi nặng cho mạng 4G — nhẹ bớt bằng --bitrate 96, hoặc cắt ngắn bằng --clip 0-120.');
}

/* --------------------- Gán vào ô nhạc của nội dung thiệp ------------------ */

if (opts['no-apply']) {
  console.log('\n--no-apply: chưa sửa nội dung thiệp. Dán link trên vào ô nhạc ở /admin là xong.');
  process.exit(0);
}

const content = await readJson('content', defaultContent);
content.music = { ...(content.music || {}), enabled: true, url: saved.url };
await writeJson('content', content);

console.log('\nĐã gán vào ô nhạc của thiệp (music.url) và bật nhạc nền.');
console.log('Mở /admin xem lại là thấy. Từ giờ khách mở thiệp từ Zalo trên iPhone cũng nghe được nhạc.');
