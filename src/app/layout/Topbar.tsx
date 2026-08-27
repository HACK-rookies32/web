import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import { ROLE_LABEL } from '@/shared/lib/constants';
import { ThemeSwitch } from './ThemeSwitch';
import './Topbar.css';

interface TopbarProps {
  title: string;
  onToggleSidebar: () => void;
}

/**
 * 상단바 (Figma Header 131:3771).
 * 높이 64px, 반투명 배경 + backdrop-blur, 오른쪽에 테마·프로필.
 */
export function Topbar({ title, onToggleSidebar }: TopbarProps) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);


  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__icon-btn"
          onClick={onToggleSidebar}
          aria-label="사이드바 접기/펼치기"
        >
          <Icon name="menu" />
        </button>
        <h1 className="topbar__title">{title}</h1>
      </div>

      <div className="topbar__right">

        <div className="topbar__profile">
          <button
            type="button"
            className="topbar__profile-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="topbar__profile-text">
              <span className="topbar__name">{session?.displayName ?? '-'}</span>
              <span className="topbar__role">{session ? ROLE_LABEL[session.role] : ''}</span>
            </span>
            <span className="topbar__avatar" aria-hidden="true">
              <Icon name="user" />
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
                  signOut();
                  navigate('/login', { replace: true });
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
