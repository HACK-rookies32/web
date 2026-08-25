import type { ReactNode } from 'react';
import './Tabs.css';

export interface TabItem<K extends string = string> {
  key: K;
  label: ReactNode;
  /** 라벨 옆 건수 배지 */
  count?: number;
}

interface TabsProps<K extends string> {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  'aria-label': string;
  children?: ReactNode;
}

/**
 * 탭. 회원 상세의 기본 정보 / 연결 기기 관리 / 1:1 문의 기록에 쓴다.
 * 선택 상태는 URL 쿼리(?tab=)로 관리하므로 이 컴포넌트는 제어 컴포넌트로 둔다.
 *
 * 좌우 방향키로 탭을 이동할 수 있다 (WAI-ARIA Tabs 패턴).
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
  children,
}: TabsProps<K>) {
  function handleKeyDown(e: React.KeyboardEvent) {
    const index = items.findIndex((t) => t.key === value);
    if (index < 0) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(items[(index + 1) % items.length].key);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(items[(index - 1 + items.length) % items.length].key);
    }
  }

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
        {items.map((tab) => {
          const selected = tab.key === value;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`tabpanel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'tabs__tab is-active' : 'tabs__tab'}
              onClick={() => onChange(tab.key)}
            >
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span className="tabs__count tabular">{tab.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="tabs__panel" role="tabpanel" id={`tabpanel-${value}`} aria-labelledby={`tab-${value}`}>
        {children}
      </div>
    </div>
  );
}
