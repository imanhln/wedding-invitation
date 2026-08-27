import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Reveal from '../components/Reveal.jsx';
import RsvpForm from '../components/RsvpForm.jsx';
import { useCountdown } from '../hooks/useReveal.js';
import { splitDate, toMapUrl } from '../utils.js';

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const UNITS = [['days', 'Ngày'], ['hours', 'Giờ'], ['minutes', 'Phút'], ['seconds', 'Giây']];

/** Lưới ngày của tháng, tuần bắt đầu từ Thứ Hai (như Figma: T2 → CN). */
function buildMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return { year, month, cells };
}

/**
 * Thông tin tiệc cưới — Figma node 1:115 (panel đỏ 560x875):
 * tiêu đề, dòng dẫn, thứ + giờ, "19 | THÁNG 09 / 2026", âm lịch,
 * hai mốc đón khách / khai tiệc, lịch tháng nền kem có trái tim
 * đánh dấu ngày cưới, cuối cùng là nút "Mở bản đồ" (mở Google Maps ở tab mới,
 * thay cho link "Thêm vào lịch" của bản cũ) và nút "Xác nhận tham dự" mở modal
 * chứa form RSVP.
 */
export default function CalendarSection({ data, content }) {
  const parts = splitDate(data.targetDate);
  const time = useCountdown(data.targetDate);
  const [rsvpOpen, setRsvpOpen] = useState(false);

  // Nút + modal xác nhận tham dự: cấu hình ở section 'rsvp' (một dòng riêng trong trang quản trị)
  const rsvp = (content.sections || []).find((s) => s.type === 'rsvp');
  const showRsvp = !!rsvp && rsvp.enabled !== false;

  // Nút "Mở bản đồ": cấu hình ở section 'map' — bản đồ không còn nhúng trong trang
  const map = (content.sections || []).find((s) => s.type === 'map');
  const mapUrl = map && map.enabled !== false ? toMapUrl(map.mapUrl, map.address) : '';

  useEffect(() => {
    if (!rsvpOpen) return;
    const onKey = (e) => e.key === 'Escape' && setRsvpOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [rsvpOpen]);

  // Lịch tháng có thể đánh dấu ngày khác ngày tiệc (Figma: tiệc 19, cưới 20)
  const marked = new Date(data.markDate || data.targetDate);
  const markValid = !Number.isNaN(marked.getTime());
  const { cells, month, year } = markValid ? buildMonth(marked) : { cells: [], month: 0, year: 0 };

  const timeOnly = (data.targetDate || '').slice(11, 16) || '11:00';

  return (
    <section className="block block-calendar" id={data.id}>
      <Reveal anim="up" className="panel" duration={1000}>
        {data.panelTitle && <p className="panel-title">{data.panelTitle}</p>}
        {data.script && <p className="panel-script">{data.script}</p>}

        {parts && (
          <div className="panel-timerow">
            <span>{parts.weekday}</span>
            {/* Figma 17:21 — ngôi sao 9px ngăn giữa thứ và giờ */}
            <i className="panel-star" aria-hidden="true" />
            <span>{timeOnly}</span>
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

        {data.lunarText && <p className="panel-lunar">{data.lunarText}</p>}

        {(data.reception || []).length > 0 && (
          <div className="panel-reception">
            {data.reception.map((item, i) => (
              <div className="pr-item" key={item.id || i}>
                <span className="pr-label">{item.label}</span>
                <span className="pr-time">{item.time}</span>
              </div>
            ))}
          </div>
        )}

        {data.showCountdown && time && (
          <div className="panel-countdown">
            {UNITS.map(([key, label]) => (
              <div className="pc-item" key={key}>
                <span className="pc-value">{String(time[key]).padStart(2, '0')}</span>
                <span className="pc-label">{label}</span>
              </div>
            ))}
          </div>
        )}

        {data.showCalendar && markValid && (
          <div className="cal">
            <p className="cal-head">Tháng {month + 1} /{year}</p>

            <div className="cal-grid">
              {DOW.map((d) => (
                <span className="cal-dow" key={d}>{d}</span>
              ))}

              {cells.map((d, i) => {
                const isTarget = d === marked.getDate();
                return (
                  <span className={`cal-day ${isTarget ? 'is-target' : ''} ${d ? '' : 'is-empty'}`} key={i}>
                    <span>{d || ''}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {mapUrl && (
          <a className="cal-link" href={mapUrl} target="_blank" rel="noreferrer">
            {map.buttonText || 'Mở bản đồ'}
            {/* Figma 17:81 — mũi tên → nằm trong nút */}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
            </svg>
          </a>
        )}

        {showRsvp && (
          <button type="button" className="cal-rsvp-btn" onClick={() => setRsvpOpen(true)}>
            {rsvp.buttonText || 'Xác nhận tham dự'}
          </button>
        )}

        <img className="deco-flower is-left" src="/figma/flower.webp" alt="" aria-hidden="true" />
      </Reveal>

      {rsvpOpen && showRsvp && createPortal(
        <div className="modal rsvp-modal" onClick={() => setRsvpOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <span>{rsvp.modalTitle || 'Xác nhận tham dự'}</span>
              <button type="button" onClick={() => setRsvpOpen(false)} aria-label="Đóng">✕</button>
            </header>

            <div className="modal-body">
              {rsvp.subtitle && <p className="modal-lead">{rsvp.subtitle}</p>}
              <RsvpForm data={rsvp} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
