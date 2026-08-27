import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Reveal from '../components/Reveal.jsx';
import BlockTitle from '../components/BlockTitle.jsx';
import { copyText, downloadImage, safeFileName } from '../utils.js';

/**
 * Hộp quà mừng — Figma node 1:325: hai phong bì đỏ nghiêng vào nhau,
 * mỗi cái có bóng mờ bên dưới, quanh đó là 4 ngôi sao ✦ vàng và chữ "Nhấn để mở".
 * Phong bì nhấp nhô nhẹ như bông hoa; hover thì phóng to và lắc lư hai bên.
 * Bấm vào mở modal chứa QR + số tài khoản.
 */
export default function GiftSection({ data }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const copy = async (acc) => {
    await copyText(acc.number);
    setCopied(acc.id);
    setTimeout(() => setCopied(''), 2000);
  };

  /** Tải ảnh QR về máy, tên file dạng QR-Nha-trai-Vietcombank.png */
  const saveQr = async (acc) => {
    if (!acc.qr) return;
    const name = safeFileName([acc.side, acc.bank, acc.owner].filter(Boolean).join(' '), 'ma-QR');
    await downloadImage(acc.qr, `QR-${name}`);
    setSaved(acc.id);
    setTimeout(() => setSaved(''), 2000);
  };

  return (
    <section className="block block-gift" id={data.id}>
      <img className="deco-castle is-gift" src="/figma/castle.webp" alt="" aria-hidden="true" />

      <BlockTitle title={data.title} subtitle={data.subtitle} />

      <Reveal anim="zoom" delay={120} className="gift-open-wrap">
        <button
          type="button"
          className="gift-envelope-btn"
          onClick={() => setOpen(true)}
          aria-label={data.buttonText || 'Mở hộp mừng cưới'}
        >
          <span className="gift-spark" aria-hidden="true">✦</span>
          <span className="gift-spark" aria-hidden="true">✦</span>
          <span className="gift-spark" aria-hidden="true">✦</span>
          <span className="gift-spark" aria-hidden="true">✦</span>

          <span className="gift-env gift-env-2" aria-hidden="true">
            <span className="gift-shadow" />
            <img className="gift-envelope" src="/figma/redenvelope.webp" alt="" />
          </span>

          <span className="gift-env gift-env-1" aria-hidden="true">
            <span className="gift-shadow" />
            <img className="gift-envelope" src="/figma/redenvelope.webp" alt="" />
          </span>

          <span className="gift-hint">{data.buttonText || 'Nhấn để mở'}</span>
        </button>
      </Reveal>

      {open && createPortal(
        <div className="gift-modal" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="gift-modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="gift-modal-head">
              <span>{data.modalTitle || 'GỬI MỪNG CƯỚI'}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </header>

            <div className="gift-modal-body">
              {(data.accounts || []).map((acc, i) => (
                <div className="gift-acc" key={acc.id || i}>
                  <span className="gift-acc-side">{acc.side}</span>

                  <div className="gift-acc-qr">
                    {acc.qr ? <img src={acc.qr} alt={`QR ${acc.side}`} /> : <span className="gift-acc-empty">QR</span>}
                  </div>

                  {acc.qr && (
                    <button
                      type="button"
                      className="gift-acc-save"
                      onClick={() => saveQr(acc)}
                      aria-label={`Tải mã QR ${acc.side || acc.bank || ''}`.trim()}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                        <path
                          d="M12 3.5v10m0 0 3.8-3.8M12 13.5 8.2 9.7M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {saved === acc.id ? 'Đã tải QR' : 'Tải mã QR'}
                    </button>
                  )}

                  <p className="gift-acc-owner">{acc.owner}</p>
                  <p className="gift-acc-bank">{acc.bank}</p>

                  <button type="button" className="gift-acc-number" onClick={() => copy(acc)}>
                    {copied === acc.id ? 'Đã sao chép' : acc.number}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
