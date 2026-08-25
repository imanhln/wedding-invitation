import { useReveal } from '../hooks/useReveal.js';

/**
 * Bọc nội dung để hiện dần khi cuộn tới.
 * anim: up | down | left | right | zoom | fade | blur
 */
export default function Reveal({
  children,
  anim = 'up',
  delay = 0,
  duration = 900,
  as: Tag = 'div',
  className = '',
  once = true,
  ...rest
}) {
  const [ref, shown] = useReveal({ once });

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${anim} ${shown ? 'is-shown' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms`, '--reveal-duration': `${duration}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
