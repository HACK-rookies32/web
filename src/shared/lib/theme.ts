import { THEME_STORAGE_KEY } from './constants';

/**
 * 화면 테마 설정.
 *
 * 실제 색 전환은 전부 CSS 가 한다 (`shared/styles/tokens.css`).
 *   - `<html data-theme="light">` → 라이트
 *   - `<html data-theme="dark">`  → 다크
 *
 * OS 설정을 따라가는 선택지는 두지 않는다. 관리자가 고른 값만 반영하므로
 * `data-theme` 는 항상 붙어 있고, 저장값이 없으면 라이트로 시작한다.
 */
export type ThemePreference = 'light' | 'dark';

export const DEFAULT_THEME: ThemePreference = 'light';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

/** 저장된 설정을 읽는다. 없거나 값이 이상하면 라이트. */
export function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : DEFAULT_THEME;
  } catch {
    /* 시크릿 모드 등 localStorage 접근이 막힌 환경 */
    return DEFAULT_THEME;
  }
}

/** `<html>` 에 반영하고 저장한다. */
export function applyThemePreference(preference: ThemePreference): void {
  document.documentElement.setAttribute('data-theme', preference);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* 저장에 실패해도 화면 전환은 이미 끝났으므로 그대로 둔다 (새로고침하면 초기화됨). */
  }
}
