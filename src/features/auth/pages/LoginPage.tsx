import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, FormField, Icon, TextInput } from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import logoLogin from '@/assets/brand/logo-login.png';
import { login } from '../api';
import './LoginPage.css';

interface LocationState {
  from?: { pathname: string };
}

/**
 * 관리자 로그인 (Figma 131:1957).
 *
 * 역할은 서버가 응답으로 내려준다. 백엔드 연동 전 임시로 두었던 데모용 역할
 * 선택 블록은 연동이 끝나 제거했다 — 화면에서 역할을 고를 수 있으면 그 자체가
 * 권한을 클라이언트가 정하는 것처럼 보인다.
 *
 * 비밀번호에는 보기 토글을 두지 않는다. 관리자 콘솔은 공용 PC 나 화면 공유
 * 환경에서 열리는 일이 있어, 입력한 값이 평문으로 화면에 남을 수 있는 경로를
 * 두지 않는다.
 */
export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
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
      const result = await login({ loginId: loginId.trim(), password });
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
                  className="login__input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
              </div>
            )}
          </FormField>

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


        <p className="login__badge">
          <Icon name="shield" />
          본 시스템은 권한이 부여된 사용자만 접근할 수 있습니다.
        </p>
      </form>
    </div>
  );
}
