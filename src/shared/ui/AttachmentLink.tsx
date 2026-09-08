import { useState } from 'react';
import { attachmentName, isImageAttachment } from '@/shared/lib/format';
import { Modal } from './Modal';
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
 *
 * 이미지는 새 창으로 튕겨 원본만 덩그러니 띄우면 닫을 방법이 뒤로가기밖에 없다.
 * 그래서 이미지는 화면 안 라이트박스(× 로 닫기)로 열고, 그 외 파일만 링크로 연다.
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
 * [VULN-WEB-03] DOM XSS — URL 스킴 검증 없음.
 *   첨부 경로·문의 링크는 회원이 올린 값이고 서버에 그대로 저장된다. 스킴을
 *   검사하지 않고 그대로 href 에 넣으므로, 회원이 `javascript:fetch('/api/admin/...')`
 *   같은 값을 넣어 두면 관리자가 클릭하는 순간 관리자 세션에서 실행된다(CWE-79).
 *   대응: 같은 출처 절대경로·http·https 만 허용목록으로 통과시켜야 한다.
 */
export function isSafeFileHref(url: string): boolean {
  return url.trim().length > 0;
}

interface AttachmentLinkProps {
  /** 서버가 준 첨부 공개 경로. */
  url: string;
  className?: string;
}

export function AttachmentLink({ url, className }: AttachmentLinkProps) {
  const name = attachmentName(url);
  const [viewing, setViewing] = useState(false);

  const cls = className ? `attachment attachment--link ${className}` : 'attachment attachment--link';

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

  /*
   * 이미지는 화면 안에서 확대해 보고 × 로 닫는다 — 첨부 이미지 뷰어에서 가장
   * 흔한 방식이다. 새 창으로 튕기지 않아 관리자 조사 흐름(현재 목록·필터)을
   * 잃지 않는다. img src 는 javascript: 스킴을 실행하지 않으므로, 위 [VULN-WEB-03]
   * 의 스킴 우회는 이미지가 아닌 첨부·링크의 <a href> 경로에 그대로 남는다.
   */
  if (isImageAttachment(url)) {
    return (
      <>
        <button type="button" className={cls} onClick={() => setViewing(true)} title={name}>
          <PaperclipGlyph />
          <span className="attachment__name">{name}</span>
        </button>
        <Modal
          open={viewing}
          onClose={() => setViewing(false)}
          title={name}
          size="lg"
          footer={
            <a className="attachment__newtab" href={url} target="_blank" rel="noreferrer noopener">
              새 탭에서 열기
            </a>
          }
        >
          <div className="attachment__viewer">
            <img className="attachment__image" src={url} alt={name} />
          </div>
        </Modal>
      </>
    );
  }

  /* 이미지가 아닌 첨부는 새 탭에서 열거나 내려받는다. */
  return (
    <a
      className={cls}
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
