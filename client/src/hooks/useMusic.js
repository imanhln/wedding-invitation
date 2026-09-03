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
  iframe.setAttribute('allow', 'autoplay; encrypted-media'); // KHÔNG có fullscreen / PiP
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
 */
export default function useMusic(url, volume = 0.6) {
  const source = useMemo(() => parseMusicSource(url), [url]);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);
  const hostRef = useRef(null);
  const ytRef = useRef(null);
  const volumeRef = useRef(volume);
  const wantPlayRef = useRef(false); // bấm mở thiệp khi player YouTube chưa sẵn sàng

  volumeRef.current = volume;

  /* ------------------------ Dựng / huỷ player YouTube ---------------------- */
  useEffect(() => {
    setPlaying(false);
    wantPlayRef.current = false;
    if (source?.type !== 'youtube') return undefined;

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
    if (source?.type !== 'youtube') return undefined;

    const onFullscreen = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      if (!el || !hostRef.current?.contains(el)) return;
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { exit?.call(document); } catch { /* trình duyệt từ chối, bỏ qua */ }
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

    if (source.type === 'page') {
      console.warn('[nhạc] Đây là link trang nghe nhạc, không phải file nhạc nên không phát được:', source.url);
      return;
    }

    if (source.type === 'youtube') {
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
    if (source?.type === 'youtube') ytRef.current?.pauseVideo?.();
    else audioRef.current?.pause();
    setPlaying(false);
  }, [source]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, pause, play]);

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
    available: !!source && source.type !== 'page',
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
