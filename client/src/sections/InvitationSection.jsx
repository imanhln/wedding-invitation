import Reveal from '../components/Reveal.jsx';
import { guestFromUrl, splitDate } from '../utils.js';

/**
 * Thiệp mời — Figma node 1:57 (panel đỏ 560x848):
 * tiêu đề, hai cột ông bà ngăn bởi vạch dọc, dòng báo tin,
 * tên cô dâu chú rể (EB Garamond 36), nơi cử hành,
 * giờ + thứ, rồi "20 | THÁNG 09 / 2026" và dòng âm lịch.
 */
export default function InvitationSection({ data, content }) {
  const guest = guestFromUrl();
  const { groom, bride } = content.couple;
  const parts = splitDate(data.eventDate);

  // "Tư gia" + "nhà trai" -> "Tư gia nhà trai" (bỏ trống bên nào thì mất bên đó)
  const venuePlace = [data.venuePlace, data.venueSide].filter(Boolean).join(' ').trim();

  return (
    <section className="block block-invitation" id={data.id}>
      <Reveal anim="up" className="panel" duration={1000}>
        {data.panelTitle && <p className="panel-title">{data.panelTitle}</p>}

        {data.showFamily && (
          <div className="panel-families">
            <div>
              <span className="panel-side">{data.groomSideLabel}</span>
              <b>{groom.father}</b>
              <b>{groom.mother}</b>
              {groom.address && <em>{groom.address}</em>}
            </div>
            <span className="panel-divider" aria-hidden="true" />
            <div>
              <span className="panel-side">{data.brideSideLabel}</span>
              <b>{bride.father}</b>
              <b>{bride.mother}</b>
              {bride.address && <em>{bride.address}</em>}
            </div>
          </div>
        )}

        {data.middleNote && <p className="panel-note">{data.middleNote}</p>}

        {/* Figma 17:10 — bản mới dùng tên gọi ngắn, Playfair Display 48,
            không còn họ tên đầy đủ EB Garamond 36 của bản cũ. */}
        <div className="panel-couple">
          <p className="panel-name">{groom.shortName || groom.name}</p>
          <span className="panel-amp">&amp;</span>
          <p className="panel-name">{bride.shortName || bride.name}</p>
        </div>

        {/* Figma 17:16 — vạch 75x2 · ❦ 27 · vạch 75x2 */}
        <div className="panel-rule" aria-hidden="true">
          <span />
          <em>{content.cover?.seal || '❦'}</em>
          <span />
        </div>

        {/* "Lễ thành hôn được cử hành tại" / "Tư gia nhà trai" / địa chỉ —
            cả ba dòng đều sửa được trong trang quản trị. */}
        {(data.venueLine || venuePlace) && (
          <p className="panel-venue">
            {data.venueLine}
            {data.venueLine && venuePlace && <br />}
            {venuePlace}
          </p>
        )}

        {data.addressLine && <p className="panel-venue-address">{data.addressLine}</p>}

        {(data.eventTime || parts) && (
          <div className="panel-timerow">
            {data.eventTime && <span>Vào lúc {data.eventTime}</span>}
            {/* Figma 17:18 — ngôi sao 10px ngăn giữa giờ và thứ */}
            {data.eventTime && parts && <i className="panel-star" aria-hidden="true" />}
            {parts && <span>{parts.weekday}</span>}
          </div>
        )}

        {parts && (
          <div className="panel-daterow">
            <span className="dr-day">{parts.day}</span>
            <span className="dr-sep" aria-hidden="true" />
            <span className="dr-my">
              Tháng {parts.month}
              <br />
              {parts.year}
            </span>
          </div>
        )}

        {data.lunarLine && <p className="panel-lunar">{data.lunarLine}</p>}

        {guest && (
          <p className="panel-guest">Kính mời: <b>{guest}</b></p>
        )}

        <img className="deco-flower is-right" src="/figma/flower.png" alt="" aria-hidden="true" />
      </Reveal>

      {data.footNote && (
        <Reveal anim="fade" delay={200} as="p" className="block-footnote">
          {data.footNote}
        </Reveal>
      )}
    </section>
  );
}
