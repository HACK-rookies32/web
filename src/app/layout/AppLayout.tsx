import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingBlock } from '@/shared/ui';
import { NAV_ITEMS } from '@/shared/lib/constants';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

/** 사이드바에 없는 상세 화면의 상단바 제목. */
const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/members\/[^/]+$/, title: '회원 상세' },
];

function resolveTitle(pathname: string): string {
  const extra = EXTRA_TITLES.find((t) => t.match.test(pathname));
  if (extra) return extra.title;

  // 가장 구체적인(긴) 경로가 먼저 잡히도록 정렬해 비교한다.
  const item = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((nav) => (nav.to === '/' ? pathname === '/' : pathname.startsWith(nav.to)));

  return item?.label ?? '시스템 관리';
}

/** 좌측 사이드바 + 상단바 + 콘텐츠의 전역 셸. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className={collapsed ? 'app-layout is-collapsed' : 'app-layout'}>
      <Sidebar collapsed={collapsed} />
      <Topbar title={resolveTitle(pathname)} onToggleSidebar={() => setCollapsed((v) => !v)} unreadCount={3} />

      <main className="app-layout__main">
        <div className="app-layout__content">
          <Suspense fallback={<LoadingBlock label="화면을 불러오는 중" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
