import Reveal from '../components/Reveal.jsx';
import { imgProps } from '../img.js';

/** Icon có sẵn xuất từ Figma (camera.webp / cake.webp / cook.webp). */
export const TIMELINE_ICONS = {
  camera: '/figma/icon-camera.webp',
  cake: '/figma/icon-cake.webp',
  cook: '/figma/icon-cook.webp'
};

/**
 * Lịch trình ngày cưới — Figma node 1:231 (panel đỏ 560x405):
 * mỗi dòng gồm icon · giờ · dot (nối bằng vạch dọc) · tên việc.
 */
export default function EventsSection({ data }) {
  const items = data.items || [];

  return (
    <section className="block block-events" id={data.id}>
      <Reveal anim="up" className="panel" duration={1000}>
        {data.panelTitle && <p className="panel-title">{data.panelTitle}</p>}

        <div className="timeline-rows">
          {items.map((item, i) => {
            const builtIn = Boolean(TIMELINE_ICONS[item.icon]);
            const icon = TIMELINE_ICONS[item.icon] || (item.icon?.startsWith('/') ? item.icon : '');
            return (
              <div className="tl-row" key={item.id || i}>
                <span className="tl-left">
                  {/* Icon có sẵn đã là webp 2-3KB, để nguyên. Icon tự tải lên
                      thì là ảnh 1600px vẽ trong khung 40px — phải hạ khổ. */}
                  <span className="tl-icon">
                    {icon && (
                      <img
                        {...(builtIn ? { src: icon } : imgProps(icon, 40))}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="tl-time">{item.time}</span>
                </span>
                <span className="tl-dot" aria-hidden="true"><i /></span>
                <span className="tl-label">
                  {item.label}
                  {item.note && <em className="tl-sub">{item.note}</em>}
                </span>
              </div>
            );
          })}
        </div>

        <img className="deco-flower is-right-low" src="/figma/flower.webp" alt="" aria-hidden="true" />
      </Reveal>
    </section>
  );
}
