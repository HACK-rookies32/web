import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, SearchInput } from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import { ROLE_LABEL } from '@/shared/lib/constants';
import './Topbar.css';

interface TopbarProps {
  title: string;
  onToggleSidebar: () => void;
  /** 읽지 않은 알림 수. 0 이면 점을 표시하지 않는다. */
  unreadCount?: number;
}

/**
 * 상단바 (Figma Header 131:3771).
 * 높이 64px, 반투명 배경 + backdrop-blur, 오른쪽에 검색·알림·프로필.
 */
export function Topbar({ title, onToggleSidebar, unreadCount = 0 }: TopbarProps) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(value: string) {
    setKeyword(value);
    if (value.trim()) navigate(`/members?keyword=${encodeURIComponent(value.trim())}`);
  }

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
        <SearchInput
          className="topbar__search"
          shape="pill"
          value={keyword}
          onSearch={handleSearch}
          debounceMs={0}
          aria-label="전체 검색"
        />

        <button type="button" className="topbar__icon-btn topbar__bell" aria-label={`알림 ${unreadCount}건`}>
          <Icon name="bell" />
          {unreadCount > 0 ? <span className="topbar__dot" aria-hidden="true" /> : null}
        </button>

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
