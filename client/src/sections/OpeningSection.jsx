import Reveal from '../components/Reveal.jsx';
import { coverWidth, imgProps } from '../img.js';

/* Ảnh trong phong thư: khung 269x376 trừ 7px viền trắng mỗi bên -> 255x362, và
   `object-fit: cover` nên khổ tính theo chiều cao (xem coverWidth). Cả phong
   thư co theo --env trên mobile: 0,72 ở ≤720px và 0,58 ở ≤420px. */
const ENV_WIDE = coverWidth(255, 362);
const ENV_SIZES = [
  `(max-width: 420px) ${Math.round(ENV_WIDE * 0.58)}px`,
  `(max-width: 720px) ${Math.round(ENV_WIDE * 0.72)}px`,
  `${ENV_WIDE}px`
].join(', ');

/**
 * Phần mở đầu — Figma node 1:46 "Header":
 * chữ "SAVE THE DATE", phong thư đỏ có ảnh cưới nhô ra + nhánh hoa,
 * tên đôi Viaoda Libre 58 với chữ "&" The Nautigal 120 mờ phía sau.
 */
export default function OpeningSection({ data }) {
  return (
    <section className="block block-opening" id={data.id}>
      <img className="deco-castle is-hero" src="/figma/castle.webp" alt="" aria-hidden="true" />

      {data.kicker && (
        <Reveal anim="fade" as="p" className="opening-kicker" duration={1100}>
          {data.kicker}
        </Reveal>
      )}

      <Reveal anim="zoom" delay={120} className="envelope-wrap" duration={1200}>
        <div className="envelope">
          <img className="envelope-back" src="/figma/envelope-back.webp" alt="" aria-hidden="true" />

          <div className="envelope-photo" style={{ transform: `rotate(${data.imageTilt ?? 7}deg)` }}>
            {/* Nằm ngay đầu trang nên để tải sớm, chỉ hạ khổ chứ không hoãn. */}
            {data.image ? (
              <img
                {...imgProps(data.image, ENV_WIDE, { sizes: ENV_SIZES })}
                alt="Ảnh cưới"
                decoding="async"
                fetchpriority="high"
              />
            ) : (
              <span className="envelope-photo-empty" aria-hidden="true">❦</span>
            )}
          </div>

          <img className="envelope-flower" src="/figma/flower.webp" alt="" aria-hidden="true" />
          <img className="envelope-front" src="/figma/envelope-front.webp" alt="" aria-hidden="true" />
        </div>
      </Reveal>

      <Reveal anim="up" delay={300} as="h1" className="opening-names">
        <span className="opening-amp" aria-hidden="true">&amp;</span>
        <span>{data.nameLine1}</span>
        <span>{data.nameLine2}</span>
      </Reveal>
    </section>
  );
}
