import { useEffect, useMemo, useState } from 'react';
import Cover from './components/Cover.jsx';
import Petals from './components/Petals.jsx';
import MusicButton from './components/MusicButton.jsx';
import { SECTION_COMPONENTS } from './sections/index.js';
import { fetchContent } from './api.js';
import useMusic from './hooks/useMusic.js';
import { guestFromUrl } from './utils.js';

/** Áp theme từ admin vào CSS variables */
function applyTheme(theme, layout = {}) {
  const root = document.documentElement;
  const map = {
    '--page-w': layout.pageWidth ? `${layout.pageWidth}px` : null,
    '--panel-w': layout.panelWidth ? `${layout.panelWidth}px` : null,
    '--c-outer': layout.outerBackground,
    '--c-primary': theme.primary,
    '--c-primary-dark': theme.primaryDark,
    '--c-accent': theme.accent,
    '--c-bg': theme.background,
    '--c-surface': theme.surface,
    '--c-text': theme.text,
    '--c-muted': theme.muted,
    '--f-heading': theme.headingFont,
    '--f-script': theme.scriptFont,
    '--f-body': theme.bodyFont
  };
  for (const [k, v] of Object.entries(map)) if (v) root.style.setProperty(k, v);
}

/** Cập nhật thẻ meta để link chia sẻ hiển thị đẹp trên Zalo/Facebook */
function applyMeta(meta = {}) {
  const set = (selector, attr, value) => {
    if (!value) return;
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const [key, val] = selector.replace(/meta\[|\]|"/g, '').split('=');
      el.setAttribute(key, val);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  if (meta.title) {
    document.title = meta.title;
    set('meta[property="og:title"]', 'content', meta.title);
  }
  set('meta[name="description"]', 'content', meta.description);
  set('meta[property="og:description"]', 'content', meta.description);
  set('meta[property="og:image"]', 'content', meta.ogImage && new URL(meta.ogImage, window.location.origin).href);
}

export default function InvitationPage() {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';

  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(isPreview);
  const [opening, setOpening] = useState(false);

  const guest = guestFromUrl();

  /* ------------------------------ Tải nội dung ----------------------------- */
  useEffect(() => {
    fetchContent().then(setContent).catch((e) => setError(e.message));
  }, []);

  /* --------- Xem trước trực tiếp từ trang quản trị (iframe postMessage) ------ */
  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e) => {
      if (e.data?.type === 'wedding:content') setContent(e.data.content);
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'wedding:preview-ready' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, [isPreview]);

  /* --------------------------------- Theme --------------------------------- */
  useEffect(() => {
    if (!content) return;
    applyTheme(content.theme || {}, content.layout || {});
    applyMeta(content.meta);
  }, [content]);

  /* ----------------------- Khoá cuộn khi chưa mở thiệp ----------------------
     Mở khoá ngay khi bắt đầu mở thiệp (opening), tức cùng lúc nội dung hiện
     ra, chứ không đợi hết 1s — để thanh cuộn xuất hiện trong lúc màn bìa đang
     mờ dần thay vì thành một cú giật riêng sau đó. */
  useEffect(() => {
    const locked = !(opened || opening);
    document.documentElement.classList.toggle('is-scroll-locked', locked);
    return () => document.documentElement.classList.remove('is-scroll-locked');
  }, [opened, opening]);

  /* ---------------------------------- Nhạc --------------------------------- */
  const musicUrl = content?.music?.enabled ? content.music.url : '';

  /* Tên bài + ảnh hiện trên màn hình khoá điện thoại. Không chỉ để đẹp: có
     khai báo thì hệ điều hành mới coi đây là một phiên phát nhạc thật và cho
     chạy tiếp lúc tắt màn hình — xem ghi chú trong useMusic.js. */
  const musicMeta = useMemo(() => {
    const groom = content?.cover?.groomName || content?.couple?.groom?.shortName || '';
    const bride = content?.cover?.brideName || content?.couple?.bride?.shortName || '';
    return {
      title: content?.meta?.title || 'Thiệp cưới',
      artist: groom && bride ? `${groom} & ${bride}` : groom || bride,
      artwork: content?.cover?.photo || content?.cover?.backgroundImage || content?.meta?.ogImage || ''
    };
  }, [content]);

  const music = useMusic(musicUrl, content?.music?.volume ?? 0.6, musicMeta);

  /* ------------------------------- Mở thiệp -------------------------------- */
  const openInvitation = () => {
    setOpening(true);
    if (content?.music?.autoPlayOnOpen) music.play();
    window.scrollTo({ top: 0 });
    setTimeout(() => {
      setOpened(true);
      setOpening(false);
    }, 1000);
  };

  const sections = useMemo(
    () => (content?.sections || []).filter((s) => s.enabled && SECTION_COMPONENTS[s.type]),
    [content]
  );

  if (error) {
    return (
      <div className="page-state">
        <p>Không tải được nội dung thiệp.</p>
        <p className="page-state-sub">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="page-state">
        <span className="loader" aria-hidden="true" />
        <p>Đang mở thiệp...</p>
      </div>
    );
  }

  return (
    <div className="invitation-root">
      {music.source?.type === 'file' && (
        <audio
          ref={music.audioRef}
          src={music.source.url}
          loop
          preload="auto"
          onPlay={() => music.setPlaying(true)}
          onPause={() => music.setPlaying(false)}
          onError={music.onAudioError}
        />
      )}
      {music.source?.type === 'youtube' && !music.source.blocked && <div ref={music.hostRef} className="yt-audio" aria-hidden="true" />}

      {/* Chỉ khởi động sau khi animation vào trang (contentIn 1.1s) chạy xong
          và luồng chính đã rảnh — bật cùng lúc thì trang bị giật. */}
      <Petals
        enabled={content.effects?.petals && opened}
        density={content.effects?.petalsDensity ?? 18}
        color={content.theme?.primary}
        startDelay={1200}
      />

      {!opened && (
        <Cover
          cover={content.cover}
          opening={opening}
          onOpen={openInvitation}
          guestName={guest}
          effects={content.effects}
        />
      )}

      <main className={`invitation ${opened || opening ? "is-open" : "is-hidden"} ${content.effects?.revealAnimation === false ? "no-reveal" : ""}`}>
        {sections.map((section) => {
          const Component = SECTION_COMPONENTS[section.type];
          return (
            <Component
              key={section.id}
              data={section}
              content={content}
              effects={content.effects}
            />
          );
        })}

        {/* Figma node 1:333 — một dòng chân trang duy nhất */}
        <footer className="site-footer">
          {content.layout?.showFooterNames !== false && (
            <span className="site-footer-names">
              {content.cover.groomName} &amp; {content.cover.brideName}
            </span>
          )}
          <span>
            {content.layout?.footerNote
              || 'Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!'}
          </span>
        </footer>
      </main>

      <MusicButton visible={opened && music.available} playing={music.playing} onToggle={music.toggle} />
    </div>
  );
}
