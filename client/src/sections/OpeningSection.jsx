import Reveal from '../components/Reveal.jsx';

/**
 * Phần mở đầu — Figma node 1:46 "Header":
 * chữ "SAVE THE DATE", phong thư đỏ có ảnh cưới nhô ra + nhánh hoa,
 * tên đôi Viaoda Libre 58 với chữ "&" The Nautigal 120 mờ phía sau.
 */
export default function OpeningSection({ data }) {
  return (
    <section className="block block-opening" id={data.id}>
      <img className="deco-castle is-hero" src="/figma/castle.png" alt="" aria-hidden="true" />

      {data.kicker && (
        <Reveal anim="fade" as="p" className="opening-kicker" duration={1100}>
          {data.kicker}
        </Reveal>
      )}

      <Reveal anim="zoom" delay={120} className="envelope-wrap" duration={1200}>
        <div className="envelope">
          <img className="envelope-back" src="/figma/envelope-back.png" alt="" aria-hidden="true" />

          <div className="envelope-photo" style={{ transform: `rotate(${data.imageTilt ?? 7}deg)` }}>
            {data.image ? (
              <img src={data.image} alt="Ảnh cưới" />
            ) : (
              <span className="envelope-photo-empty" aria-hidden="true">❦</span>
            )}
          </div>

          <img className="envelope-flower" src="/figma/flower.png" alt="" aria-hidden="true" />
          <img className="envelope-front" src="/figma/envelope-front.png" alt="" aria-hidden="true" />
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
