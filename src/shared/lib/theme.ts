import { THEME_STORAGE_KEY } from './constants';

/**
 * 화면 테마 설정.
 *
 * 실제 색 전환은 전부 CSS 가 한다 (`shared/styles/tokens.css`).
 *   - `<html>` 에 속성 없음        → OS 설정을 따른다 (`prefers-color-scheme`)
 *   - `<html data-theme="dark">`  → 무조건 다크
 *   - `<html data-theme="light">` → OS 가 다크여도 라이트 고정
 *
 * 그래서 여기서는 `data-theme` 속성을 붙이거나 떼는 일만 한다.
 * `system` 은 값을 저장하지 않고 키를 지운다 — 저장돼 있지 않은 상태가 곧 "OS 따름" 이다.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템 설정' },
];

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** 저장된 설정을 읽는다. 없거나 값이 이상하면 `system`. */
export function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    /* 시크릿 모드 등 localStorage 접근이 막힌 환경 */
    return 'system';
  }
}

/** `<html>` 에 반영하고 저장한다. */
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;

  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }

  try {
    if (preference === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    /* 저장에 실패해도 화면 전환은 이미 끝났으므로 그대로 둔다 (새로고침하면 초기화됨). */
  }
}
