import { useEffect, useMemo, useState } from 'react';
import { listUploads, deleteUpload, uploadFiles } from '../api.js';
import { coverWidth, imgProps } from '../img.js';

const AUDIO_RE = /\.(mp3|m4a|wav|ogg)$/i;

const fmtSize = (n) =>
  n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const fmtDate = (ms) =>
  new Date(ms).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

/**
 * Thư viện file đã tải lên: xem, lọc, xoá.
 * `content` truyền vào để biết file nào đang được thiệp dùng — xoá nhầm ảnh đang
 * dùng là thiệp vỡ ảnh mà không khôi phục lại được.
 */
export default function LibraryTab({ content }) {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [kind, setKind] = useState('image');
  const [onlyUnused, setOnlyUnused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    return listUploads()
      .then((r) => setFiles(r.files))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  /* Nội dung thiệp lưu URL đầy đủ, mà URL nào cũng kết thúc bằng tên file — tên
     đã kèm hậu tố ngẫu nhiên nên không sợ trùng — nên dò tên trong JSON là đủ. */
  const usedNames = useMemo(() => {
    const json = JSON.stringify(content || {});
    return new Set(files.filter((f) => json.includes(f.name)).map((f) => f.name));
  }, [content, files]);

  const shown = files
    .filter((f) => (kind === 'all' ? true : kind === 'audio' ? AUDIO_RE.test(f.name) : !AUDIO_RE.test(f.name)))
    .filter((f) => !onlyUnused || !usedNames.has(f.name));

  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
  const unusedCount = files.filter((f) => !usedNames.has(f.name)).length;

  const toggle = (name) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const remove = async (names) => {
    if (!names.length) return;
    const used = names.filter((n) => usedNames.has(n));
    const lines = [
      names.length === 1 ? `Xoá file "${names[0]}"?` : `Xoá ${names.length} file đã chọn?`,
      used.length ? `\n${used.length} file đang được dùng trên thiệp — xoá xong chỗ đó sẽ mất ảnh.` : '',
      '\nFile đã xoá không khôi phục lại được.'
    ];
    if (!window.confirm(lines.filter(Boolean).join('\n'))) return;

    setBusy('delete');
    setError('');
    try {
      // Xoá tuần tự: Blob store hay chặn khi bắn hàng chục request xoá cùng lúc.
      for (const name of names) await deleteUpload(name);
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
      await load();
    }
  };

  const onUpload = async (e) => {
    if (!e.target.files?.length) return;
    setBusy('upload');
    setError('');
    try {
      await uploadFiles(e.target.files);
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = '';
      setBusy('');
      await load();
    }
  };

  return (
    <section className="a-card">
      <header className="a-card-head">
        <h2>Thư viện file</h2>
        <p>
          {loading
            ? 'Đang tải danh sách...'
            : `${files.length} file · ${fmtSize(totalSize)} · ${unusedCount} file không dùng đến`}
        </p>
      </header>

      <div className="a-card-body">
        <div className="a-lib-bar">
          <div className="a-seg">
            {[
              { id: 'image', label: 'Ảnh' },
              { id: 'audio', label: 'Nhạc' },
              { id: 'all', label: 'Tất cả' }
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                className={`a-seg-btn ${kind === o.id ? 'is-active' : ''}`}
                onClick={() => setKind(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <label className="a-lib-check">
            <input type="checkbox" checked={onlyUnused} onChange={(e) => setOnlyUnused(e.target.checked)} />
            Chỉ file không dùng
          </label>

          <span className="a-lib-spacer" />

          <label className="a-btn a-btn-sm">
            <input type="file" accept="image/*,audio/*" multiple onChange={onUpload} hidden />
            {busy === 'upload' ? 'Đang tải lên...' : 'Tải file lên'}
          </label>
          <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={load} disabled={loading}>
            Tải lại
          </button>
        </div>

        <div className="a-lib-bar">
          <button
            type="button"
            className="a-btn a-btn-sm a-btn-ghost"
            onClick={() => setSelected(new Set(shown.map((f) => f.name)))}
            disabled={!shown.length}
          >
            Chọn hết ({shown.length})
          </button>
          <button
            type="button"
            className="a-btn a-btn-sm a-btn-ghost"
            onClick={() => setSelected(new Set())}
            disabled={!selected.size}
          >
            Bỏ chọn
          </button>
          <span className="a-lib-spacer" />
          <button
            type="button"
            className="a-btn a-btn-sm a-btn-danger"
            onClick={() => remove([...selected])}
            disabled={!selected.size || busy === 'delete'}
          >
            {busy === 'delete' ? 'Đang xoá...' : `Xoá ${selected.size || ''} file đã chọn`}
          </button>
        </div>

        {error && <p className="a-error">{error}</p>}

        <div className={`a-lib-grid ${kind === 'audio' ? 'is-list' : ''}`}>
          {shown.map((f) => {
            const used = usedNames.has(f.name);
            const isAudio = AUDIO_RE.test(f.name);
            return (
              <div key={f.name} className={`a-lib-item ${selected.has(f.name) ? 'is-selected' : ''}`}>
                <label className="a-lib-media">
                  <input
                    type="checkbox"
                    className="a-lib-tick"
                    checked={selected.has(f.name)}
                    onChange={() => toggle(f.name)}
                  />
                  {isAudio ? <span className="a-lib-audio">♪</span> : <img {...imgProps(f.url, coverWidth(180, 135))} alt={f.name} loading="lazy" decoding="async" />}
                  <span className={`a-lib-badge ${used ? 'is-used' : ''}`}>{used ? 'Đang dùng' : 'Không dùng'}</span>
                </label>

                <div className="a-lib-meta">
                  <b title={f.name}>{f.name}</b>
                  <span>{fmtSize(f.size || 0)} · {fmtDate(f.mtime)}</span>
                </div>

                <div className="a-lib-tools">
                  <a className="a-btn a-btn-sm a-btn-ghost" href={f.url} target="_blank" rel="noreferrer">Xem</a>
                  <button
                    type="button"
                    className="a-btn a-btn-sm a-btn-danger"
                    onClick={() => remove([f.name])}
                    disabled={busy === 'delete'}
                  >
                    Xoá
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && !shown.length && <p className="a-empty">Không có file nào ở mục này.</p>}
        </div>
      </div>
    </section>
  );
}
