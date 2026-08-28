import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from './Icon';
import './SearchInput.css';

interface SearchInputProps {
  value: string;
  onSearch: (keyword: string) => void;
  placeholder?: string;
  /** 입력 후 자동 검색까지의 지연(ms). 0 이면 Enter 로만 검색한다. */
  debounceMs?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * 검색 입력. 목록 필터용 둥근 사각형 한 가지만 쓴다.
 * (상단바 검색창을 없애면서 알약 모양 변형은 쓸 곳이 사라졌다.)
 */
export function SearchInput({
  value,
  onSearch,
  placeholder = '검색어를 입력하세요...',
  debounceMs = 300,
  className,
  'aria-label': ariaLabel = '검색',
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  // 바깥에서 값이 바뀌면(필터 초기화 등) 입력창도 따라간다.
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (debounceMs <= 0 || draft === value) return;
    const timer = setTimeout(() => onSearch(draft), debounceMs);
    return () => clearTimeout(timer);
    // onSearch 는 호출부에서 useCallback 으로 고정하는 것을 전제로 한다.
  }, [draft, debounceMs, onSearch, value]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch(draft);
  }

  return (
    <form
      className={['search', className ?? ''].filter(Boolean).join(' ')}
      role="search"
      onSubmit={handleSubmit}
    >
      <Icon name="search" className="search__icon" />
      <input
        className="search__input"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </form>
  );
}
