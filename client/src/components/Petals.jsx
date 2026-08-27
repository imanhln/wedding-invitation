import { useEffect, useRef, useState } from 'react';

/** Chạy cb khi luồng chính rảnh — tránh khởi động canvas lúc trang đang vẽ/ảnh đang decode. */
function whenIdle(cb, timeout = 2000) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(cb, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 200);
  return () => clearTimeout(id);
}

/**
 * Trái tim rơi nhẹ (canvas, không chặn thao tác chuột).
 * startDelay: chờ bao lâu sau khi bật mới xin nhịp rảnh để khởi động
 * (dùng để đợi animation vào trang chạy xong, tránh giật).
 */
export default function Petals({
  enabled = true,
  density = 18,
  color = '#8B1E2D',
  className = 'petals-canvas',
  startDelay = 0
}) {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);

  /* ---- Giai đoạn 1: chỉ quyết định "khi nào được phép chạy" ---------------- */
  useEffect(() => {
    if (!enabled) {
      setRunning(false);
      setVisible(false);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelIdle = null;
    const timer = setTimeout(() => {
      cancelIdle = whenIdle(() => setRunning(true));
    }, startDelay);

    return () => {
      clearTimeout(timer);
      if (cancelIdle) cancelIdle();
    };
  }, [enabled, startDelay]);

  /* ---- Giai đoạn 2: canvas + vòng lặp vẽ ---------------------------------- */
  useEffect(() => {
    if (!running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let resizeTimer = 0;
    let w = 0;
    let h = 0;
    let hearts = [];
    let t = 0;

    const rand = (min, max) => min + Math.random() * (max - min);

    const makeHeart = (initial = false) => ({
      x: rand(0, w),
      y: initial ? rand(-h, h) : rand(-80, -10),
      size: rand(9, 20),
      speed: rand(0.25, 0.9),
      drift: rand(-0.4, 0.4),
      // lắc qua lại quanh trục đứng thay vì xoay tròn, để luôn nhìn ra hình tim
      tilt: rand(-0.35, 0.35),
      sway: rand(0.4, 1.1),
      phase: rand(0, Math.PI * 2),
      opacity: rand(0.25, 0.7)
    });

    /* DPR chặn ở 1.5: canvas full màn hình ở DPR 3 tốn gấp 4 lần pixel để vẽ
       mà mắt gần như không phân biệt được với hình tim mềm này. */
    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /* Số tim = density * w / bề-rộng-tham-chiếu; sàn là 1 để mức "2" trong trang
       quản trị thật sự chỉ thả lác đác vài trái tim.
       Mốc tham chiếu co lại trên màn hình hẹp: điện thoại hẹp mà cao, nếu vẫn
       chia cho 420 như desktop thì chỉ còn ~1/3 số tim và nhìn thưa hẳn. Ramp
       tuyến tính 360px -> 250 và 900px -> 420 để không nhảy bậc khi xoay máy. */
    const refWidth = () => {
      const k = Math.min(1, Math.max(0, (w - 360) / (900 - 360)));
      return 250 + k * (420 - 250);
    };
    const targetCount = () => Math.max(1, Math.round((density * w) / refWidth()));

    /* Resize chỉ đo lại và bù/bớt số tim — KHÔNG tạo lại cả đàn.
       Trên mobile, thanh địa chỉ ẩn/hiện khi cuộn là một chuỗi resize liên tục. */
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const prevW = w;
        measure();
        if (prevW > 0 && w !== prevW) {
          const k = w / prevW;
          for (const p of hearts) p.x *= k;
        }
        const want = targetCount();
        while (hearts.length > want) hearts.pop();
        while (hearts.length < want) hearts.push(makeHeart(true));
      }, 150);
    };

    /* Trái tim = 2 nửa cung tròn (thuỳ) + 2 đường cong xuống mũi nhọn.
       Dùng arc() nên hai thuỳ luôn tròn đều và đối xứng tuyệt đối.
       a = bán kính thuỳ; tim rộng 4a, cao 3.3a, tâm hình lệch 0.65a. */
    const drawHeart = (p) => {
      const a = p.size / 4;
      ctx.save();
      ctx.translate(p.x, p.y - a * 0.65);
      ctx.rotate(p.tilt + Math.sin(t * 0.02 * p.sway + p.phase) * 0.18);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);                             // khe lõm giữa hai thuỳ
      ctx.arc(-a, 0, a, 0, Math.PI, true);          // thuỳ trái -> (-2a, 0)
      ctx.quadraticCurveTo(-a * 2, a * 1.25, 0, a * 2.3);   // sườn trái xuống mũi
      ctx.quadraticCurveTo(a * 2, a * 1.25, a * 2, 0);      // mũi lên sườn phải
      ctx.arc(a, 0, a, 0, Math.PI, true);           // thuỳ phải -> (0, 0)
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      for (const p of hearts) {
        p.y += p.speed;
        p.x += p.drift + Math.sin(p.y / 90) * 0.4;
        if (p.y > h + 30 || p.x < -50 || p.x > w + 50) Object.assign(p, makeHeart());
        drawHeart(p);
      }
      raf = requestAnimationFrame(tick);
    };

    /* Tab bị ẩn thì dừng hẳn vòng lặp cho khỏi tốn pin/CPU. */
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    /* Đo và vẽ frame đầu ở frame sau, không làm trong lúc React vừa commit. */
    raf = requestAnimationFrame(() => {
      measure();
      hearts = Array.from({ length: targetCount() }, () => makeHeart(true));
      setVisible(true);
      tick();
    });

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, density, color]);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef}
      className={`fx-canvas ${className} ${visible ? 'is-visible' : ''}`}
      aria-hidden="true"
    />
  );
}
