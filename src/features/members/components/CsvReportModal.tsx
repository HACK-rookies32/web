import { useEffect, useState } from 'react';
import { Button, Modal, Spinner, useToast } from '@/shared/ui';
import { downloadCsv, formatDate, maskName } from '@/shared/lib/format';
import { useAuth } from '@/shared/auth/AuthContext';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { fetchMemberReportCsv } from '../api';
import type { MemberDetail } from '../types';
import { DownloadGlyph } from './Glyphs';
import './CsvReportModal.css';

interface CsvReportModalProps {
  open: boolean;
  member: MemberDetail;
  onClose: () => void;
}

type Phase = 'idle' | 'generating' | 'done' | 'error';

/**
 * 회원 리포트 CSV 생성 모달 (Figma 131:5397 / 131:4580).
 *
 * 확정 결정에 따라 리포트는 독립 페이지 없이 이 모달로만 제공한다.
 * 생성 → 완료 → 다운로드 + 토스트 순으로 진행된다.
 */
export function CsvReportModal({ open, member, onClose }: CsvReportModalProps) {
  const toast = useToast();
  const { session } = useAuth();
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

  const filename = `member-report_${member.memberId}_${formatDate(new Date().toISOString())}.csv`;

  async function generate() {
    setPhase('generating');
    try {
      const result = await fetchMemberReportCsv({
        member,
        adminUsername: session?.username ?? 'unknown',
      });
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
    toast.success(
      'CSV 리포트를 내려받았습니다',
      `${maskName(member.name)} 회원의 리포트가 저장되었습니다.`,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="회원 리포트 CSV 다운로드"
      description="이 회원의 기본 정보 · 기기 · 지갑 · 문의 요약을 CSV 파일로 만듭니다."
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
              <dt>대상 회원</dt>
              <dd>{maskName(member.name)}</dd>
            </div>
            <div className="csv-modal__row">
              <dt>포함 항목</dt>
              <dd>기본 정보, 연결 자녀, 등록 기기, 지갑 잔액, 문의 요약</dd>
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
