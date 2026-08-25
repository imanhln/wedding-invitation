import Reveal from '../components/Reveal.jsx';
import { toEmbedUrl, toDirectionUrl } from '../utils.js';

/**
 * Bản đồ — Figma node 1:183: dòng "TIỆC CƯỚI SẼ TỔ CHỨC TẠI",
 * địa chỉ, rồi khung bản đồ 560x380 bo góc 15.
 */
export default function MapSection({ data }) {
  const embed = toEmbedUrl(data.embedUrl, data.address);
  const direction = toDirectionUrl(data.directionUrl, data.address);

  return (
    <section className="block block-map" id={data.id}>
      <img className="deco-castle is-map" src="/figma/castle.png" alt="" aria-hidden="true" />

      <Reveal anim="fade" className="map-place">
        {data.title && <p className="map-name">{data.title}</p>}
        {data.address && <p className="map-address">{data.address}</p>}
      </Reveal>

      <Reveal anim="up" delay={140} className="map-wrap">
        {embed ? (
          <iframe
            title={data.placeName || 'Bản đồ'}
            src={embed}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <p className="map-empty">Thêm link Google Maps trong trang quản trị để hiển thị bản đồ.</p>
        )}
      </Reveal>

      {direction && data.showDirection !== false && (
        <Reveal anim="up" delay={200} className="map-actions">
          <a className="pill-btn is-sm" href={direction} target="_blank" rel="noreferrer">Mở chỉ đường</a>
        </Reveal>
      )}
    </section>
  );
}
