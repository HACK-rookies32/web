import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import './AuditDatePicker.css';

interface AuditDatePickerProps {
  id: string;
  value: string;
  min: string;
  max: string;
  describedBy?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}

export function AuditDatePicker({
  id,
  value,
  min,
  max,
  describedBy,
  invalid,
  onChange,
}: AuditDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function isValidDate(next: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return false;
    const [year, month, day] = next.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day
      && next >= min
      && next <= max;
  }

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // 자동화 환경처럼 showPicker가 제한되는 경우 기본 클릭으로 폴백한다.
      }
    }

    input.click();
  }

  function handlePickerChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDraft(next);
    onChange(next);
  }

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDraft(next);
    if (!next) {
      onChange('');
    } else if (isValidDate(next)) {
      onChange(next);
    }
  }

  function clearDate() {
    setDraft('');
    onChange('');
  }

  return (
    <div className="control audit-date-picker" aria-invalid={invalid || undefined}>
      <input
        id={id}
        className="audit-date-picker__text"
        type="text"
        inputMode="numeric"
        value={draft}
        placeholder="YYYY-MM-DD"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        maxLength={10}
        onChange={handleTextChange}
        onBlur={() => {
          if (draft && !isValidDate(draft)) setDraft(value);
        }}
      />

      {draft ? (
        <button
          className="audit-date-picker__button"
          type="button"
          aria-label="선택한 날짜 지우기"
          onClick={clearDate}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      <button
        className="audit-date-picker__button"
        type="button"
        aria-label="달력에서 날짜 선택"
        onClick={openPicker}
      >
        <svg className="audit-date-picker__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2v3M17 2v3M3.5 9h17M5.5 4h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        </svg>
      </button>

      <input
        ref={inputRef}
        className="audit-date-picker__native"
        type="date"
        value={value}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handlePickerChange}
      />
    </div>
  );
}
