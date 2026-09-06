/* ======================== ẢNH RESPONSIVE / TỐI ƯU =========================
   Ảnh khách tự tải lên có khổ tới 1600px, nhưng khung hiển thị thật chỉ
   88–320px (ảnh người, ảnh album, thumbnail). Nạp bản 1600px vào khung 88px
   là tải thừa ~300 lần số pixel. Ở đây ta sinh `srcset` trỏ sang API tối ưu
   ảnh của Vercel (`/_vercel/image`) để mỗi khung chỉ tải đúng khổ nó cần,
   ở định dạng AVIF/WebP do trình duyệt tự chọn.

   Danh sách khổ và mức chất lượng phải TRÙNG với `images` trong vercel.json —
   API trả lỗi nếu `w` hoặc `q` không nằm trong danh sách đã khai.           */

const WIDTHS = [128, 320, 480, 640, 960, 1280, 1600];
const QUALITY = 75;

/* Chỉ Vercel mới có `/_vercel/image`. Khi chạy máy cá nhân (vite dev, hoặc
   `node server/index.js`) đường dẫn đó không tồn tại nên phải trả ảnh gốc —
   biến này do vite.config.js đặt theo env VERCEL lúc build. */
const HAS_OPTIMIZER = typeof __IMG_OPT__ !== 'undefined' && __IMG_OPT__;

// Ảnh tải lên trên Vercel nằm ở Cloudflare R2, host lấy từ R2_PUBLIC_HOST lúc
// build (xem vite.config.js). Trùng với `remotePatterns` trong vercel.json.
const R2_HOST = typeof __R2_PUBLIC_HOST__ !== 'undefined' ? __R2_PUBLIC_HOST__ : '';

/** Ảnh này có được API tối ưu nhận không? Không thì dùng nguyên URL gốc. */
function optimizable(url) {
  // Không có `/_vercel/image` thì mọi ảnh đều phải dùng URL gốc — kể cả ảnh
  // trên R2, vì chạy máy cá nhân vẫn có thể trỏ vào R2 thật.
  if (!HAS_OPTIMIZER) return false;

  if (!url || typeof url !== 'string') return false;
  if (/^(data:|blob:)/i.test(url)) return false;
  if (/\.svg(\?|#|$)/i.test(url)) return false; // dangerouslyAllowSVG: false

  if (/^https?:\/\//i.test(url)) {
    if (!R2_HOST) return false;
    try {
      return new URL(url).hostname.toLowerCase() === R2_HOST.toLowerCase();
    } catch {
      return false;
    }
  }

  // Ảnh nội bộ (/figma/…, /uploads/…) khớp `localPatterns`.
  return url.startsWith('/');
}

/** Khổ nhỏ nhất trong danh sách mà vẫn đủ phủ `target`. */
const snap = (target) => WIDTHS.find((w) => w >= target) || WIDTHS[WIDTHS.length - 1];

/* ---------------- Khung bị cắt bởi `object-fit: cover` --------------------
   Trong khung `cover`, BỀ RỘNG khung không quyết định độ nét. Ảnh ngang phải
   phóng cho khớp CHIỀU CAO khung rồi bị cắt bớt hai bên: khung album 319x478
   mà ảnh nguồn là 3:2 ngang thì cần tới 478 × 1,5 = 717px bề rộng nguồn mới
   nét — gấp 2,2 lần bề rộng khung.

   `sizes` là con số duy nhất trình duyệt dùng để chọn ảnh trong srcset, và nó
   không biết gì về việc cắt. Nên phải khai theo khổ CẦN THẬT, không theo bề
   rộng khung. Ảnh cưới ngang gần như luôn 3:2; ảnh dọc cần ít hơn nên lấy 3:2
   làm trường hợp xấu nhất là đủ.

   Khung `object-fit: contain` hoặc khung không cắt thì dùng thẳng bề rộng. */

const WIDEST_SOURCE = 1.5; // 3:2

export const coverWidth = (boxW, boxH) => Math.round(Math.max(boxW, boxH * WIDEST_SOURCE));

/** Bộ khổ cho một khung rộng `cssWidth`: đủ cho màn 1x và 2x (3x dùng lại 2x). */
function widthsFor(cssWidth) {
  const set = new Set([snap(cssWidth), snap(cssWidth * 2)]);
  return [...set].sort((a, b) => a - b);
}

/** URL một khổ cụ thể. */
export function imgUrl(url, cssWidth, quality = QUALITY) {
  if (!optimizable(url)) return url;
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${snap(cssWidth)}&q=${quality}`;
}

/**
 * Thuộc tính rải thẳng vào <img>: `{...imgProps(photo.url, 320)}`.
 *
 * `sizes` mặc định là `${cssWidth}px` — đúng với hầu hết khung ở đây vì chúng
 * có bề rộng cố định. Khung co giãn theo viewport (lightbox, ảnh tràn màn)
 * thì truyền `sizes` cùng `widths` để tự chọn bộ khổ.
 */
export function imgProps(url, cssWidth, { sizes, widths, quality = QUALITY } = {}) {
  if (!optimizable(url)) return { src: url };

  const list = widths ? [...new Set(widths.map(snap))].sort((a, b) => a - b) : widthsFor(cssWidth);
  return {
    src: imgUrl(url, list[list.length - 1], quality),
    srcSet: list.map((w) => `${imgUrl(url, w, quality)} ${w}w`).join(', '),
    sizes: sizes || `${cssWidth}px`
  };
}

/**
 * Nạp trước một ảnh vào cache trình duyệt, không gắn vào DOM.
 * Dùng cho ảnh kế tiếp trong lightbox: khách bấm ‹ › là hiện ngay.
 */
export function prefetchImg(url, cssWidth, quality = QUALITY) {
  if (!url) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = imgUrl(url, cssWidth, quality);
}

/* Ảnh nền bìa là ảnh LCP của cả trang, nhưng nó nằm trong `background-image`
   nên CSS không dùng được srcset. Vì vậy chốt một khổ duy nhất cho mọi máy:
   1280px phủ đủ điện thoại (390px × DPR 3 = 1170) lẫn laptop, và vì URL không
   phụ thuộc viewport nên máy chủ chèn được <link rel="preload"> khớp chính xác
   vào HTML (shareMeta.js) — nếu preload lệch URL thì ảnh bị tải hai lần. */
export const COVER_BG_WIDTH = 1280;
export const coverBgUrl = (url) => imgUrl(url, COVER_BG_WIDTH);
