import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/shared/lib/types';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  /** 접근 가능한 역할. 생략하면 인증만 확인한다. */
  roles?: Role[];
}

/**
 * 라우트 가드.
 * - 미인증 → /login (원래 가려던 경로를 state 로 넘겨 로그인 후 복귀시킨다)
 * - 권한 부족 → / (대시보드)
 *
 * ⚠️ 이 가드는 UX 용이다. 실제 접근 통제는 서버가 담당한다.
 *    주소창에 직접 URL 을 쳐서 들어오는 것을 막는 정도의 의미만 있다.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
