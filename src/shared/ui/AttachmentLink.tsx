import { attachmentName } from '@/shared/lib/format';
import './AttachmentLink.css';

/**
 * 첨부파일 링크.
 *
 * 공지·1:1 문의·커뮤니티가 모두 같은 모양의 값(`attachments[]`)을 받는다.
 * 서버가 말하는 "첨부 공개 경로" 로, 인증 없이 열리는 `/api/files/{category}/{filename}`
 * 형태다(S3 모드에서는 서명 URL 로 302 전환된다).
 *
 * 화면마다 따로 그리면 아래 두 가지가 어긋난다 — 그래서 공용 계층에 둔다.
 *   1. 저장된 경로를 그대로 노출할지, 파일명만 보여줄지
 *   2. 어떤 스킴을 클릭 가능하게 열어 줄지
 */

function PaperclipGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M10.5 6.2 6.3 10.4a2.4 2.4 0 0 1-3.4-3.4l4.2-4.2a1.6 1.6 0 0 1 2.3 2.3L5.2 9.3a.8.8 0 0 1-1.1-1.1l3.6-3.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 링크로 열어도 되는 주소인지 판별한다.
 *
 * 첨부 경로는 **회원이 올린 파일에서 나온 값**이고 서버에 그대로 저장된다.
 * 그 문자열을 검사 없이 href 에 넣으면 `javascript:` 스킴이 저장돼 있을 때
 * 관리자가 클릭하는 순간 관리자 세션에서 실행된다(저장형 XSS, CWE-79).
 *
 * 그래서 **허용 목록 방식**으로 좁힌다.
 *   - `/api/files/...` 같은 같은 출처의 절대 경로
 *   - http · https 로 시작하는 절대 URL
 * 그 밖(`javascript:` · `data:` · `vbscript:` · 스킴 없는 상대 경로)은 링크로 만들지
 * 않고 텍스트로만 보여준다.
 */
export function isSafeFileHref(url: string): boolean {
  const value = url.trim();

  /* 같은 출처의 절대 경로. `//evil.com` 은 프로토콜 상대 URL 이라 제외한다. */
  if (value.startsWith('/') && !value.startsWith('//')) return true;

  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    /* URL 로 파싱되지 않으면 주소로 볼 수 없다. */
    return false;
  }
}

interface AttachmentLinkProps {
  /** 서버가 준 첨부 공개 경로. */
  url: string;
  className?: string;
}

export function AttachmentLink({ url, className }: AttachmentLinkProps) {
  const name = attachmentName(url);

  /*
   * 열 수 없는 주소는 링크로 만들지 않는다. 그렇다고 감추지도 않는다 —
   * 첨부가 있었다는 사실 자체는 조사에 필요하고, 관리자가 원본 값을 보고
   * 이상한 경로임을 알아챌 수 있어야 한다.
   */
  if (!isSafeFileHref(url)) {
    return (
      <span className={className ? `attachment ${className}` : 'attachment'} title={url}>
        <PaperclipGlyph />
        <span className="attachment__name">{name}</span>
        <span className="attachment__blocked">열 수 없는 주소</span>
      </span>
    );
  }

  return (
    <a
      className={className ? `attachment attachment--link ${className}` : 'attachment attachment--link'}
      href={url}
      /* 같은 출처(/api/files/...)라 download 가 그대로 먹는다. 302 면 브라우저가 따라간다. */
      download={name}
      title={name}
      target="_blank"
      rel="noreferrer noopener"
    >
      <PaperclipGlyph />
      <span className="attachment__name">{name}</span>
    </a>
  );
}
