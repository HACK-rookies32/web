import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, FormField, Icon, TextInput } from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import { ROLE_OPTIONS } from '@/shared/lib/constants';
import type { Role } from '@/shared/lib/types';
import logoLogin from '@/assets/brand/logo-login.png';
import { login } from '../api';
import './LoginPage.css';

interface LocationState {
  from?: { pathname: string };
}

/**
 * 관리자 로그인 (Figma 131:1957).
 *
 * Figma 시안에는 없지만 핸드오프 문서 7번 요구에 따라 데모용 역할 선택을 추가했다.
 * 백엔드 연동 후에는 서버가 내려주는 role 을 쓰므로 이 블록만 제거하면 된다.
 */
export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState('admin01');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('SUPER_ADMIN');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!loginId.trim()) {
      setError('아이디를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await login({ loginId: loginId.trim(), password, role });
      signIn({
        token: result.token,
        username: result.username,
        displayName: result.username,
        role: result.role,
      });

      const from = (location.state as LocationState | null)?.from?.pathname;
      navigate(from ?? '/', { replace: true });
    } catch {
      setError('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      {/* Figma 131:1960 — 배경 장식. 화면 의미는 없으므로 aria 에서 제외한다. */}
      <div className="login__decor" aria-hidden="true">
        <span className="login__blob login__blob--top" />
        <span className="login__blob login__blob--bottom" />
      </div>

      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__header">
          <img className="login__logo" src={logoLogin} alt="" width={64} height={64} />
          <h1 className="login__title">아동보호 행정시스템</h1>
          <p className="login__subtitle">승인된 관리자만 접근 가능합니다.</p>
        </div>

        <div className="login__form">
          <FormField label="아이디">
            {(p) => (
              <div className="login__control">
                <Icon name="user-line" className="login__control-icon" />
                <TextInput
                  {...p}
                  className="login__input"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="관리자 아이디를 입력하세요"
                  autoComplete="username"
                />
              </div>
            )}
          </FormField>

          <FormField label="비밀번호">
            {(p) => (
              <div className="login__control">
                <Icon name="lock" className="login__control-icon" />
                <TextInput
                  {...p}
                  className="login__input login__input--password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login__reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  aria-pressed={showPassword}
                >
                  <Icon name="eye" />
                </button>
              </div>
            )}
          </FormField>

          {/* --- 데모 전용: 역할 선택 --- */}
          <fieldset className="login__roles">
            <legend className="login__roles-legend">
              데모 역할 <span className="login__roles-note">(백엔드 연동 전 임시)</span>
            </legend>
            <div className="login__roles-grid">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={role === opt.value ? 'login__role is-selected' : 'login__role'}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                  />
                  <span className="login__role-label">{opt.label}</span>
                  <span className="login__role-hint">{opt.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="login__error" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={submitting}
            iconRight={submitting ? undefined : <Icon name="arrow-right" />}
          >
            로그인
          </Button>
        </div>

        <div className="login__links">
          <button type="button" className="login__link">
            비밀번호 찾기
          </button>
        </div>

        <p className="login__badge">
          <Icon name="shield" />
          본 시스템은 권한이 부여된 사용자만 접근할 수 있습니다.
        </p>
      </form>
    </div>
  );
}
