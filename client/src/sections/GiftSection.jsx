import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Reveal from '../components/Reveal.jsx';
import BlockTitle from '../components/BlockTitle.jsx';
import { copyText } from '../utils.js';

/**
 * Hộp quà mừng — Figma node 1:325: hai phong bì đỏ nghiêng vào nhau,
 * mỗi cái có bóng mờ bên dưới, quanh đó là 4 ngôi sao ✦ vàng và chữ "Nhấn để mở".
 * Phong bì nhấp nhô nhẹ như bông hoa; hover thì phóng to và lắc lư hai bên.
 * Bấm vào mở modal chứa QR + số tài khoản.
 */
export default function GiftSection({ data }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');

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

  return (
    <section className="block block-gift" id={data.id}>
      <img className="deco-castle is-gift" src="/figma/castle.png" alt="" aria-hidden="true" />

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
            <img className="gift-envelope" src="/figma/redenvelope.png" alt="" />
          </span>

          <span className="gift-env gift-env-1" aria-hidden="true">
            <span className="gift-shadow" />
            <img className="gift-envelope" src="/figma/redenvelope.png" alt="" />
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
