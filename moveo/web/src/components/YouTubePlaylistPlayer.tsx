import { useEffect, useRef } from 'react';

// Plays the n-th video of a playlist. Embed URLs can't pick a start index, the IFrame API can
// (cuePlaylist, zero-based): used when the playlist was read without a YouTube API key.

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<any> | null = null;
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ||= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return apiPromise;
}

export function YouTubePlaylistPlayer({ playlistId, index, title, onStart }: {
  playlistId: string; index: number; title: string; onStart?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let player: any;
    let cancelled = false;
    loadApi().then((YT) => {
      if (cancelled || !host.current) return;
      const el = document.createElement('div');
      host.current.innerHTML = '';
      host.current.appendChild(el);
      player = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => player.cuePlaylist({ listType: 'playlist', list: playlistId, index: Math.max(0, index - 1) }),
          onStateChange: (e: { data: number }) => { if (e.data === 1) onStart?.(); },
        },
      });
    });
    return () => {
      cancelled = true;
      try { player?.destroy(); } catch { /* already gone */ }
    };
  }, [playlistId, index, onStart]);
  return <div className="video-frame" style={{ width: 'min(960px, 92vw)', alignSelf: 'center' }}><div ref={host} title={title} style={{ position: 'absolute', inset: 0 }} /></div>;
}
