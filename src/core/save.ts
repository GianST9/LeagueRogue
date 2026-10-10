// localStorage persistence for the Conquest meta-progression. Storage can be missing or blocked, so every access is guarded.

import { newMeta, sanitizeMeta, type MetaState } from '../systems/meta';

const META_KEY = 'leaguerogue.meta.v1';

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? sanitizeMeta(JSON.parse(raw)) : newMeta();
  } catch {
    return newMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Progress just won't persist this session.
  }
}
