import { useEffect, useState } from 'react';
import { api, CATEGORY_EMOJI, CATEGORY_LABEL, type CategoryInfo } from './api';

// Categories are loaded once after login: the shared label/emoji maps are filled in place, custom colors
// become CSS rules (.cat-<id> { --cc } and --c-<id>), and components using useCategories() re-render.

const BUILTIN_ORDER = ['recovery', 'desk', 'yoga', 'pilates', 'calisthenics', 'surf'];
let current: CategoryInfo[] = BUILTIN_ORDER.map((id) => ({ id, label: CATEGORY_LABEL[id], emoji: CATEGORY_EMOJI[id], color: null, builtin: true, programs: 0 }));
const bus = new EventTarget();

function apply(list: CategoryInfo[]) {
  current = list;
  for (const c of list) {
    CATEGORY_LABEL[c.id] = c.label;
    CATEGORY_EMOJI[c.id] = c.emoji;
  }
  let style = document.getElementById('custom-categories') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-categories';
    document.head.appendChild(style);
  }
  style.textContent = list.filter((c) => c.color && /^#[0-9a-f]{6}$/i.test(c.color))
    .map((c) => `:root{--c-${c.id}:${c.color}} .cat-${c.id}{--cc:${c.color}}`).join('\n');
  bus.dispatchEvent(new Event('change'));
}

export async function reloadCategories() {
  try { apply(await api.categories()); } catch { /* offline: keep the built-in ones */ }
  return current;
}

export const categoryList = () => current;
/** Category ids in display order; `forPrograms` drops the desk breaks (reserved). */
export const categoryIds = (forPrograms = false) => current.map((c) => c.id).filter((id) => !forPrograms || id !== 'desk');
export const catLabel = (id: string | null | undefined) => (id ? CATEGORY_LABEL[id] || id : '');
export const catEmoji = (id: string | null | undefined) => (id ? CATEGORY_EMOJI[id] || '🏷️' : '🏃');

/** Current categories; re-renders when they change. */
export function useCategories() {
  const [list, setList] = useState(current);
  useEffect(() => {
    const on = () => setList(current);
    bus.addEventListener('change', on);
    return () => bus.removeEventListener('change', on);
  }, []);
  return list;
}
