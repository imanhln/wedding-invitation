/**
 * Nút bật/tắt nhạc nền — Figma node 1:336: nút tròn 48px nền đỏ đô,
 * viền trắng mờ, bốn vạch trắng nhảy theo nhạc.
 */
export default function MusicButton({ playing, onToggle, visible }) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={`music-btn ${playing ? 'is-playing' : ''}`}
      onClick={onToggle}
      aria-label={playing ? 'Tạm dừng nhạc' : 'Bật nhạc'}
      title={playing ? 'Tạm dừng nhạc' : 'Bật nhạc'}
    >
      <span className="eq" aria-hidden="true">
        <span /><span /><span /><span />
      </span>
    </button>
  );
}
