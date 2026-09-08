import { NavLink } from 'react-router-dom';
import { Icon } from '@/shared/ui';
import { NAV_ICON, NAV_ITEMS } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import './Sidebar.css';

/**
 * 시안 A — 아이콘 레일(72px). 평소엔 아이콘만, 마우스를 올리면 폭이 늘며 메뉴 이름이
 * 나타난다. 확장은 콘텐츠 위로 겹치므로 본문 레이아웃이 밀리지 않는다.
 * 키보드 포커스(focus-within)로도 펼쳐져 접근성을 지킨다.
 *
 * 권한이 없는 메뉴는 렌더하지 않는다(핸드오프 문서 9번).
 */
export function Sidebar() {
  const { hasRole } = useAuth();
  const items = NAV_ITEMS.filter((item) => hasRole(item.roles));

  return (
    <aside className="rail">
      <nav className="rail__nav" aria-label="주요 메뉴">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'rail__link is-active' : 'rail__link')}
          >
            <span className="rail__icon">
              <Icon name={NAV_ICON[item.icon]} />
            </span>
            <span className="rail__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
