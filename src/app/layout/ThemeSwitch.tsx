import { useState } from 'react';
import {
  THEME_OPTIONS,
  applyThemePreference,
  readThemePreference,
  type ThemePreference,
} from '@/shared/lib/theme';

/** 선택된 항목에 붙는 체크 표시. 아이콘 에셋에 체크가 없어 직접 그린다. */
function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 화면 테마 3단 전환 (라이트 / 다크 / 시스템 설정).
 *
 * 상단바 프로필 메뉴 안에 들어가므로 `role="menuitemradio"` 로 그린다.
 * 첫 페인트 전 적용은 `index.html` 의 인라인 스크립트가 담당한다 —
 * 여기서는 이미 반영된 상태를 초기값으로 읽기만 하면 된다.
 */
export function ThemeSwitch() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  function select(next: ThemePreference) {
    applyThemePreference(next);
    setPreference(next);
  }

  return (
    <div className="theme-switch" role="group" aria-label="화면 테마">
      <p className="theme-switch__label">화면 테마</p>
      {THEME_OPTIONS.map((option) => {
        const selected = option.value === preference;
        return (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            className={`topbar__menu-item theme-switch__item${selected ? ' is-selected' : ''}`}
            onClick={() => select(option.value)}
          >
            <span>{option.label}</span>
            {selected ? <CheckGlyph /> : null}
          </button>
        );
      })}
    </div>
  );
}
