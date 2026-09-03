import { useEffect, useState } from 'react';
import { listUploads, uploadFiles } from '../api.js';
import { parseMusicSource } from '../utils.js';
import { coverWidth, imgProps } from '../img.js';

/* --------------------------------- Cơ bản -------------------------------- */

export function Text({ label, value, onChange, placeholder, hint, type = 'text' }) {
  return (
    <label className="a-field">
      <span className="a-label">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <em className="a-hint">{hint}</em>}
    </label>
  );
}

export function TextArea({ label, value, onChange, rows = 4, hint, placeholder }) {
  return (
    <label className="a-field">
      <span className="a-label">{label}</span>
      <textarea rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <em className="a-hint">{hint}</em>}
    </label>
  );
}

export function Select({ label, value, onChange, options, hint }) {
  return (
    <label className="a-field">
      <span className="a-label">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <em className="a-hint">{hint}</em>}
    </label>
  );
}

export function Toggle({ label, value, onChange, hint }) {
  return (
    <label className="a-toggle">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span className="a-toggle-track" aria-hidden="true"><span className="a-toggle-dot" /></span>
      <span>
        {label}
        {hint && <em className="a-hint">{hint}</em>}
      </span>
    </label>
  );
}

export function Color({ label, value, onChange }) {
  return (
    <label className="a-field a-field-color">
      <span className="a-label">{label}</span>
      <span className="a-color-row">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export function Range({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <label className="a-field">
      <span className="a-label">{label} <b>{value}{suffix}</b></span>
      <input type="range" min={min} max={max} step={step} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/* ------------------------------ Chọn ảnh / file --------------------------- */

/** Xem trước nguồn nhạc + cảnh báo khi link không phát được. */
export function MusicPreview({ url }) {
  const source = parseMusicSource(url);
  if (!source) return <span className="a-media-empty">Chưa chọn</span>;

  if (source.type === 'youtube') {
    return (
      <>
        <a className="a-yt-preview" href={source.url} target="_blank" rel="noreferrer">
          <img src={`https://img.youtube.com/vi/${source.id}/mqdefault.jpg`} alt="" />
          <span>Video YouTube · {source.id}</span>
        </a>
        <span className="a-media-warn">
          Khách mở thiệp <b>từ Zalo trên iPhone sẽ không nghe được</b>: trình duyệt trong Zalo
          bung video YouTube ra toàn màn hình, nên thiệp phải tự tắt nhạc ở những máy đó.
          Muốn ai cũng nghe được (và nghe tiếp cả khi tắt màn hình) thì tải file .mp3 lên —
          hoặc chạy <code>npm run music:from-youtube -- &lt;link&gt;</code> để lấy phần tiếng của
          video này thành file và gán vào đây.
        </span>
      </>
    );
  }

  if (source.type === 'page') {
    return (
      <span className="a-media-warn">
        Link này là <b>trang nghe nhạc</b>, không phải file nhạc nên trình duyệt không phát được.
        Hãy tải file .mp3 lên, hoặc dán link YouTube của bài hát.
      </span>
    );
  }

  return <audio src={source.url} controls />;
}

export function MediaPicker({ label, value, onChange, accept = 'image/*', hint, placeholder = 'hoặc dán link ảnh' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="a-field">
      <span className="a-label">{label}</span>

      <div className="a-media">
        <div className="a-media-preview">
          {value ? (
            accept.includes('audio') ? (
              <MusicPreview url={value} />
            ) : (
              <img {...imgProps(value, coverWidth(110, 84))} alt="" decoding="async" />
            )
          ) : (
            <span className="a-media-empty">Chưa chọn</span>
          )}
        </div>

        <div className="a-media-actions">
          <button type="button" className="a-btn a-btn-sm" onClick={() => setOpen(true)}>Chọn / Tải lên</button>
          {value && (
            <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => onChange('')}>Xoá</button>
          )}
          <input
            className="a-media-url"
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>

      {hint && <em className="a-hint">{hint}</em>}

      {open && (
        <MediaModal
          accept={accept}
          onClose={() => setOpen(false)}
          onPick={(url) => { onChange(url); setOpen(false); }}
        />
      )}
    </div>
  );
}

export function MediaModal({ onClose, onPick, accept = 'image/*', multiple = false, onPickMany }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => listUploads().then((r) => setFiles(r.files)).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const onUpload = async (e) => {
    if (!e.target.files?.length) return;
    setBusy(true);
    setError('');
    try {
      const res = await uploadFiles(e.target.files);
      await load();
      if (multiple && onPickMany) onPickMany(res.files.map((f) => f.url));
      else if (res.files[0]) onPick(res.files[0].url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isAudio = accept.includes('audio');
  const shown = files.filter((f) => (isAudio ? /\.(mp3|m4a|wav|ogg)$/i.test(f.name) : !/\.(mp3|m4a|wav|ogg)$/i.test(f.name)));

  return (
    <div className="a-modal" onClick={onClose}>
      <div className="a-modal-box" onClick={(e) => e.stopPropagation()}>
        <header className="a-modal-head">
          <h3>Thư viện file</h3>
          <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={onClose}>Đóng</button>
        </header>

        <label className="a-upload">
          <input type="file" accept={accept} multiple={multiple} onChange={onUpload} hidden />
          {busy ? 'Đang tải lên...' : 'Bấm để tải file lên (kéo thả cũng được)'}
        </label>

        {error && <p className="a-error">{error}</p>}

        <div className={`a-modal-grid ${isAudio ? 'is-list' : ''}`}>
          {shown.map((f) => (
            <button type="button" key={f.name} className="a-thumb" onClick={() => onPick(f.url)} title={f.name}>
              {isAudio ? <span className="a-thumb-name">{f.name}</span> : <img {...imgProps(f.url, coverWidth(120, 120))} alt={f.name} loading="lazy" decoding="async" />}
            </button>
          ))}
          {!shown.length && <p className="a-empty">Chưa có file nào.</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Danh sách item lặp lại ------------------------- */

export function ListEditor({ items = [], onChange, renderItem, newItem, addLabel = 'Thêm mục', titleOf }) {
  const update = (i, patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="a-list">
      {items.map((item, i) => (
        <details className="a-list-item" key={item.id || i} open={items.length <= 2}>
          <summary>
            <span className="a-list-title">{titleOf ? titleOf(item, i) : `Mục ${i + 1}`}</span>
            <span className="a-list-tools">
              <button type="button" onClick={(e) => { e.preventDefault(); move(i, -1); }} title="Lên">↑</button>
              <button type="button" onClick={(e) => { e.preventDefault(); move(i, 1); }} title="Xuống">↓</button>
              <button type="button" className="is-danger" onClick={(e) => { e.preventDefault(); remove(i); }} title="Xoá">✕</button>
            </span>
          </summary>
          <div className="a-list-body">{renderItem(item, (patch) => update(i, patch), i)}</div>
        </details>
      ))}

      <button type="button" className="a-btn a-btn-dashed" onClick={() => onChange([...items, newItem()])}>
        + {addLabel}
      </button>
    </div>
  );
}
