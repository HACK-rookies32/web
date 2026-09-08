import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';
import './SearchPanel.css';

export interface SearchOption {
  value: string;
  label: string;
}

interface SearchPanelProps {
  /**
   * "검색옵션" 줄 — 체크박스 다중 선택. 생략하면 줄을 그리지 않는다.
   * "전체" 체크박스는 항목 전부를 한 번에 켜고 끈다.
   */
  options?: {
    label?: ReactNode;
    items: SearchOption[];
    selected: string[];
    onChange: (values: string[]) => void;
  };
  /** "검색명" 줄 — 현재 검색어. 바깥(필터 초기화 등)에서 바뀌면 입력창도 따라간다. */
  keyword: string;
  onSearch: (keyword: string) => void;
  placeholder?: string;
  searchLabel?: ReactNode;
  'aria-label'?: string;
}

/**
 * CleanPay 식 검색 패널 — 연한 배경 카드에 "검색옵션"(체크박스) 줄과
 * "검색명"(입력 + 검색 버튼) 줄을 쌓는다.
 *
 * 검색은 Enter 나 검색 버튼으로만 실행한다(입력 중 자동 검색 없음). 옵션 체크는 즉시 반영된다.
 */
export function SearchPanel({
  options,
  keyword,
  onSearch,
  placeholder = '검색어를 입력해주세요.',
  searchLabel = '검색명',
  'aria-label': ariaLabel = '검색',
}: SearchPanelProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(keyword);

  useEffect(() => setDraft(keyword), [keyword]);

  const allSelected = options
    ? options.items.length > 0 && options.items.every((item) => options.selected.includes(item.value))
    : false;

  function toggle(value: string) {
    if (!options) return;
    const next = options.selected.includes(value)
      ? options.selected.filter((v) => v !== value)
      : [...options.selected, value];
    options.onChange(next);
  }

  function toggleAll() {
    if (!options) return;
    options.onChange(allSelected ? [] : options.items.map((item) => item.value));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(draft.trim());
  }

  return (
    <div className="search-panel">
      {options ? (
        <div className="search-panel__row">
          <span className="search-panel__label">{options.label ?? '검색옵션'}</span>
          <div className="search-panel__checks" role="group" aria-label="검색 옵션">
            <label className="search-panel__check">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>전체</span>
            </label>
            {options.items.map((item) => (
              <label key={item.value} className="search-panel__check">
                <input
                  type="checkbox"
                  checked={options.selected.includes(item.value)}
                  onChange={() => toggle(item.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <form className="search-panel__row search-panel__row--search" role="search" onSubmit={submit}>
        <label className="search-panel__label" htmlFor={inputId}>
          {searchLabel}
        </label>
        <input
          id={inputId}
          className="control search-panel__input"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        <Button type="submit" variant="dark">
          검색
        </Button>
      </form>
    </div>
  );
}
