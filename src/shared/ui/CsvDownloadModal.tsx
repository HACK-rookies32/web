import { useEffect, useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { useToast } from './Toast';
import { downloadCsv, formatDate } from '@/shared/lib/format';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import './CsvDownloadModal.css';

export function DownloadGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 1.5v7.5m0 0 2.75-2.75M7 9 4.25 6.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1.75 11.5h10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface CsvDownloadModalProps {
  open: boolean;
  /** 모달 제목 (예: "회원 목록 CSV 다운로드") */
  title: string;
  /** 다운로드 대상 요약 (예: "전체 회원 1,204명") */
  targetLabel: string;
  /** CSV 에 담기는 컬럼을 사람이 읽을 수 있게 나열한 문자열 */
  columnsLabel: string;
  /** 파일명 앞부분. 날짜와 확장자는 이 컴포넌트가 붙인다. */
  filenamePrefix: string;
  /** CSV 본문을 만들어 오는 함수. 감사 로그 적재는 이 안에서 한다. */
  fetchCsv: () => Promise<string>;
  /** 다운로드 완료 토스트의 보조 문구 */
  successDescription: string;
  onClose: () => void;
}

type Phase = 'idle' | 'generating' | 'done' | 'error';

/**
 * CSV 생성 · 다운로드 모달 (명세 5.7).
 *
 * 생성 → 완료 → 다운로드 + 토스트 순으로 진행된다. 내려받는 행위 자체가
 * 감사 대상(REPORT_DOWNLOAD)이라 완료 후 감사 로그를 동기화한다.
 */
export function CsvDownloadModal({
  open,
  title,
  targetLabel,
  columnsLabel,
  filenamePrefix,
  fetchCsv,
  successDescription,
  onClose,
}: CsvDownloadModalProps) {
  const toast = useToast();
  const syncAuditLog = useAuditLogSync();
  const [phase, setPhase] = useState<Phase>('idle');
  const [csv, setCsv] = useState<string | null>(null);

  // 모달을 다시 열면 처음 상태로 되돌린다.
  useEffect(() => {
    if (open) {
      setPhase('idle');
      setCsv(null);
    }
  }, [open]);

  const filename = `${filenamePrefix}_${formatDate(new Date().toISOString())}.csv`;

  async function generate() {
    setPhase('generating');
    try {
      const result = await fetchCsv();
      setCsv(result);
      setPhase('done');
      // 리포트 생성은 감사 대상 활동(REPORT_DOWNLOAD)이다.
      syncAuditLog();
    } catch {
      setPhase('error');
    }
  }

  function download() {
    if (!csv) return;
    downloadCsv(filename, csv);
    onClose();
    toast.success(`${title.replace(' 다운로드', '')} 를 내려받았습니다`, successDescription);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="CSV 파일을 만듭니다. 내려받은 기록은 감사 로그에 남습니다."
      footer={
        <>
          <Button onClick={onClose} disabled={phase === 'generating'}>
            {phase === 'done' ? '닫기' : '취소'}
          </Button>
          {phase === 'done' ? (
            <Button variant="primary" iconLeft={<DownloadGlyph />} onClick={download}>
              다운로드
            </Button>
          ) : (
            <Button variant="primary" loading={phase === 'generating'} onClick={() => void generate()}>
              리포트 생성
            </Button>
          )}
        </>
      }
    >
      <div className="csv-modal">
        {phase === 'generating' ? (
          <div className="csv-modal__state">
            <Spinner size={28} label="리포트 생성 중" />
            <p className="csv-modal__text">리포트를 생성하고 있습니다...</p>
          </div>
        ) : phase === 'done' ? (
          <div className="csv-modal__state">
            <span className="csv-modal__check" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="m5.5 11.5 3.5 3.5 7.5-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="csv-modal__text">리포트 생성이 완료되었습니다.</p>
            <p className="csv-modal__filename">{filename}</p>
          </div>
        ) : phase === 'error' ? (
          <div className="csv-modal__state">
            <p className="csv-modal__error" role="alert">
              리포트 생성에 실패했습니다. 다시 시도해 주세요.
            </p>
          </div>
        ) : (
          <dl className="csv-modal__preview">
            <div className="csv-modal__row">
              <dt>대상</dt>
              <dd>{targetLabel}</dd>
            </div>
            <div className="csv-modal__row">
              <dt>포함 항목</dt>
              <dd>{columnsLabel}</dd>
            </div>
            <div className="csv-modal__row">
              <dt>파일명</dt>
              <dd className="csv-modal__filename">{filename}</dd>
            </div>
          </dl>
        )}
      </div>
    </Modal>
  );
}
