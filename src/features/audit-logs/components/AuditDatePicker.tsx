import { useRef, type ChangeEvent } from 'react';
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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className="audit-date-picker">
      <button
        id={id}
        className="control audit-date-picker__trigger"
        type="button"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        onClick={openPicker}
      >
        <span className={value ? undefined : 'audit-date-picker__placeholder'}>
          {value || '날짜 선택'}
        </span>
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
        onChange={handleChange}
      />
    </div>
  );
}
