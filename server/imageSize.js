// Đọc kích thước ảnh từ vài KB đầu của file.
//
// Facebook tự tải ảnh về đo lấy nên thiếu og:image:width/height vẫn hiện. Zalo
// thì đọc đúng hai thẻ đó để quyết định vẽ khung ảnh lớn hay bỏ qua ảnh, nên
// phải khai sẵn. Ảnh do người dùng tải lên (kích thước tuỳ ảnh) nên chỉ còn cách
// tự đo.

// Cache theo URL, giữ trong bộ nhớ của function. Cache cả kết quả null để một
// ảnh không đọc được không bị thử lại ở mọi request.
const cache = new Map();

export async function imageSize(url) {
  if (!url || !/^https?:/.test(url)) return null;
  if (cache.has(url)) return cache.get(url);
  const size = await read(url).catch(() => null);
  cache.set(url, size);
  return size;
}

async function read(url) {
  // Chỉ xin phần đầu file; server nào bỏ qua Range thì trả cả file cũng không
  // sao, ta vẫn chỉ đọc phần đầu. Hết 2,5s thì bỏ — thà thiếu thẻ kích thước
  // còn hơn để crawler chờ HTML.
  const res = await fetch(url, {
    headers: { range: 'bytes=0-65535' },
    signal: AbortSignal.timeout(2500)
  });
  if (!res.ok) return null;
  return parse(Buffer.from(await res.arrayBuffer()));
}

function parse(b) {
  if (b.length < 16) return null;

  // PNG: kích thước nằm trong chunk IHDR ngay sau 8 byte chữ ký.
  if (b.readUInt32BE(0) === 0x89504e47) {
    return ok(b.readUInt32BE(16), b.readUInt32BE(20));
  }

  // GIF: little-endian, ngay sau "GIF87a"/"GIF89a".
  if (b.toString('latin1', 0, 3) === 'GIF') {
    return ok(b.readUInt16LE(6), b.readUInt16LE(8));
  }

  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    return webp(b);
  }

  if (b[0] === 0xff && b[1] === 0xd8) return jpeg(b);

  return null;
}

// JPEG không có header cố định: phải lần theo chuỗi marker tới khối SOF (khối
// mô tả khung ảnh) mới đọc được kích thước.
function jpeg(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];

    // 0xFF lặp lại chỉ là byte đệm; 0x01 và 0xD0-0xD7 là marker không có thân.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += marker === 0xff ? 1 : 2;
      continue;
    }

    // SOF0-SOF15 trừ 0xC4 (bảng Huffman), 0xC8 (JPG), 0xCC (bảng số học) —
    // ba khối này dùng chung dải marker nhưng không mô tả khung ảnh.
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return ok(b.readUInt16BE(i + 7), b.readUInt16BE(i + 5));

    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function webp(b) {
  const chunk = b.toString('latin1', 12, 16);

  // WebP thường: 14 bit mỗi chiều.
  if (chunk === 'VP8 ' && b.length > 29) {
    return ok(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
  }

  // WebP không mất dữ liệu: 14 bit mỗi chiều, nhồi bit nên phải dịch tay.
  if (chunk === 'VP8L' && b.length > 25) {
    const bits = b.readUInt32LE(21);
    return ok((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }

  // WebP mở rộng (ảnh động, có alpha...): 24 bit mỗi chiều, lưu giá trị trừ 1.
  if (chunk === 'VP8X' && b.length > 30) {
    return ok(b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1);
  }

  return null;
}

const ok = (width, height) => (width > 0 && height > 0 ? { width, height } : null);
