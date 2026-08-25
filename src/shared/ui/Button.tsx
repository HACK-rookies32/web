import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 진행 중 표시. 누르는 동안 자동으로 disabled 된다. */
  loading?: boolean;
  /** 글자 앞/뒤 아이콘 */
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** 가로 폭을 부모에 꽉 채운다 (로그인 버튼 등) */
  block?: boolean;
}

interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * 버튼 클래스 문자열만 만든다.
 *
 * `<button>` 이 아닌 요소에 버튼 모양을 입혀야 할 때 쓴다. 예를 들어 라우터
 * `<Link>` 는 Button 컴포넌트로 감쌀 수 없는데, 그렇다고 버튼 CSS 를 손으로
 * 다시 그리면 Button 을 고칠 때 그쪽만 어긋난다.
 *
 *   <Link className={buttonClass({ variant: 'primary' })} to="...">회원 상세</Link>
 *
 * `<a>` 에 쓸 때 hover 밑줄은 Button.css 의 `a.btn:hover` 가 막아 준다.
 */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  block = false,
  loading = false,
  className,
}: ButtonClassOptions = {}): string {
  return [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    block ? 'btn--block' : '',
    loading ? 'is-loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * 공통 버튼.
 * - primary   : accent 채움 (Figma 131:1991 로그인 버튼)
 * - secondary : 흰 배경 + 테두리 (Figma 131:3757 "환불 처리")
 * - dark      : accent-strong 채움 (Figma "마스킹 해제" 등 강한 권한 액션)
 * - ghost     : 배경 없음, 아이콘 버튼/보조 액션
 * - danger    : 파괴적 액션
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  block = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = buttonClass({ variant, size, block, loading, className });

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={size === 'sm' ? 12 : 14} /> : iconLeft}
      {children ? <span className="btn__label">{children}</span> : null}
      {iconRight}
    </button>
  );
}
