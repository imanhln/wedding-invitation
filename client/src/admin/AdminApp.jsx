import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchContent, saveContent, resetContent, adminLogin, adminCheck, adminLogout,
  getToken, setToken, clearToken, exportUrl, importData
} from '../api.js';
import { SECTION_LABELS } from '../sections/index.js';
import SectionEditor from './SectionEditor.jsx';
import GuestsTab from './GuestsTab.jsx';
import LibraryTab from './LibraryTab.jsx';
import { Text, TextArea, Toggle, Color, Range, MediaPicker } from './fields.jsx';

const TABS = [
  { id: 'cover', label: 'Bìa & mở thiệp' },
  { id: 'couple', label: 'Cô dâu & Chú rể' },
  { id: 'sections', label: 'Nội dung thiệp' },
  { id: 'media', label: 'Nhạc & hiệu ứng' },
  { id: 'theme', label: 'Giao diện' },
  { id: 'guests', label: 'Khách mời' },
  { id: 'library', label: 'Thư viện file' },
  { id: 'backup', label: 'Sao lưu' }
];

/* Nhớ tab đang mở để F5 (hoặc mở lại trang quản trị) không nhảy về tab đầu. */
const TAB_KEY = 'wedding_admin_tab';

const savedTab = () => {
  const id = localStorage.getItem(TAB_KEY);
  return TABS.some((t) => t.id === id) ? id : TABS[0].id;
};

export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) { setChecking(false); return; }
    adminCheck().then(() => setAuthed(true)).catch(() => clearToken()).finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="a-splash"><span className="loader" /></div>;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { adminLogout().catch(() => {}); clearToken(); setAuthed(false); }} />;
}

/* --------------------------------- Đăng nhập ------------------------------ */

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await adminLogin(password);
      setToken(token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-login">
      <form className="a-login-box" onSubmit={submit}>
        <span className="a-login-mark">❦</span>
        <h1>Quản trị thiệp cưới</h1>
        <p className="a-login-sub">Nhập mật khẩu để chỉnh sửa nội dung</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          autoFocus
        />

        {error && <p className="a-error">{error}</p>}

        <button className="a-btn a-btn-primary" disabled={busy}>
          {busy ? 'Đang kiểm tra...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

/* -------------------------------- Dashboard ------------------------------- */

function Dashboard({ onLogout }) {
  const [content, setContent] = useState(null);
  const [tab, setTab] = useState(savedTab);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => { fetchContent().then(setContent).catch((e) => setMessage(e.message)); }, []);

  useEffect(() => { localStorage.setItem(TAB_KEY, tab); }, [tab]);

  /* Đồng bộ nội dung sang khung xem trước */
  const pushPreview = useCallback((data) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'wedding:content', content: data }, '*');
  }, []);

  useEffect(() => {
    if (!content) return;
    const id = setTimeout(() => pushPreview(content), 250);
    return () => clearTimeout(id);
  }, [content, pushPreview]);

  useEffect(() => {
    const onMsg = (e) => { if (e.data?.type === 'wedding:preview-ready') pushPreview(content); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [content, pushPreview]);

  /* Cảnh báo khi rời trang lúc chưa lưu */
  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const update = (patch) => { setContent((c) => ({ ...c, ...patch })); setDirty(true); };

  const updateSection = (id, next) => {
    setContent((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? next : s)) }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveContent(content);
      setDirty(false);
      setMessage('Đã lưu thành công');
      setTimeout(() => setMessage(''), 2500);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* Ctrl/Cmd + S để lưu nhanh */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!content) return <div className="a-splash"><span className="loader" />{message && <p className="a-error">{message}</p>}</div>;

  return (
    <div className={`a-shell ${showPreview ? 'has-preview' : ''}`}>
      <header className="a-topbar">
        <div className="a-brand">
          <span className="a-brand-mark">❦</span>
          <span>Quản trị thiệp cưới</span>
        </div>

        <nav className="a-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`a-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="a-topbar-actions">
          {message && <span className="a-message">{message}</span>}
          <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
          </button>
          <a className="a-btn a-btn-ghost a-btn-sm" href="/" target="_blank" rel="noreferrer">Mở thiệp</a>
          <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Đang lưu...' : dirty ? 'Lưu thay đổi' : 'Đã lưu'}
          </button>
          <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={onLogout}>Thoát</button>
        </div>
      </header>

      <div className="a-body">
        <main className="a-main">
          {tab === 'cover' && <CoverTab content={content} update={update} />}
          {tab === 'couple' && <CoupleTab content={content} update={update} />}
          {tab === 'sections' && <SectionsTab content={content} update={update} updateSection={updateSection} />}
          {tab === 'media' && <MediaTab content={content} update={update} />}
          {tab === 'theme' && <ThemeTab content={content} update={update} />}
          {tab === 'guests' && <GuestsTab />}
          {tab === 'library' && <LibraryTab content={content} />}
          {tab === 'backup' && <BackupTab setContent={setContent} setMessage={setMessage} />}
        </main>

        {showPreview && (
          <aside className="a-preview">
            <div className="a-preview-frame">
              <iframe ref={iframeRef} src="/?preview=1" title="Xem trước thiệp" />
            </div>
            <p className="a-preview-note">Xem trước cập nhật ngay khi bạn gõ — nhớ bấm “Lưu thay đổi”.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------- Tabs --------------------------------- */

function Card({ title, desc, children }) {
  return (
    <section className="a-card">
      <header className="a-card-head">
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </header>
      <div className="a-card-body">{children}</div>
    </section>
  );
}

function CoverTab({ content, update }) {
  const set = (patch) => update({ cover: { ...content.cover, ...patch } });
  const c = content.cover;

  return (
    <Card title="Màn hình bìa" desc="Đây là màn hình khách nhìn thấy đầu tiên, trước khi bấm mở thiệp.">
      <Text label="Chữ nhỏ phía trên" value={c.greeting} onChange={(v) => set({ greeting: v })} placeholder="Save the date" />
      <div className="a-row">
        <Text label="Tên chú rể" value={c.groomName} onChange={(v) => set({ groomName: v })} />
        <Text label="Tên cô dâu" value={c.brideName} onChange={(v) => set({ brideName: v })} />
      </div>
      <div className="a-row">
        <Text label="Ký tự nối" value={c.ampersand} onChange={(v) => set({ ampersand: v })} hint="Ví dụ: & hoặc ❦" />
        <Text label="Ngày hiển thị" value={c.dateText} onChange={(v) => set({ dateText: v })} placeholder="03.01.2026" />
      </div>
      <Text
        label="Dòng chữ dưới ngày"
        value={c.subText}
        onChange={(v) => set({ subText: v })}
        hint="Gửi link kèm ?to=Tên khách để hiện tên khách ngay dưới dòng này, ví dụ: /?to=Nguyễn Văn A"
      />
      <div className="a-row">
        <Text label="Chữ trên nút" value={c.buttonText} onChange={(v) => set({ buttonText: v })} />
        <Text label="Ký hiệu con dấu" value={c.seal} onChange={(v) => set({ seal: v })} hint="Hình tròn nhỏ trên đầu tấm thiệp" />
      </div>
      <MediaPicker label="Ảnh tròn trên bìa" value={c.photo} onChange={(v) => set({ photo: v })} />
      <MediaPicker label="Ảnh nền bìa" value={c.backgroundImage} onChange={(v) => set({ backgroundImage: v })} />
    </Card>
  );
}

function CoupleTab({ content, update }) {
  const setPerson = (key) => (patch) =>
    update({ couple: { ...content.couple, [key]: { ...content.couple[key], ...patch } } });

  return (
    <>
      {['groom', 'bride'].map((key) => {
        const p = content.couple[key];
        const set = setPerson(key);
        return (
          <Card key={key} title={key === 'groom' ? 'Chú rể' : 'Cô dâu'}>
            <MediaPicker label="Ảnh" value={p.photo} onChange={(v) => set({ photo: v })} />
            <div className="a-row">
              <Text label="Họ tên đầy đủ" value={p.name} onChange={(v) => set({ name: v })} />
              <Text label="Tên gọi ngắn" value={p.shortName} onChange={(v) => set({ shortName: v })} />
            </div>
            <Text label="Vai trò hiển thị" value={p.role} onChange={(v) => set({ role: v })} />
            <TextArea label="Câu nói / lời nhắn" rows={2} value={p.quote} onChange={(v) => set({ quote: v })} />
            <div className="a-row">
              <Text label="Bố" value={p.father} onChange={(v) => set({ father: v })} />
              <Text label="Mẹ" value={p.mother} onChange={(v) => set({ mother: v })} />
            </div>
            <div className="a-row">
              <Text label="Quê quán / địa chỉ" value={p.address} onChange={(v) => set({ address: v })} />
              <Text label="Facebook" value={p.facebook} onChange={(v) => set({ facebook: v })} />
            </div>
          </Card>
        );
      })}
    </>
  );
}

function SectionsTab({ content, update, updateSection }) {
  const [openId, setOpenId] = useState(content.sections[0]?.id);

  const move = (index, dir) => {
    const next = [...content.sections];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    update({ sections: next });
  };

  const toggle = (id, enabled) =>
    update({ sections: content.sections.map((s) => (s.id === id ? { ...s, enabled } : s)) });

  return (
    <Card
      title="Nội dung thiệp"
      desc="Bật/tắt công tắc để ẩn hiện từng phần, dùng mũi tên để đổi thứ tự hiển thị."
    >
      <div className="a-sections">
        {content.sections.map((section, i) => (
          <div className={`a-section-row ${section.enabled ? '' : 'is-off'}`} key={section.id}>
            <header className="a-section-head">
              <label className="a-switch">
                <input type="checkbox" checked={!!section.enabled} onChange={(e) => toggle(section.id, e.target.checked)} />
                <span className="a-switch-track"><span className="a-switch-dot" /></span>
              </label>

              <button type="button" className="a-section-name" onClick={() => setOpenId(openId === section.id ? null : section.id)}>
                <span>{SECTION_LABELS[section.type] || section.type}</span>
                <em>{section.title}</em>
              </button>

              <div className="a-section-tools">
                <button type="button" onClick={() => move(i, -1)} title="Lên">↑</button>
                <button type="button" onClick={() => move(i, 1)} title="Xuống">↓</button>
                <button type="button" onClick={() => setOpenId(openId === section.id ? null : section.id)}>
                  {openId === section.id ? 'Đóng' : 'Sửa'}
                </button>
              </div>
            </header>

            {openId === section.id && (
              <div className="a-section-body">
                <SectionEditor section={section} onChange={(next) => updateSection(section.id, next)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function MediaTab({ content, update }) {
  const setMusic = (patch) => update({ music: { ...content.music, ...patch } });
  const setEffects = (patch) => update({ effects: { ...content.effects, ...patch } });

  return (
    <>
      <Card title="Nhạc nền" desc="Nhạc bắt đầu phát ngay khi khách bấm nút mở thiệp.">
        <Toggle label="Bật nhạc nền" value={content.music.enabled} onChange={(v) => setMusic({ enabled: v })} />
        <MediaPicker
          label="File nhạc"
          accept="audio/*"
          value={content.music.url}
          onChange={(v) => setMusic({ url: v })}
          placeholder="hoặc dán link YouTube / link file .mp3"
          hint="Dùng được: file .mp3 tải lên (nên dưới 8MB), link trực tiếp tới file nhạc, hoặc link YouTube (vd. https://youtu.be/xxxxxxxxxxx). Không dùng được link trang nhaccuatui, Zing MP3, Spotify vì đó là trang web, không phải file nhạc."
        />
        <Range label="Âm lượng" value={Math.round((content.music.volume ?? 0.6) * 100)} onChange={(v) => setMusic({ volume: v / 100 })} suffix="%" />
        <Toggle label="Tự phát khi mở thiệp" value={content.music.autoPlayOnOpen} onChange={(v) => setMusic({ autoPlayOnOpen: v })} />
      </Card>

      <Card title="Hiệu ứng" desc="Các hiệu ứng chuyển động trên thiệp.">
        <Toggle label="Trái tim rơi — màn hình mở thiệp" value={content.effects.coverPetals !== false} onChange={(v) => setEffects({ coverPetals: v })} />
        <Range label="Mật độ trái tim — màn hình mở thiệp" value={content.effects.coverPetalsDensity ?? 2} min={1} max={50} onChange={(v) => setEffects({ coverPetalsDensity: v })} />
        <Toggle label="Trái tim rơi — trang thiệp" value={content.effects.petals} onChange={(v) => setEffects({ petals: v })} />
        <Range label="Mật độ trái tim — trang thiệp" value={content.effects.petalsDensity ?? 2} min={1} max={50} onChange={(v) => setEffects({ petalsDensity: v })} />
        <Toggle label="Hiện dần khi cuộn (scroll reveal)" value={content.effects.revealAnimation} onChange={(v) => setEffects({ revealAnimation: v })} />
        <Toggle label="Hiệu ứng parallax cho ảnh lớn" value={content.effects.parallax} onChange={(v) => setEffects({ parallax: v })} />
      </Card>
    </>
  );
}

function ThemeTab({ content, update }) {
  const setTheme = (patch) => update({ theme: { ...content.theme, ...patch } });
  const setMeta = (patch) => update({ meta: { ...content.meta, ...patch } });

  const setLayout = (patch) => update({ layout: { ...content.layout, ...patch } });

  const presets = [
    { name: 'Đỏ đô (Figma)', primary: '#511419', primaryDark: '#3B0E12', accent: '#B58B2F', background: '#FFF7EB', surface: '#ECE4D8' },
    { name: 'Xanh rêu', primary: '#3F5D4B', primaryDark: '#2B4033', accent: '#C2A878', background: '#F7F5EF', surface: '#FBFAF5' },
    { name: 'Nâu trầm', primary: '#5B3C2E', primaryDark: '#3E281E', accent: '#C9A227', background: '#FAF3E9', surface: '#FDF8F0' },
    { name: 'Hồng pastel', primary: '#8E4257', primaryDark: '#6A2E3E', accent: '#D8A7B1', background: '#FDF4F3', surface: '#FFF9F8' }
  ];

  return (
    <>
      <Card title="Bảng màu" desc="Đổi màu chủ đạo của toàn bộ thiệp.">
        <div className="a-presets">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              className="a-preset"
              onClick={() => setTheme(p)}
              style={{ '--p': p.primary, '--a': p.accent, '--b': p.background }}
            >
              <span className="a-preset-swatch" />
              {p.name}
            </button>
          ))}
        </div>

        <div className="a-row">
          <Color label="Màu chính" value={content.theme.primary} onChange={(v) => setTheme({ primary: v })} />
          <Color label="Màu chính (đậm)" value={content.theme.primaryDark} onChange={(v) => setTheme({ primaryDark: v })} />
        </div>
        <div className="a-row">
          <Color label="Màu nhấn" value={content.theme.accent} onChange={(v) => setTheme({ accent: v })} />
          <Color label="Màu nền" value={content.theme.background} onChange={(v) => setTheme({ background: v })} />
        </div>
        <div className="a-row">
          <Color label="Màu chữ" value={content.theme.text} onChange={(v) => setTheme({ text: v })} />
          <Color label="Màu chữ phụ" value={content.theme.muted} onChange={(v) => setTheme({ muted: v })} />
        </div>
        <Color label="Màu card sáng (trên nền đỏ)" value={content.theme.surface} onChange={(v) => setTheme({ surface: v })} />
      </Card>

      <Card title="Khổ giấy" desc="Bản Figma: cột giấy 900px căn giữa, panel đỏ 560px bên trong.">
        <Range
          label="Bề rộng cột thiệp"
          value={content.layout?.pageWidth ?? 900}
          min={480}
          max={1100}
          step={10}
          suffix="px"
          onChange={(v) => setLayout({ pageWidth: v })}
        />
        <Range
          label="Bề rộng panel đỏ"
          value={content.layout?.panelWidth ?? 560}
          min={360}
          max={800}
          step={10}
          suffix="px"
          onChange={(v) => setLayout({ panelWidth: v })}
        />
        <Color label="Màu nền hai bên" value={content.layout?.outerBackground} onChange={(v) => setLayout({ outerBackground: v })} />
      </Card>

      <Card title="Chân trang" desc="Dòng chữ cuối thiệp (Figma chỉ có một dòng duy nhất).">
        <TextArea
          label="Dòng chân trang"
          rows={2}
          value={content.layout?.footerNote}
          onChange={(v) => setLayout({ footerNote: v })}
        />
        <Toggle
          label="Hiện tên đôi ở chân trang"
          value={content.layout?.showFooterNames}
          onChange={(v) => setLayout({ showFooterNames: v })}
          hint="Bản Figma không có dòng này"
        />
      </Card>

      <Card title="Phông chữ" desc="Dùng tên font đã nạp trong index.html hoặc thêm font Google Fonts mới vào đó.">
        <Text label="Font tiêu đề" value={content.theme.headingFont} onChange={(v) => setTheme({ headingFont: v })} />
        <Text label="Font chữ viết tay" value={content.theme.scriptFont} onChange={(v) => setTheme({ scriptFont: v })} />
        <Text label="Font nội dung" value={content.theme.bodyFont} onChange={(v) => setTheme({ bodyFont: v })} />
      </Card>

      <Card title="Thông tin chia sẻ" desc="Tiêu đề và mô tả khi gửi link thiệp qua Zalo, Facebook...">
        <Text label="Tiêu đề trang" value={content.meta.title} onChange={(v) => setMeta({ title: v })} />
        <TextArea label="Mô tả" rows={2} value={content.meta.description} onChange={(v) => setMeta({ description: v })} />
        <MediaPicker label="Ảnh chia sẻ" value={content.meta.ogImage} onChange={(v) => setMeta({ ogImage: v })} />
      </Card>
    </>
  );
}

function BackupTab({ setContent, setMessage }) {
  const fileRef = useRef(null);

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      await importData(json);
      const fresh = await fetchContent();
      setContent(fresh);
      setMessage('Đã khôi phục dữ liệu');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const onReset = async () => {
    if (!confirm('Khôi phục toàn bộ nội dung về mẫu mặc định? Nội dung hiện tại sẽ mất.')) return;
    const fresh = await resetContent();
    setContent(fresh);
    setMessage('Đã khôi phục nội dung mẫu');
  };

  return (
    <Card title="Sao lưu & khôi phục" desc="Tải file JSON chứa toàn bộ nội dung, danh sách khách và lời chúc.">
      <div className="a-actions">
        <a className="a-btn" href={exportUrl()} download>Tải file sao lưu</a>
        <button type="button" className="a-btn" onClick={() => fileRef.current?.click()}>Khôi phục từ file</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
        <button type="button" className="a-btn a-btn-danger" onClick={onReset}>Về nội dung mẫu</button>
      </div>
    </Card>
  );
}
