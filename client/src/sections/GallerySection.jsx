import { useState } from 'react';
import BlockTitle from '../components/BlockTitle.jsx';
import Reveal from '../components/Reveal.jsx';
import Lightbox from '../components/Lightbox.jsx';

/** Khoảng cách vòng tròn: 0 = ảnh giữa, ±1 / ±2 = hai bên nghiêng dần. */
function positionOf(i, active, total) {
  let diff = i - active;
  if (total > 4) {
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
  }
  return Math.abs(diff) > 2 ? 'far' : String(diff);
}

/**
 * Album ảnh — Figma: coverflow 3D, ảnh giữa 319x478 bo góc 16,
 * hai bên xoay theo trục Y và nhỏ dần, có nút ‹ › và dãy dot bên dưới.
 */
export default function GallerySection({ data }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(-1);
  const photos = (data.photos || []).filter((p) => p.url);

  if (!photos.length) return null;

  const go = (dir) => setActive((a) => (a + dir + photos.length) % photos.length);

  return (
    <section className="block block-gallery" id={data.id}>
      <img className="deco-castle is-album" src="/figma/castle.png" alt="" aria-hidden="true" />

      <BlockTitle title={data.title} subtitle={data.subtitle} />

      <Reveal anim="zoom" className="coverflow" duration={1100}>
        {photos.map((photo, i) => {
          const pos = positionOf(i, active, photos.length);
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
              <img src={photo.url} alt={photo.caption || `Ảnh cưới ${i + 1}`} loading="lazy" />
            </button>
          );
        })}

        {photos.length > 1 && (
          <>
            <button type="button" className="cf-nav prev" onClick={() => go(-1)} aria-label="Ảnh trước">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M10 3 5 8l5 5" />
              </svg>
            </button>
            <button type="button" className="cf-nav next" onClick={() => go(1)} aria-label="Ảnh sau">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </>
        )}
      </Reveal>

      {photos.length > 1 && (
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
