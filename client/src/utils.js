const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "2026-01-03" -> "Thứ Bảy, ngày 03 tháng 01 năm 2026" */
export function formatVnDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '';
  const p = (n) => String(n).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ngày ${p(d.getDate())} tháng ${p(d.getMonth() + 1)} năm ${d.getFullYear()}`;
}

export function formatShortDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Tách ngày cho cụm ngày lớn trong panel ("19 | Tháng 9 / 2026").
 * `day` đệm 0 vì đứng một mình làm con số lớn; `month` thì KHÔNG đệm — đi liền
 * chữ "Tháng" nên "Tháng 9" đọc tự nhiên hơn "Tháng 09".
 */
export function splitDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    weekday: WEEKDAYS[d.getDay()],
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1),
    year: d.getFullYear()
  };
}

/**
 * Nhận diện toạ độ "vĩ độ, kinh độ" (vd "19.87625, 105.684278").
 * Ghim theo toạ độ chính xác hơn tra theo tên địa danh, nhất là ở cấp thôn/xã.
 * -> chuỗi đã chuẩn hoá "lat,lng", hoặc '' nếu không phải toạ độ.
 */
export function parseCoords(raw) {
  const m = (raw || '').trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return '';
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
  return `${lat},${lng}`;
}

/**
 * Toạ độ / link Google Maps / địa chỉ -> link mở Google Maps ở tab mới.
 *
 * Dùng dạng `maps/search` (ghim vị trí) chứ KHÔNG dùng `maps/dir` — dạng dir
 * nhảy thẳng vào màn chỉ đường và đòi vị trí hiện tại của khách. Khách chỉ cần
 * xem tiệc tổ chức ở đâu; muốn chỉ đường thì bấm nút Đường đi trong Maps.
 */
export function toMapUrl(mapUrl, address) {
  const coords = parseCoords(mapUrl);
  if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords}`;
  if (mapUrl) return mapUrl;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return '';
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

/**
 * Giải mã sâu chuỗi bị mã hoá nhiều lần.
 *
 * Ứng dụng chat trên điện thoại (Zalo, Messenger, Viber...) hay mã hoá LẠI link
 * trước khi mở trong trình duyệt trong app: dấu `%` của "%20" thành "%25", nên
 * máy khách nhận "?to=Nguy%E1%BB%85n%2520V%C4%83n%2520A". URLSearchParams chỉ
 * giải mã một lượt -> tên khách còn dính "%20" giữa các chữ. Giải tiếp cho tới
 * khi hết dấu mã hoá (giới hạn vài vòng cho an toàn).
 */
function decodeDeep(value) {
  let out = String(value || '');
  for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(out); i += 1) {
    let next;
    try {
      next = decodeURIComponent(out);
    } catch {
      break; // có dấu % lẻ (tên khách thật sự chứa "%") -> giữ nguyên
    }
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Lấy tên khách mời từ query: ?to=Nguyễn Văn A */
export function guestFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('to') || p.get('guest') || '';
  // Lớp mã hoá bên trong còn hay dùng "+" thay khoảng trắng; tên người không có "+".
  return decodeDeep(raw).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
}

export const uid = () => Math.random().toString(36).slice(2, 9);

/* ================================ NHẠC NỀN ===============================
   Trình duyệt chỉ phát được FILE nhạc (.mp3/.m4a/...) qua thẻ <audio>.
   Link trang nghe nhạc (nhaccuatui, zingmp3, Spotify...) là trang HTML nên
   không phát được. Riêng YouTube thì phát qua iframe player ẩn.            */

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba)(\?|#|$)/i;

const MUSIC_PAGE_HOSTS = [
  'nhaccuatui.com', 'nct.nixcdn.com/song', 'zingmp3.vn', 'mp3.zing.vn',
  'spotify.com', 'soundcloud.com', 'music.apple.com', 'music.youtube.com'
];

/** Lấy videoId từ mọi dạng link YouTube (kể cả khi dán nguyên thẻ <iframe>). */
export function youtubeId(raw) {
  const text = (raw || '').trim();
  if (!text) return '';
  const fromIframe = text.match(/src=["']([^"']+)["']/i);
  const url = fromIframe ? fromIframe[1] : text;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  return m ? m[1] : '';
}

/* --------- Máy nào KHÔNG dùng được nhạc YouTube (phải im lặng) -----------
   Trình duyệt nhúng trong app (Zalo, Messenger, Facebook...) trên iPhone là
   WKWebView. Nếu app không bật allowsInlineMediaPlayback thì iOS bung MỌI video
   sang trình phát toàn màn hình của hệ thống — kể cả video của iframe nhạc ẩn.
   Cú bung đó không đi qua Fullscreen API nên trang không bắt được để thoát:
   khách bấm "Mở thiệp" là thấy video YouTube đè lên thiệp. Zalo bản này bật,
   bản kia không, nên "máy bị máy không".

   Không chặn được thì né: ở đúng nhóm máy này coi như không có nhạc — thà im
   lặng còn hơn ném video vào mặt khách. Muốn ai cũng nghe được thì dùng .mp3. */
export function youtubeAudioBlocked() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  const isIOS = /iP(hone|od|ad)/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS khai là Mac
  if (!isIOS) return false;

  /* Trình duyệt thật trên iOS (Safari, Chrome/CriOS, Firefox/FxiOS) đều có token
     "Safari/"; WKWebView nhúng trong app thì không — đó là dấu hiệu chắc nhất,
     kèm tên vài app hay được dùng để gửi thiệp. */
  return !/Safari\//.test(ua)
    || /\b(Zalo|FBAN|FBAV|FB_IAB|Instagram|Line|MicroMessenger)\b/i.test(ua);
}

/**
 * Phân loại link nhạc.
 * -> { type: 'youtube', id } | { type: 'file', url } | { type: 'page', url } | null
 */
export function parseMusicSource(raw) {
  const url = (raw || '').trim();
  if (!url) return null;

  const id = youtubeId(url);
  if (id) {
    // blocked: máy này bật nhạc YouTube lên là văng video toàn màn hình
    return { type: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}`, blocked: youtubeAudioBlocked() };
  }

  // File tự tải lên (/uploads/...) hoặc link có đuôi file nhạc
  if (url.startsWith('/') || url.startsWith('data:audio') || url.startsWith('blob:')) {
    return { type: 'file', url };
  }
  if (AUDIO_EXT.test(url)) return { type: 'file', url };

  if (MUSIC_PAGE_HOSTS.some((h) => url.includes(h))) return { type: 'page', url };

  // Link lạ: vẫn thử phát như file, nhưng đánh dấu để trang quản trị cảnh báo
  return { type: 'file', url, uncertain: true };
}

/* ============================== TẢI ẢNH VỀ MÁY ============================
   Thẻ <a download> chỉ ép tải được với link cùng origin / data: / blob:.
   Ảnh QR có thể là link ngoài, nên tải qua fetch -> blob trước; hỏng thì
   quay về cách thường (cùng origin vẫn tải được, link ngoài thì mở tab mới). */

/** Bỏ dấu tiếng Việt & ký tự lạ để tên file an toàn trên mọi hệ điều hành. */
export function safeFileName(text, fallback = 'file') {
  const slug = (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function clickDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Tải ảnh về máy.
 * -> true nếu tải được thành blob (chắc chắn ra file), false nếu phải fallback.
 */
export async function downloadImage(url, filename) {
  if (!url) return false;
  const ext = (url.match(/\.(png|jpe?g|webp|gif|svg)(?:\?|#|$)/i)?.[1] || 'png').toLowerCase();
  const name = /\.[a-z0-9]+$/i.test(filename) ? filename : `${filename}.${ext}`;

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    clickDownload(objectUrl, name);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return true;
  } catch {
    clickDownload(url, name);
    return false;
  }
}
