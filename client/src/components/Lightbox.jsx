import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { imgProps, prefetchImg } from '../img.js';

/* Ảnh phóng to tràn màn hình nên cần khổ lớn, nhưng vẫn không cần bản gốc
   1600px trên điện thoại — để trình duyệt tự chọn theo `sizes`. */
const FULL_WIDTHS = [640, 960, 1280, 1600];
const PREFETCH_WIDTH = 960;

/** Xem ảnh phóng to, chuyển ảnh bằng phím mũi tên / nút. */
export default function Lightbox({ photos, index, onClose, onIndex }) {
  const open = index >= 0 && index < photos.length;

  const prev = useCallback(() => onIndex((index - 1 + photos.length) % photos.length), [index, photos.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, prev, next]);

  /* Nạp sẵn đúng hai ảnh liền kề (không nạp cả album) để bấm ‹ › là hiện ngay. */
  useEffect(() => {
    if (!open || photos.length < 2) return;
    const around = [(index + 1) % photos.length, (index - 1 + photos.length) % photos.length];
    for (const i of around) prefetchImg(photos[i]?.url, PREFETCH_WIDTH);
  }, [open, index, photos]);

  if (!open) return null;
  const photo = photos[index];

  return createPortal(
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" onClick={onClose} aria-label="Đóng">×</button>
      {photos.length > 1 && (
        <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Ảnh trước">‹</button>
      )}
      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img
          {...imgProps(photo.url, 1280, { widths: FULL_WIDTHS, sizes: '92vw' })}
          alt={photo.caption || ''}
          decoding="async"
          fetchpriority="high"
        />
        {photo.caption && <figcaption>{photo.caption}</figcaption>}
        <span className="lightbox-count">{index + 1} / {photos.length}</span>
      </figure>
      {photos.length > 1 && (
        <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Ảnh sau">›</button>
      )}
    </div>,
    document.body
  );
}
