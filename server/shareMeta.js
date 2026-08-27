// Thẻ meta cho link chia sẻ (Zalo, Facebook, Messenger, Telegram...).
//
// Trình thu thập (crawler) của các nền tảng này KHÔNG chạy JavaScript: nó chỉ
// tải HTML thô rồi đọc <title> và các thẻ og:*. Trước đây thiệp chỉ đặt các thẻ
// đó bằng JS sau khi tải /api/content (applyMeta trong InvitationPage.jsx), nên
// crawler chỉ thấy file index.html trống -> không hiện tiêu đề, mô tả, ảnh.
// Vì vậy HTML phải được chèn sẵn thẻ meta ngay từ phía máy chủ.

import { imageSize } from './imageSize.js';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif'
};

// Ảnh tải lên khi chạy máy cá nhân có URL dạng /uploads/... (tương đối), còn
// trên Vercel Blob thì đã là URL tuyệt đối. og:image bắt buộc phải tuyệt đối.
const abs = (url, base) => {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
};

// Chưa chọn "Ảnh chia sẻ" trong trang quản trị thì lấy tạm ảnh có sẵn của thiệp
// — thà lấy ảnh cưới còn hơn để link trống trơn.
function pickImage(content) {
  const gallery = (content.sections || []).find((s) => s.type === 'gallery');
  return (
    content.meta?.ogImage ||
    content.cover?.photo ||
    content.cover?.backgroundImage ||
    gallery?.photos?.find((p) => p.url)?.url ||
    '/figma/demo-cover.jpg'
  );
}

export function shareMeta(content = {}, base = '', pageUrl = '') {
  const meta = content.meta || {};
  const cover = content.cover || {};
  const names = [cover.groomName, cover.brideName].filter(Boolean).join(' & ');
  const image = abs(pickImage(content), base);
  return {
    title: meta.title || (names ? `Thiệp cưới ${names}` : 'Thiệp cưới'),
    description: meta.description || cover.dateText || '',
    image,
    imageType: MIME[(image.split('?')[0].split('.').pop() || '').toLowerCase()] || '',
    favicon: abs(meta.favicon, base),
    url: pageUrl || base,
    siteName: names ? `Thiệp cưới ${names}` : 'Thiệp cưới'
  };
}

/** Chuỗi thẻ <title> + og:* + twitter:* để nhét vào <head>. */
export async function metaTags(content, base, pageUrl) {
  const m = shareMeta(content, base, pageUrl);
  const size = await imageSize(m.image);
  const tag = (attr, key, value) =>
    value ? `    <meta ${attr}="${key}" content="${esc(value)}" />` : '';

  return [
    `    <title>${esc(m.title)}</title>`,
    tag('name', 'description', m.description),
    tag('property', 'og:type', 'website'),
    tag('property', 'og:site_name', m.siteName),
    tag('property', 'og:locale', 'vi_VN'),
    tag('property', 'og:url', m.url),
    tag('property', 'og:title', m.title),
    tag('property', 'og:description', m.description),
    tag('property', 'og:image', m.image),
    // Zalo và Facebook đều ưu tiên bản https; ảnh của ta luôn là https nên
    // khai luôn secure_url cho chắc.
    m.image.startsWith('https:') ? tag('property', 'og:image:secure_url', m.image) : '',
    tag('property', 'og:image:type', m.imageType),
    // Zalo chỉ vẽ khung ảnh lớn khi biết trước kích thước — xem imageSize.js.
    tag('property', 'og:image:width', size?.width),
    tag('property', 'og:image:height', size?.height),
    tag('property', 'og:image:alt', m.title),
    tag('name', 'twitter:card', 'summary_large_image'),
    tag('name', 'twitter:title', m.title),
    tag('name', 'twitter:description', m.description),
    tag('name', 'twitter:image', m.image),
    m.favicon ? `    <link rel="icon" href="${esc(m.favicon)}" />` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

/** Chèn thẻ meta vào index.html đã build (bỏ <title> mặc định của file đó). */
export async function injectMeta(html, content, base, pageUrl) {
  const tags = await metaTags(content, base, pageUrl);
  const stripped = html.replace(/[ \t]*<title>[\s\S]*?<\/title>\r?\n?/i, '');
  return stripped.includes('</head>')
    ? stripped.replace('</head>', `${tags}\n  </head>`)
    : `${tags}\n${stripped}`;
}

/** Phao cứu sinh: không đọc được index.html thì vẫn trả thẻ meta cho crawler,
 *  còn người thật được chuyển sang /index.html (file tĩnh, không qua hàm này). */
export async function fallbackHtml(content, base, pageUrl, search = '') {
  const target = `/index.html${search}`;
  const tags = await metaTags(content, base, pageUrl);
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${tags}
    <script>location.replace(${JSON.stringify(target)});</script>
  </head>
  <body>
    <p><a href="${esc(target)}">Mở thiệp cưới</a></p>
  </body>
</html>
`;
}
