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
 * Chuyển toạ độ / link Google Maps bất kỳ / địa chỉ thành link nhúng iframe.
 */
export function toEmbedUrl(embedUrl, address) {
  const raw = (embedUrl || '').trim();

  // Toạ độ dán trực tiếp: zoom sâu hơn vì đã biết đúng điểm cần ghim
  const coords = parseCoords(raw);
  if (coords) return `https://maps.google.com/maps?q=${coords}&z=17&output=embed`;

  if (raw) {
    // Người dùng dán nguyên thẻ <iframe src="...">
    const fromIframe = raw.match(/src=["']([^"']+)["']/i);
    const url = fromIframe ? fromIframe[1] : raw;
    if (/\/maps\/embed/.test(url)) return url;
    if (/^https?:\/\//i.test(url)) return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }
  if (address) return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`;
  return '';
}

export function toDirectionUrl(directionUrl, address) {
  const coords = parseCoords(directionUrl);
  if (coords) return `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
  if (directionUrl) return directionUrl;
  if (address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  return '';
}

/** Link thêm sự kiện vào Google Calendar. */
export function googleCalendarUrl({ title, date, time = '10:00', address = '', details = '' }) {
  const start = new Date(`${date}T${time.length === 5 ? time : '10:00'}:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + 3 * 3600 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: address,
    details
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Tải file .ics để thêm vào lịch điện thoại. */
export function downloadIcs({ title, date, time = '10:00', address = '', details = '' }) {
  const start = new Date(`${date}T${time.length === 5 ? time : '10:00'}:00`);
  if (Number.isNaN(start.getTime())) return;
  const end = new Date(start.getTime() + 3 * 3600 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${address}`,
    `DESCRIPTION:${details}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wedding.ics';
  a.click();
  URL.revokeObjectURL(a.href);
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
