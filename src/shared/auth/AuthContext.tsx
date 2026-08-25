import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '@/shared/lib/types';
import { AUTH_STORAGE_KEY } from '@/shared/lib/constants';

/**
 * 관리자 인증 상태.
 *
 * ⚠️ 이 컨텍스트의 역할 검사는 어디까지나 UX 용이다. 메뉴/버튼을 숨겨 오조작을 줄일 뿐,
 *    실제 접근 통제는 서버(Spring Security)가 담당한다. 프론트 가드만 믿고
 *    권한 검사를 서버에서 빼면 안 된다.
 */

export interface Session {
  token: string;
  username: string;
  /** 표시용 이름. 목 로그인에서는 username 을 그대로 쓴다. */
  displayName: string;
  role: Role;
}

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  /** 주어진 역할 중 하나라도 해당하면 true. roles 가 없으면 인증만으로 통과. */
  hasRole: (roles?: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.token || !parsed.role || !parsed.username) return null;
    return {
      token: parsed.token,
      username: parsed.username,
      displayName: parsed.displayName ?? parsed.username,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const signIn = useCallback((next: Session) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (roles?: Role[]) => {
      if (!session) return false;
      if (!roles || roles.length === 0) return true;
      return roles.includes(session.role);
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ session, isAuthenticated: session !== null, signIn, signOut, hasRole }),
    [session, signIn, signOut, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

/** 역할 검사만 필요할 때 쓰는 얇은 훅. */
export function useRole(roles?: Role[]): boolean {
  return useAuth().hasRole(roles);
}
