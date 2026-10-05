import type { Animation } from './animCore';

/** Category id: a built-in one ('desk', 'recovery', 'yoga', 'pilates', 'calisthenics', 'surf') or one you created. */
export type Category = string;

export interface CategoryInfo { id: string; label: string; emoji: string; color: string | null; builtin: boolean; programs: number }

export interface Exercise {
  id: string;
  name: string;
  searchTerm?: string;
  categories: string[];
  targets: string[];
  position?: string;
  perSide?: boolean;
  equipment?: string[];
  description: string;
  cues?: string[];
  easier?: string;
  harder?: string;
  caution?: string;
  source?: string;
  animation?: Animation | null;
  video?: string | null;
}

export interface ProgramSummary {
  id: string;
  title: string;
  category: Category;
  kind: 'program' | 'collection' | 'external';
  level: string;
  summary: string;
  weeks: number;
  sessionsPerWeek: number;
  equipment: string[];
  minutes: number;
  source: string;
}

export interface Item { exercise: string; duration?: number; reps?: number; sets?: number; rest?: number; note?: string }
export interface Block { title?: string; rounds?: number; restBetweenRounds?: number; items: Item[] }
export interface Session {
  id: string;
  title: string;
  focus?: string;
  intro?: string;
  blocks: Block[];
  minutes: number;
  exercises: { id: string; name: string }[];
}

export interface ProgramDetail {
  id: string;
  title: string;
  category: Category;
  kind: 'program' | 'collection' | 'external';
  url?: string;
  minutes?: number;
  level?: string;
  summary?: string;
  description?: string;
  goals?: string[];
  equipment?: string[];
  suggestedDays?: number[];
  sources?: { title: string; url: string }[];
  sessions: Session[];
  schedule?: { week: number; sessions: string[]; note?: string; adjust?: Record<string, number> }[];
  source: string;
}

export interface Step {
  kind: 'work' | 'rest';
  exercise?: string;
  name?: string;
  mode?: 'time' | 'reps';
  duration: number | null;
  reps?: number | null;
  secPerRep?: number;
  set?: number;
  sets?: number;
  round?: number;
  rounds?: number;
  block: string;
  note?: string;
  side?: string | null;
  label?: string;
}

export interface Playable {
  program: { id: string; title: string; category: Category };
  session: { id: string; title: string; focus: string; intro: string };
  week: number;
  weekNote: string;
  seconds: number;
  steps: Step[];
  exercises: Record<string, Exercise>;
  external: { url: string; site: string; embed: string | null; youtube: { videoId?: string; playlistId?: string; index?: number } | null; minutes: number; attachment: (Attachment & { page: number | null }) | null } | null;
}

/** File the user downloaded from the author's site (PDF or poster), shown unchanged. scope '_' = whole program. */
export interface Attachment { scope: string; mime: string; name: string; size: number; firstPage: number | null; updatedAt: string; url: string }

/** Sites with free workouts to link as external programs. */
export const DAREBEE_URL = 'https://darebee.com/programs.html';

export interface PlanSession {
  id: string;
  planId: string;
  programId: string;
  programTitle: string;
  category: Category | null;
  sessionId: string;
  title: string;
  week: number;
  weeks: number | null;
  date: string;
  time: string;
  durationMin: number;
  synced: boolean;
  done: boolean;
  url: string;
}

export interface Plan {
  id: string;
  programId: string;
  programTitle: string;
  category: Category | null;
  startDate: string;
  days: number[];
  time: string;
  reminderMinutes: number | null;
  calendaryStatus: string | null;
  createdAt: string;
  total: number;
  done: number;
  sessions: PlanSession[];
}

export type BreakStatus = 'pending' | 'sent' | 'done' | 'skipped' | 'missed';
export interface Break {
  id: string;
  date: string;
  plannedAt: string;
  dueAt: string;
  status: BreakStatus;
  postponed: number;
  sessionId: string;
  title: string;
  url: string;
}

export interface BreakSettings {
  enabled: boolean;
  days: number[];
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
  count: number;
  skipBusy: boolean;
  sessionReminder: number;
}

export interface LogEntry {
  id: string;
  programId: string;
  sessionId: string;
  title: string;
  category: Category;
  planSessionId: string | null;
  breakId: string | null;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  completion: number;
  effort: number | null;
  note: string;
}

export interface Stats {
  streak: number;
  week: { week: string; minutes: number; sessions: number; byCategory: Record<string, number> };
  weeks: { week: string; minutes: number; sessions: number; byCategory: Record<string, number> }[];
  total: { n: number; s: number };
  breaksToday: { done: number; total: number };
}

export interface Today {
  date: string;
  sessionsToday: PlanSession[];
  upcoming: PlanSession[];
  breaks: Break[];
  breakSettings: BreakSettings;
  paused: boolean;
  stats: Stats;
  recent: LogEntry[];
  proposal: { id: string; title: string; summary: string } | null;
}

export interface GenSettings {
  auto: boolean;
  goals: string;
  maxMinutes: number;
  sessionsPerWeek: number;
  categories: Category[];
}

export interface Proposal {
  id: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  engine: 'ai' | 'rules';
  model: string | null;
  request: string;
  rationale: string;
  warnings: string[];
  program: ProgramDetail;
}

export interface GeneratorState {
  ai: boolean;
  model: string;
  settings: GenSettings;
  nearEnd: { programId: string; done: number; total: number; avgEffort: number | null; adherence: number | null }[];
  proposals: Proposal[];
}

export interface PlaylistInfo {
  playlistId: string;
  title: string | null;
  url: string;
  apiKey: boolean;
  videos: { index: number; videoId: string; title: string; minutes: number | null; thumbnail: string | null }[];
}

/** youtube-nocookie embed for a video/playlist link (client side, for exercise videos). */
export function youtubeEmbed(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    let v: string | null = null;
    if (host === 'youtu.be') v = u.pathname.slice(1);
    else if (u.pathname === '/watch') v = u.searchParams.get('v');
    else v = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || null;
    const list = u.searchParams.get('list');
    if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) || (!v && !list)) return null;
    const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
    if (list) q.set('list', list);
    return v && v !== 'videoseries' ? `https://www.youtube-nocookie.com/embed/${v}?${q}` : `https://www.youtube-nocookie.com/embed/videoseries?${q}`;
  } catch {
    return null;
  }
}

export interface PlanInput { startDate: string; days: number[]; time: string; reminderMinutes: number | null }

export interface Status {
  version: string;
  publicUrl: string;
  calendaryPublicUrl: string;
  suite: boolean;
  calendary: { ok: boolean; configured: boolean; message: string };
  homeAssistant: { ok: boolean; configured: boolean; message: string; notifyServices?: string[] };
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('moveo:unauthorized'));
    throw new ApiError((data as { error?: string })?.error || res.statusText, res.status);
  }
  return data as T;
}

const get = <T,>(p: string) => request<T>('GET', p);
const post = <T,>(p: string, b: unknown = {}) => request<T>('POST', p, b);

async function upload<T>(path: string, file: File): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(file.name) },
    body: file,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || res.statusText, res.status);
  return data as T;
}

export const api = {
  session: () => get<{ authenticated: boolean; authConfigured: boolean }>('/session'),
  login: (password: string) => post<{ ok: boolean }>('/login', { password }),
  logout: () => post('/logout'),

  programs: () => get<ProgramSummary[]>('/programs'),
  program: (id: string) => get<ProgramDetail>(`/programs/${id}`),
  updateProgram: (id: string, patch: { title?: string; category?: string }) => request<ProgramDetail>('PATCH', `/programs/${id}`, patch),
  categories: () => get<CategoryInfo[]>('/categories'),
  createCategory: (c: { label: string; emoji?: string; color?: string }) => post<CategoryInfo>('/categories', c),
  updateCategory: (id: string, c: { label?: string; emoji?: string; color?: string }) => request<CategoryInfo>('PATCH', `/categories/${id}`, c),
  deleteCategory: (id: string) => request<{ ok: boolean }>('DELETE', `/categories/${id}`),
  attachments: (id: string) => get<Attachment[]>(`/programs/${id}/attachments`),
  uploadAttachment: (id: string, scope: string, file: File, firstPage?: number) =>
    upload<Attachment>(`/programs/${id}/attachments/${scope}${firstPage ? `?firstPage=${firstPage}` : ''}`, file),
  setFirstPage: (id: string, firstPage: number) => request<Attachment>('PATCH', `/programs/${id}/attachments/_`, { firstPage }),
  removeAttachment: (id: string, scope: string) => request<{ ok: boolean }>('DELETE', `/programs/${id}/attachments/${scope}`),
  deleteProgram: (id: string) => request('DELETE', `/programs/${id}`),
  exercises: () => get<Exercise[]>('/exercises'),
  play: (programId: string, sessionId: string, week = 1) => get<Playable>(`/play/${programId}/${sessionId}?w=${week}`),
  importContent: (payload: unknown) => post<{ exercises: number; skippedExercises: number; programs: { id: string; title: string }[] }>('/import', payload),

  today: () => get<Today>('/today'),
  plans: () => get<Plan[]>('/plans'),
  createPlan: (input: { programId: string; startDate: string; days: number[]; time: string; reminderMinutes: number | null }) => post<Plan>('/plans', input),
  previewPlan: (input: { programId: string; startDate: string; days: number[] }) =>
    post<{ perWeek: number; dates: { week: number; sessionId: string; date: string }[] }>('/plans/preview', input),
  syncPlan: (id: string) => post<Plan>(`/plans/${id}/sync`),
  deletePlan: (id: string) => request<{ ok: boolean; calendary: { deleted?: number; error?: string } | null }>('DELETE', `/plans/${id}`),

  breakSettings: () => get<BreakSettings>('/breaks/settings'),
  saveBreakSettings: (s: Partial<BreakSettings>) => request<BreakSettings>('PUT', '/breaks/settings', s),
  pauseToday: (paused: boolean) => post('/breaks/pause-today', { paused }),
  snoozeBreak: (id: string, minutes = 10) => post<Break>(`/breaks/${id}/snooze`, { minutes }),
  skipBreak: (id: string) => post<Break>(`/breaks/${id}/skip`),
  testNotification: () => post<{ channel: string; ok: boolean; error?: string; sent?: number }[]>('/breaks/test'),

  logs: () => get<LogEntry[]>('/logs'),
  addLog: (input: Record<string, unknown>) => post<LogEntry>('/logs', input),
  deleteLog: (id: string) => request('DELETE', `/logs/${id}`),
  stats: () => get<Stats>('/stats'),

  generator: () => get<GeneratorState>('/generator'),
  saveGenSettings: (s: Partial<GenSettings>) => request<GenSettings>('PUT', '/generator/settings', s),
  propose: (input: { request?: string; engine?: 'auto' | 'rules' }) => post<Proposal>('/generator/propose', input),
  approveProposal: (id: string, plan: PlanInput | null) => post<{ proposal: Proposal; plan: Plan | null }>(`/generator/proposals/${id}/approve`, plan || {}),
  rejectProposal: (id: string) => post<Proposal>(`/generator/proposals/${id}/reject`),
  setExerciseVideo: (id: string, url: string) => request<Exercise>('PUT', `/exercises/${id}/video`, { url }),
  resolvePlaylist: (url: string) => post<PlaylistInfo>('/youtube/resolve', { url }),
  createFromPlaylist: (input: { url: string; title: string; category: Category; perWeek: number; weeks: number; minutes: number;
    videos: { index: number; videoId?: string | null; title: string; minutes?: number | null }[] }) => post<ProgramDetail>('/youtube/program', input),
  addExternal: (input: { title: string; url: string; category: Category; days: number; perWeek: number; minutes: number; notes?: string }) =>
    post<ProgramDetail>('/external', input),
  status: () => get<Status>('/status'),
  suiteLink: (next: string) => post<{ url: string }>('/suite/link', { next }),
};

// ------------------------------------------------------------------ helpers

// Filled with the built-in categories and then, at login, with the ones you created (see categories.ts).
export const CATEGORY_LABEL: Record<string, string> = {
  desk: 'Scrivania',
  recovery: 'Recupero',
  yoga: 'Yoga',
  pilates: 'Pilates',
  calisthenics: 'Calisthenics',
  surf: 'Surf',
};

export const CATEGORY_EMOJI: Record<string, string> = {
  desk: '🪑', recovery: '🌿', yoga: '🧘', pilates: '⭕', calisthenics: '💪', surf: '🏄',
};

export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

export const fmtDay = (d: string | Date) => dayFmt.format(typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00`) : d);
export const fmtShort = (d: string | Date) => shortFmt.format(typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00`) : d);
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

export function relativeDay(date: string) {
  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 86400e3));
  if (date === today) return 'Oggi';
  if (date === tomorrow) return 'Domani';
  const s = fmtShort(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

export const youtubeSearch = (ex: Pick<Exercise, 'searchTerm' | 'name'>) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.searchTerm || ex.name)}`;
