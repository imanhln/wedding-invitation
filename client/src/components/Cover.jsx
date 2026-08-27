import { useEffect, useState } from "react";
import Petals from "./Petals.jsx";
import { coverBgUrl, coverWidth, imgProps } from "../img.js";

const FLOWER = "/figma/flower.webp";

/**
 * Màn hình đầu tiên — Figma node 1:2 "1920w light":
 * nền đỏ đô, tấm thiệp kem 600x420 bo góc 8, huy hiệu trái tim tròn 56px,
 * tên đôi Playfair Display 36/45, vạch ❦ vạch, ngày, "Thân Mời", nút pill.
 */
export default function Cover({ cover, opening, onOpen, guestName, effects }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* Ảnh nền bìa là ảnh LCP của cả trang. `background-image` không dùng được
     srcset, nên coverBgUrl() chốt một khổ 1280px cho mọi máy — nhờ URL không
     phụ thuộc viewport mà máy chủ chèn được <link rel="preload"> khớp đúng URL
     này vào HTML (shareMeta.js), ảnh bắt đầu tải trước cả bundle JS. */
  const style = cover.backgroundImage
    ? {
        backgroundImage: `linear-gradient(rgba(92,22,29,.82), rgba(58,13,18,.94)), url(${coverBgUrl(
          cover.backgroundImage,
        )})`,
      }
    : undefined;

  return (
    <div
      className={`cover ${entered ? "is-entered" : ""} ${opening ? "is-opening" : ""}`}
      style={style}
    >
      <Petals
        enabled={effects?.coverPetals !== false}
        density={effects?.coverPetalsDensity ?? 14}
        color="#F6DCC8"
        className="cover-hearts"
        startDelay={500}
      />

      <div className="cover-card">
        <img
          className="cover-flower is-tl"
          src={FLOWER}
          alt=""
          aria-hidden="true"
        />
        <img
          className="cover-flower is-br"
          src={FLOWER}
          alt=""
          aria-hidden="true"
        />

        <div className="cover-inner">
          <span
            className="cover-seal cover-fade"
            style={{ "--d": "80ms" }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-8.5-5.2-8.5-11A5 5 0 0 1 12 6.6 5 5 0 0 1 20.5 10c0 5.8-8.5 11-8.5 11z" />
            </svg>
          </span>

          {cover.greeting && (
            <p className="cover-greeting cover-fade" style={{ "--d": "180ms" }}>
              {cover.greeting}
            </p>
          )}

          {cover.photo && (
            <div className="cover-photo cover-fade" style={{ "--d": "260ms" }}>
              {/* Khung 88x88 vuông, cắt bởi cover */}
              <img
                {...imgProps(cover.photo, coverWidth(88, 88))}
                alt=""
                decoding="async"
              />
            </div>
          )}

          <h1 className="cover-names cover-fade" style={{ "--d": "340ms" }}>
            <span>{cover.groomName}</span>
            <span className="cover-amp">{cover.ampersand || "&"}</span>
            <span>{cover.brideName}</span>
          </h1>

          <div
            className="cover-rule cover-fade"
            style={{ "--d": "420ms" }}
            aria-hidden="true"
          >
            <span />
            <em>{cover.seal || "❦"}</em>
            <span />
          </div>

          {cover.dateText && (
            <p className="cover-date cover-fade" style={{ "--d": "500ms" }}>
              {cover.dateText}
            </p>
          )}

          {cover.subText && (
            <p className="cover-sub cover-fade" style={{ "--d": "560ms" }}>
              {cover.subText}
            </p>
          )}

          {/* "Thân Mời" ở trên đã là lời mời — đây chỉ là tên khách được mời */}
          {guestName && (
            <p className="cover-guest cover-fade" style={{ "--d": "620ms" }}>
              {guestName}
            </p>
          )}

          <button
            type="button"
            className="cover-btn cover-fade"
            style={{ "--d": "700ms" }}
            onClick={onOpen}
          >
            <span className="cover-btn-ping" aria-hidden="true" />
            <span className="cover-btn-label">
              {cover.buttonText || "Mở thiệp"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
