import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseMusicSource } from '../utils.js';

/* --------------------- Nạp YouTube IFrame API một lần --------------------- */
let ytApiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      ytApiPromise = null;
      reject(new Error('Không tải được YouTube IFrame API'));
    };
    document.head.appendChild(script);
  });

  return ytApiPromise;
}

/* ---------------- iframe nhạc: chỉ lấy TIẾNG, chặn toàn màn hình ----------
   `new YT.Player(<div>)` để YouTube tự sinh iframe, và iframe nó sinh ra LUÔN
   có `allowfullscreen` + `allow="...picture-in-picture"`. Trên điện thoại,
   trình duyệt dùng ngay quyền đó để đẩy video lên toàn màn hình khi bấm play —
   khách bấm "Mở thiệp" thì thấy video YouTube, phải tắt mới thấy thiệp.

   Quyền toàn màn hình của iframe được chốt lúc iframe TẢI, gỡ thuộc tính sau
   đó là vô tác dụng. Nên ta tự tạo iframe (không allowfullscreen, `allow` chỉ
   xin autoplay) rồi gắn YT.Player vào iframe có sẵn — API vẫn điều khiển được
   nhờ `enablejsapi=1`. */

function createAudioIframe(videoId) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    autoplay: '0',
    controls: '0',
    disablekb: '1',
    fs: '0', // ẩn nút toàn màn hình trong player
    modestbranding: '1',
    rel: '0',
    playsinline: '1', // iOS: phát trong trang, không nhảy player hệ thống
    iv_load_policy: '3',
    loop: '1',
    playlist: videoId, // bắt buộc để loop=1 có tác dụng với 1 video
    origin: window.location.origin
  });

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?${params}`;
  iframe.title = 'Nhạc nền';
  iframe.tabIndex = -1;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('frameborder', '0');
  // Permissions Policy: chỉ xin quyền tự phát, và CHẶN THẲNG toàn màn hình lẫn
  // picture-in-picture thay vì chỉ "không xin" — trình duyệt nào coi mặc định
  // là được phép thì vẫn bị chặn.
  iframe.allowFullscreen = false;
  iframe.setAttribute('allow', "autoplay; encrypted-media; fullscreen 'none'; picture-in-picture 'none'");

  /* Hộp cát: iframe không được mở tab mới, không được đổi địa chỉ trang cha, và
     không được gọi trình phát ngoài (app YouTube). Đây là đường còn lại khiến
     khách đang xem thiệp bỗng nhảy sang video. `allow-scripts allow-same-origin`
     là mức tối thiểu để player YouTube + enablejsapi còn chạy được; hai quyền
     này chỉ áp cho chính origin youtube.com nên không nới lỏng gì cho trang mình. */
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  return iframe;
}

/**
 * Nhạc nền cho thiệp — nhận cả file .mp3 lẫn link YouTube.
 *
 * Trả về refs để trang gắn vào DOM:
 *   audioRef -> thẻ <audio> (nguồn là file)
 *   hostRef  -> ô chứa iframe YouTube ẩn (nguồn là YouTube)
 *
 * Lưu ý: trình duyệt chỉ cho phát nhạc có tiếng khi xuất phát từ thao tác của
 * khách, nên play() luôn được gọi trong sự kiện bấm nút "Mở thiệp".
 *
 * `meta` ({ title, artist, artwork }) là tên bài hiện trên màn hình khoá —
 * xem khối "Giữ nhạc chạy khi khách tắt màn hình" bên dưới.
 */
export default function useMusic(url, volume = 0.6, meta = {}) {
  const source = useMemo(() => parseMusicSource(url), [url]);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);
  const hostRef = useRef(null);
  const ytRef = useRef(null);
  const volumeRef = useRef(volume);
  const wantPlayRef = useRef(false); // bấm mở thiệp khi player YouTube chưa sẵn sàng
  const wantPlayingRef = useRef(false); // khách MUỐN nghe nhạc hay đã tự tắt
  const fsEscapesRef = useRef(0); // số lần phải đạp video YouTube ra khỏi toàn màn hình

  volumeRef.current = volume;

  /* ------------------------ Dựng / huỷ player YouTube ---------------------- */
  useEffect(() => {
    setPlaying(false);
    wantPlayRef.current = false;
    fsEscapesRef.current = 0;
    if (source?.type !== 'youtube' || source.blocked) return undefined;

    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;

        // Iframe tự tạo (xem createAudioIframe) — React không quản lý node này,
        // hàm dọn dẹp bên dưới sẽ xoá cả ô chứa.
        const iframe = createAudioIframe(source.id);
        hostRef.current.appendChild(iframe);

        ytRef.current = new YT.Player(iframe, {
          events: {
            onReady: (e) => {
              e.target.setVolume(Math.round(volumeRef.current * 100));
              if (wantPlayRef.current) {
                wantPlayRef.current = false;
                e.target.playVideo();
              }
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
              else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) setPlaying(false);
            },
            onError: () => setPlaying(false)
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      try { ytRef.current?.destroy?.(); } catch { /* iframe đã bị gỡ */ }
      ytRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
  }, [source?.type, source?.id]);

  /* --------------------- Chốt chặn cuối: thoát toàn màn hình ----------------
     Nếu trình duyệt nào vẫn cố đẩy iframe nhạc lên toàn màn hình thì thoát
     ngay, để khách thấy thiệp chứ không phải video YouTube. */
  useEffect(() => {
    if (source?.type !== 'youtube' || source.blocked) return undefined;

    const onFullscreen = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      if (!el || !hostRef.current?.contains(el)) return;
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { exit?.call(document); } catch { /* trình duyệt từ chối, bỏ qua */ }

      /* Có máy đẩy lại toàn màn hình ngay sau khi thoát. Dừng nhạc một nhịp rồi
         phát tiếp: video mất chỗ bám, khách vẫn ở lại thiệp và vẫn có nhạc.
         Nếu máy cứ đẩy lại (2 lần) thì thôi hẳn nhạc — thà im lặng còn hơn để
         video nhấp nháy đè lên thiệp; khách muốn nghe thì bấm nút nhạc. */
      const player = ytRef.current;
      try { player?.pauseVideo?.(); } catch { /* player đã huỷ */ }
      setPlaying(false);

      fsEscapesRef.current += 1;
      if (fsEscapesRef.current > 2 || !wantPlayingRef.current) return;
      setTimeout(() => {
        try { ytRef.current?.playVideo?.(); } catch { /* player đã huỷ */ }
      }, 250);
    };

    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
    };
  }, [source?.type]);

  /* ------------------------------- Âm lượng -------------------------------- */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    ytRef.current?.setVolume?.(Math.round(volume * 100));
  }, [volume, source?.url]);

  /* --------------------------------- Điều khiển ---------------------------- */
  const play = useCallback(() => {
    if (!source) return;
    wantPlayingRef.current = true;
    fsEscapesRef.current = 0;

    if (source.type === 'page') {
      console.warn('[nhạc] Đây là link trang nghe nhạc, không phải file nhạc nên không phát được:', source.url);
      return;
    }

    if (source.type === 'youtube') {
      // Máy bung video toàn màn hình (iPhone mở từ Zalo) — xem youtubeAudioBlocked().
      if (source.blocked) return;
      const player = ytRef.current;
      if (player?.playVideo) {
        player.setVolume(Math.round(volumeRef.current * 100));
        player.playVideo();
      } else {
        wantPlayRef.current = true; // sẽ tự phát ngay khi player sẵn sàng
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volumeRef.current;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [source]);

  const pause = useCallback(() => {
    wantPlayRef.current = false;
    wantPlayingRef.current = false;
    if (source?.type === 'youtube') ytRef.current?.pauseVideo?.();
    else audioRef.current?.pause();
    setPlaying(false);
  }, [source]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, pause, play]);

  /* ------------- Giữ nhạc chạy khi khách tắt màn hình / chuyển app ---------
     Điện thoại chỉ cho một trang chạy nhạc dưới nền khi nó đăng ký được một
     "phiên phát nhạc" với hệ điều hành — tức là có TÊN BÀI để hiện lên màn
     hình khoá. Trang nào chỉ gọi audio.play() suông thì iOS/Android coi là
     tiếng phụ của trang web và cắt ngay khi màn hình tắt. Khai báo
     mediaSession.metadata + hai nút play/pause là đủ để đổi cách hệ điều hành
     nhìn nhận, và khách còn điều khiển được nhạc ngay trên màn hình khoá.

     Chỉ áp dụng cho nguồn FILE. Nhạc YouTube nằm trong iframe của youtube.com,
     phiên phát nhạc thuộc về iframe đó chứ không thuộc trang mình, nên không
     có cách nào giữ nó chạy khi tắt màn hình — phải dùng file .mp3.        */
  const { title: metaTitle, artist: metaArtist, artwork: metaArtwork } = meta;

  useEffect(() => {
    const ms = navigator.mediaSession;
    if (!ms || source?.type !== 'file') return undefined;

    if (window.MediaMetadata) {
      ms.metadata = new window.MediaMetadata({
        title: metaTitle || 'Nhạc nền',
        artist: metaArtist || '',
        artwork: metaArtwork ? [{ src: metaArtwork, sizes: '512x512' }] : []
      });
    }

    // Nút play/pause trên màn hình khoá và tai nghe.
    const actions = [['play', play], ['pause', pause]];
    for (const [name, fn] of actions) {
      try { ms.setActionHandler(name, fn); } catch { /* máy không hỗ trợ nút này */ }
    }

    return () => {
      for (const [name] of actions) {
        try { ms.setActionHandler(name, null); } catch { /* bỏ qua */ }
      }
      ms.metadata = null;
    };
  }, [source?.type, metaTitle, metaArtist, metaArtwork, play, pause]);

  // Cho hệ điều hành biết đang phát hay đang dừng, để icon trên màn hình khoá đúng.
  useEffect(() => {
    if (navigator.mediaSession) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playing]);

  /* Lưới an toàn: máy nào vẫn cắt nhạc lúc tắt màn hình thì nối lại ngay khi
     khách mở lại trang, thay vì bắt bấm nút nhạc lần nữa. Chỉ nối khi khách
     chưa tự tắt nhạc — `wantPlayingRef`. */
  useEffect(() => {
    if (source?.type !== 'file') return undefined;

    const resume = () => {
      if (document.visibilityState !== 'visible' || !wantPlayingRef.current) return;
      const audio = audioRef.current;
      if (audio?.paused) audio.play().catch(() => { /* máy chặn, chờ khách bấm */ });
    };

    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [source?.type]);

  const onAudioError = useCallback(() => {
    setPlaying(false);
    console.warn(
      '[nhạc] Không phát được link này — trình duyệt cần file nhạc (.mp3, .m4a...) ' +
        'hoặc một link YouTube, không phải link trang nghe nhạc:',
      source?.url
    );
  }, [source]);

  return {
    source,
    available: !!source && source.type !== 'page' && !source.blocked,
    playing,
    play,
    pause,
    toggle,
    audioRef,
    hostRef,
    onAudioError,
    setPlaying
  };
}
