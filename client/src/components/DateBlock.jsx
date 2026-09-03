/**
 * Khối ngày của panel đỏ.
 *
 *          THỨ BẢY  ◆  16:00
 *      ─────       19       ─────
 *            THÁNG 9 · 2026
 *
 * Con số ngày nằm ở cột giữa của lưới 1fr–auto–1fr nên luôn trùng tâm khối,
 * hai vạch mảnh mọc ra từ hai bên nó và mờ dần về phía ngoài. Khối rộng cố
 * định, canh giữa bằng margin — chữ hai bên dài ngắn ra sao cũng không kéo
 * lệch được trục như cặp dòng rời trước đây.
 *
 * Thiếu giờ (thiệp mời có thể bỏ trống) thì bỏ luôn dấu ◆ ngăn giữa.
 */
export default function DateBlock({ weekday, time, day, month, year }) {
  if (!day) return null;

  return (
    <div className="date-block">
      {(weekday || time) && (
        <p className="db-top">
          {weekday && <span>{weekday}</span>}
          {weekday && time && <i className="db-dot" aria-hidden="true" />}
          {time && <span>{time}</span>}
        </p>
      )}

      <div className="db-mid">
        <span className="db-rule" aria-hidden="true" />
        <span className="db-day">{day}</span>
        <span className="db-rule" aria-hidden="true" />
      </div>

      <p className="db-my">
        Tháng {month} <i aria-hidden="true">·</i> {year}
      </p>
    </div>
  );
}
