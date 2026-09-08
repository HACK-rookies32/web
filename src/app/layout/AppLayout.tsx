import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingBlock } from '@/shared/ui';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

/**
 * 시안 A — 사이드바 중심. 상단은 전폭 컨텍스트 바(브랜드·제목·프로필)로 항상 보이고,
 * 좌측은 아이콘 레일(유일 이동 수단)이 그 아래에 온다. 레일은 호버하면 라벨까지
 * 펼쳐지며 콘텐츠 위로 겹친다(레이아웃이 밀리지 않는다).
 */
export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="app-layout">
      <Topbar />
      <Sidebar />

      <main className="app-layout__main">
        <div className="app-layout__content">
          <RouteErrorBoundary resetKey={pathname}>
            <Suspense fallback={<LoadingBlock label="화면을 불러오는 중" />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </div>
      </main>
    </div>
  );
}
