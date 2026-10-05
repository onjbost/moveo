import { config } from './config.js';
import { httpError } from './util.js';

// YouTube: links of videos/playlists, privacy-friendly embeds (youtube-nocookie.com) and,
// with an optional API key, the list of videos of a playlist (titles and durations).

const ID = /^[A-Za-z0-9_-]{6,64}$/;

/** { videoId?, playlistId?, index?, start? } from any YouTube link, or null. */
export function parseYouTube(raw) {
  let u;
  try {
    u = new URL(String(raw || '').trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
  let videoId = null;
  if (host === 'youtu.be') videoId = u.pathname.slice(1).split('/')[0];
  else if (u.pathname === '/watch') videoId = u.searchParams.get('v');
  else {
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
    if (m && m[1] !== 'videoseries') videoId = m[1];
  }
  const playlistId = u.searchParams.get('list');
  const out = {};
  if (videoId && ID.test(videoId)) out.videoId = videoId;
  if (playlistId && ID.test(playlistId)) out.playlistId = playlistId;
  if (!out.videoId && !out.playlistId) return null;
  const index = Number(u.searchParams.get('index'));
  if (Number.isInteger(index) && index > 0) out.index = index;
  const t = String(u.searchParams.get('t') || u.searchParams.get('start') || '').match(/^(\d+)s?$/);
  if (t) out.start = Number(t[1]);
  return out;
}

/** Embed URL of a video, or of the n-th video (1-based) of a playlist. */
export function embedUrl({ videoId, playlistId, index, start }) {
  const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
  if (start) q.set('start', String(start));
  if (videoId) {
    if (playlistId) q.set('list', playlistId);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${q}`;
  }
  q.set('list', playlistId); // the n-th video is selected by the web player through the IFrame API
  void index;
  return `https://www.youtube-nocookie.com/embed/videoseries?${q}`;
}

export const watchUrl = ({ videoId, playlistId, index }) => (videoId
  ? `https://www.youtube.com/watch?v=${videoId}${playlistId ? `&list=${playlistId}` : ''}`
  : `https://www.youtube.com/playlist?list=${playlistId}${index ? `&index=${index}` : ''}`);

const isoMinutes = (iso) => {
  const m = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  return Math.max(1, Math.round((Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) / 60));
};

async function yt(path, params) {
  const q = new URLSearchParams({ ...params, key: config.youtube.apiKey });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}`, { signal: AbortSignal.timeout(15_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(502, `YouTube: ${data.error?.message || res.status}`);
  return data;
}

/**
 * Playlist details: title and, with youtube_api_key, every video (title, minutes).
 * Without a key the list is empty and the plan is built by hand (number of videos + titles).
 */
export async function resolvePlaylist(url) {
  const p = parseYouTube(url);
  if (!p?.playlistId) throw httpError(400, 'Serve il link di una playlist YouTube (contiene "list=")');
  const out = { playlistId: p.playlistId, title: null, videos: [], apiKey: !!config.youtube.apiKey, url: watchUrl({ playlistId: p.playlistId }) };
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(out.url)}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) out.title = (await res.json()).title || null;
  } catch { /* title is optional */ }
  if (!config.youtube.apiKey) return out;

  let pageToken = '';
  const items = [];
  for (let page = 0; page < 4; page += 1) {
    const data = await yt('playlistItems', { part: 'snippet,contentDetails', maxResults: '50', playlistId: p.playlistId, ...(pageToken ? { pageToken } : {}) });
    items.push(...(data.items || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  const ids = items.map((i) => i.contentDetails?.videoId).filter(Boolean);
  const minutes = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const data = await yt('videos', { part: 'contentDetails', id: ids.slice(i, i + 50).join(',') });
    for (const v of data.items || []) minutes.set(v.id, isoMinutes(v.contentDetails?.duration));
  }
  out.videos = items
    .filter((i) => i.contentDetails?.videoId && i.snippet?.title !== 'Private video' && i.snippet?.title !== 'Deleted video')
    .map((i, n) => ({
      index: n + 1,
      videoId: i.contentDetails.videoId,
      title: i.snippet.title,
      minutes: minutes.get(i.contentDetails.videoId) || null,
      thumbnail: i.snippet.thumbnails?.medium?.url || null,
    }));
  return out;
}
