import { NavLink } from 'react-router-dom';
import { Icon } from '@/shared/ui';
import type { IconName } from '@/shared/ui';
import { NAV_ITEMS, type NavIconName } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import logoMark from '@/assets/brand/logo-mark.png';
import './Sidebar.css';

const NAV_ICON: Record<NavIconName, IconName> = {
  dashboard: 'nav-dashboard',
  members: 'nav-members',
  payments: 'nav-payments',
  notices: 'nav-notices',
  inquiries: 'nav-inquiries',
  community: 'nav-community',
  harmful: 'nav-harmful',
  audit: 'nav-audit',
  admins: 'nav-admins',
};

/**
 * 좌측 사이드바 (Figma Aside 131:3798).
 * 폭 256px, 배경 var(--bg), 활성 메뉴는 accent 채움.
 *
 * 권한이 없는 메뉴는 아예 렌더하지 않는다 (핸드오프 문서 9번).
 */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { hasRole } = useAuth();
  const items = NAV_ITEMS.filter((item) => hasRole(item.roles));

  return (
    <aside className={collapsed ? 'sidebar is-collapsed' : 'sidebar'}>
      <div className="sidebar__brand">
        <img className="sidebar__logo" src={logoMark} alt="" width={32} height={32} />
        <span className="sidebar__brand-text">케어가드 어드민</span>
      </div>

      <nav className="sidebar__nav" aria-label="주요 메뉴">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            // 대시보드(/)만 정확히 일치할 때 활성 처리한다.
            end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'sidebar__link is-active' : 'sidebar__link')}
            title={collapsed ? item.label : undefined}
          >
            <Icon name={NAV_ICON[item.icon]} />
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
