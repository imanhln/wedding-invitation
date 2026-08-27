import Reveal from '../components/Reveal.jsx';
import { coverWidth, imgProps } from '../img.js';

export default function ThanksSection({ data }) {
  return (
    <section className="block block-thanks" id={data.id}>
      {data.image && (
        /* Khung min(230px, 70%) x aspect 4/5 -> 230x287, cắt bởi cover */
        <Reveal anim="zoom" className="thanks-photo">
          <img {...imgProps(data.image, coverWidth(230, 287))} alt="" loading="lazy" decoding="async" />
        </Reveal>
      )}

      <Reveal anim="up" delay={80} as="h2" className="thanks-title">{data.title}</Reveal>

      <Reveal anim="zoom" delay={140} className="block-rule" aria-hidden="true">
        <span /><em>❦</em><span />
      </Reveal>

      {String(data.body || '')
        .split('\n')
        .filter(Boolean)
        .map((line, i) => (
          <Reveal key={i} anim="up" delay={200 + i * 80} as="p" className="thanks-body">{line}</Reveal>
        ))}

      {data.signature && (
        <Reveal anim="up" delay={420} as="p" className="thanks-signature">{data.signature}</Reveal>
      )}
    </section>
  );
}
