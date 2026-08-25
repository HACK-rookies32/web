import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import './FormField.css';

interface FormFieldProps {
  label: ReactNode;
  /** 입력 컨트롤. id/aria 연결을 위해 render prop 형태로 받는다. */
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
}

/** 라벨 + 컨트롤 + 힌트/에러를 한 묶음으로 묶고 aria 연결까지 처리한다. */
export function FormField({ label, children, hint, error, required }: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="field__required" aria-hidden="true"> *</span> : null}
      </label>

      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}

      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- 기본 컨트롤 ---- */

/** Figma 로그인 입력(131:1975): bg, 1px border, radius 8, padding 13/17. */
export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={['control', className ?? ''].filter(Boolean).join(' ')} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={['control', 'control--area', className ?? ''].filter(Boolean).join(' ')} {...rest} />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={['control', 'control--select', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </select>
  );
}

/* ----------------------------------------------------------- 토글 ------- */

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** 공지 "모바일 노출" 같은 on/off 스위치. */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={disabled ? 'toggle is-disabled' : 'toggle'}>
      <input
        className="toggle__input sr-only"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {description ? <span className="toggle__description">{description}</span> : null}
      </span>
    </label>
  );
}
