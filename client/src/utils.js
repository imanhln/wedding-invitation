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

export function splitDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    weekday: WEEKDAYS[d.getDay()],
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
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

/** Lấy tên khách mời từ query: ?to=Nguyễn Văn A */
export function guestFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return p.get('to') || p.get('guest') || '';
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

/**
 * Phân loại link nhạc.
 * -> { type: 'youtube', id } | { type: 'file', url } | { type: 'page', url } | null
 */
export function parseMusicSource(raw) {
  const url = (raw || '').trim();
  if (!url) return null;

  const id = youtubeId(url);
  if (id) return { type: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` };

  // File tự tải lên (/uploads/...) hoặc link có đuôi file nhạc
  if (url.startsWith('/') || url.startsWith('data:audio') || url.startsWith('blob:')) {
    return { type: 'file', url };
  }
  if (AUDIO_EXT.test(url)) return { type: 'file', url };

  if (MUSIC_PAGE_HOSTS.some((h) => url.includes(h))) return { type: 'page', url };

  // Link lạ: vẫn thử phát như file, nhưng đánh dấu để trang quản trị cảnh báo
  return { type: 'file', url, uncertain: true };
}
