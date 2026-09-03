import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import { logout } from '@/features/auth/api';
import { NAV_ITEMS, ROLE_LABEL } from '@/shared/lib/constants';
import logoMark from '@/assets/brand/logo-mark.png';
import { ThemeSwitch } from './ThemeSwitch';
import './Topbar.css';

const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/members\/[^/]+$/, title: '회원 상세' },
];

function resolveTitle(pathname: string): string {
  const extra = EXTRA_TITLES.find((t) => t.match.test(pathname));
  if (extra) return extra.title;
  const item = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((nav) => (nav.to === '/' ? pathname === '/' : pathname.startsWith(nav.to)));
  return item?.label ?? '시스템 관리';
}

/** 시안 A — 전폭 컨텍스트 바: 브랜드 + 현재 페이지 제목 + 프로필. 이동 메뉴는 없다. */
export function Topbar() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = resolveTitle(pathname);

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand" aria-label="홈으로">
        <img className="topbar__logo" src={logoMark} alt="" width={28} height={28} />
      </Link>

      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__right">
        <div className="topbar__profile">
          <button
            type="button"
            className="topbar__profile-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="topbar__avatar" aria-hidden="true">
              <Icon name="user" />
            </span>
            <span className="topbar__profile-text">
              <span className="topbar__name">{session?.displayName ?? '-'}</span>
              <span className="topbar__role">{session ? ROLE_LABEL[session.role] : ''}</span>
            </span>
          </button>

          {menuOpen ? (
            <div className="topbar__menu" role="menu">
              <ThemeSwitch />
              <div className="topbar__menu-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="topbar__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  void logout().finally(() => {
                    signOut();
                    navigate('/login', { replace: true });
                  });
                }}
              >
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
