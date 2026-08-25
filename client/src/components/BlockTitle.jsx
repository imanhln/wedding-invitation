import Reveal from './Reveal.jsx';

/** Tiêu đề khối — Figma "Heading 2": Inter 700 20/30, chữ hoa, không có gạch. */
export default function BlockTitle({ title, subtitle }) {
  if (!title && !subtitle) return null;

  return (
    <header className="block-head">
      {title && (
        <Reveal anim="up" as="h2" className="block-title">{title}</Reveal>
      )}
      {subtitle && (
        <Reveal anim="up" delay={120} as="p" className="block-subtitle">{subtitle}</Reveal>
      )}
    </header>
  );
}
