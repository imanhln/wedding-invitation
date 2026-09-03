import { useEffect, useState } from 'react';
import BlockTitle from '../components/BlockTitle.jsx';
import Reveal from '../components/Reveal.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { coverWidth, imgProps } from '../img.js';

/** Khách bật "giảm chuyển động" trong hệ điều hành thì album không tự chạy. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

/**
 * Khoảng cách vòng tròn: 0 = ảnh giữa, ±1 / ±2 = hai bên nghiêng dần.
 *
 * Ngoài ±2 phải tách rõ TRÁI ('far-l') hay PHẢI ('far-r') chứ không gộp chung
 * một tư thế: có tách thì ảnh rời vòng mới trôi tiếp ra đúng bên nó đang đi,
 * thay vì bị kéo ngược vào giữa khung rồi mờ đi ngay trước mặt khách.
 */
function positionOf(i, active, total) {
  let diff = i - active;
  if (total > 4) {
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
  }
  if (diff > 2) return 'far-r';
  if (diff < -2) return 'far-l';
  return String(diff);
}

/* --------------------------- Chỉ nạp ảnh đang thấy -------------------------
   Mọi .cf-item đều `position: absolute` chồng lên nhau trong cùng một khung,
   ảnh xa chỉ bị `opacity: 0` nên VẪN nằm trong viewport. `loading="lazy"` vì
   thế chỉ hoãn được tới lúc khách cuộn tới album, rồi cả 20-30 ảnh cùng tải
   một lượt. Nên phải tự chặn: chỉ gán `src` cho 5 ảnh CSS thật sự vẽ (±2).

   Ảnh nào đã từng được gán src thì giữ lại trong `ready` — bỏ src ra sẽ khiến
   ảnh trắng một nhịp và có thể tải lại khi khách lật vòng về.               */

const NEAR = 2;

function nearIndices(active, total) {
  const out = [];
  for (let d = -NEAR; d <= NEAR; d += 1) out.push(((active + d) % total + total) % total);
  return out;
}

/* ------------------------------ Khổ ảnh album ------------------------------
   `.cf-item img` là `object-fit: cover`, nên khổ cần tính theo CHIỀU CAO khung
   chứ không theo bề rộng — xem coverWidth() trong img.js. Ba khung theo
   breakpoint của invitation.css: 319x478, rồi 240x360 (≤720px), 200x300 (≤420px).

   Trần 1280px: màn desktop 2x về lý thuyết cần 717 × 2 = 1434, nhưng phóng
   1,12 lần trên màn mật độ kép thì mắt không thấy, mà đổi lại tiết kiệm được
   một nửa dung lượng so với gọi bản 1600. */
const CF_WIDE = coverWidth(319, 478); // 717px — khung lớn nhất, trên desktop

const CF_SIZES = [
  `(max-width: 420px) ${coverWidth(200, 300)}px`,
  `(max-width: 720px) ${coverWidth(240, 360)}px`,
  `${CF_WIDE}px`
].join(', ');

const CF_WIDTHS = [480, 640, 960, 1280];

/**
 * Album ảnh — Figma: coverflow 3D, ảnh giữa 319x478 bo góc 16,
 * hai bên xoay theo trục Y và nhỏ dần, có nút ‹ › và dãy dot bên dưới.
 */
export default function GallerySection({ data }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(-1);
  const [hovering, setHovering] = useState(false);
  const photos = (data.photos || []).filter((p) => p.url);
  const total = photos.length;

  /* --------------------------- Tự động chạy album -------------------------
     Dừng khi khách đang rê chuột lên album hoặc đang xem ảnh phóng to, và
     đếm lại từ đầu mỗi lần khách tự bấm chuyển ảnh (`active` nằm trong deps). */
  const reducedMotion = usePrefersReducedMotion();
  const autoDelay = Math.max(1.5, Number(data.autoPlayDelay) || 4) * 1000;
  const autoPlay =
    data.autoPlay !== false && total > 1 && lightbox < 0 && !hovering && !reducedMotion;

  useEffect(() => {
    if (!autoPlay) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % total), autoDelay);
    return () => clearInterval(id);
  }, [autoPlay, autoDelay, total, active]);

  /* Tập ảnh đã được phép tải, lớn dần theo lượt lật của khách. Khởi tạo sẵn
     quanh ảnh đầu để lần vẽ đầu tiên không ra khung album trống. */
  const [ready, setReady] = useState(() => new Set(total ? nearIndices(0, total) : []));

  useEffect(() => {
    if (!total) return;
    setReady((prev) => {
      const near = nearIndices(active, total);
      if (near.every((i) => prev.has(i))) return prev;
      return new Set([...prev, ...near]);
    });
  }, [active, total]);

  if (!total) return null;

  const go = (dir) => setActive((a) => (a + dir + total) % total);

  return (
    <section className="block block-gallery" id={data.id}>
      <img className="deco-castle is-album" src="/figma/castle.webp" alt="" aria-hidden="true" />

      <BlockTitle title={data.title} subtitle={data.subtitle} />

      {/* Hai nút ‹ › phải nằm NGOÀI .coverflow — xem ghi chú ở .coverflow-wrap
          trong invitation.css: trong 3D context, ảnh xoay chồi về phía người
          xem và vẽ lên trên nút bất kể z-index. */}
      <Reveal
        anim="zoom"
        className="coverflow-wrap"
        duration={1100}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setHovering(true)}
        onBlurCapture={() => setHovering(false)}
      >
        <div className="coverflow">
          {photos.map((photo, i) => {
            const pos = positionOf(i, active, total);
            return (
              <button
                type="button"
                className="cf-item"
                data-pos={pos}
                key={photo.id || i}
                tabIndex={pos === '0' ? 0 : -1}
                aria-hidden={pos !== '0'}
                onClick={() => (pos === '0' ? setLightbox(i) : setActive(i))}
              >
                {/* `loading="lazy"` vẫn giữ để album ở dưới màn hình không tải
                    sớm; `ready` mới là thứ chặn tải cùng lúc cả album. */}
                {ready.has(i) && (
                  <img
                    {...imgProps(photo.url, CF_WIDE, { widths: CF_WIDTHS, sizes: CF_SIZES })}
                    alt={photo.caption || `Ảnh cưới ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    fetchpriority={pos === '0' ? 'high' : 'low'}
                  />
                )}
              </button>
            );
          })}
        </div>

        {total > 1 && (
          <>
            <button type="button" className="cf-nav prev" onClick={() => go(-1)} aria-label="Ảnh trước">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                {/* x chạy 5,5 -> 10,5 để nét mũi tên đối xứng quanh tâm 8 */}
                <path d="M10.5 3 5.5 8l5 5" />
              </svg>
            </button>
            <button type="button" className="cf-nav next" onClick={() => go(1)} aria-label="Ảnh sau">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5.5 3l5 5-5 5" />
              </svg>
            </button>
          </>
        )}
      </Reveal>

      {total > 1 && (
        <div className="cf-dots">
          {photos.map((photo, i) => (
            <button
              type="button"
              key={photo.id || i}
              className={i === active ? 'is-active' : ''}
              onClick={() => setActive(i)}
              aria-label={`Ảnh ${i + 1}`}
            />
          ))}
        </div>
      )}

      <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(-1)} />
    </section>
  );
}
