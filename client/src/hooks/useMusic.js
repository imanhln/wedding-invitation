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

        // YouTube thay thế chính thẻ được truyền vào bằng <iframe>, nên tạo một
        // thẻ con "dùng một lần" để React không phải quản lý node đã bị thay.
        const holder = document.createElement('div');
        hostRef.current.appendChild(holder);

        ytRef.current = new YT.Player(holder, {
          videoId: source.id,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: source.id // bắt buộc để loop=1 có tác dụng với 1 video
          },
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
