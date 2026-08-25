import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  FormField,
  LoadingBlock,
  StatusPill,
  TextArea,
} from '@/shared/ui';
import { formatDateTime, maskName } from '@/shared/lib/format';
import { inquiryStatus } from '@/shared/lib/status';
import { fetchInquiry, inquiryKeys } from '../api';
import './InquiryDetailPanel.css';

interface InquiryDetailPanelProps {
  inquiryId: number;
  submitting: boolean;
  deleting: boolean;
  /** 세 핸들러 모두 완료를 기다릴 수 있도록 Promise 를 돌려준다. */
  onCreateAnswer: (content: string) => Promise<unknown>;
  onUpdateAnswer: (content: string) => Promise<unknown>;
  onDeleteAnswer: () => Promise<unknown>;
}

/**
 * 문의 상세 + 답변 작성/수정/삭제.
 *
 * 답변이 없으면 작성 폼을, 있으면 답변 내용과 수정/삭제 버튼을 보여준다.
 * (명세상 답변이 이미 있는데 POST 로 등록하면 409 이므로 화면에서도 분기한다)
 */
export function InquiryDetailPanel({
  inquiryId,
  submitting,
  deleting,
  onCreateAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
}: InquiryDetailPanelProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: inquiryKeys.detail(inquiryId),
    queryFn: () => fetchInquiry(inquiryId),
  });

  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다른 문의를 열면 입력 상태를 초기화한다.
  useEffect(() => {
    setDraft('');
    setEditing(false);
    setError(null);
  }, [inquiryId]);

  if (isPending) return <LoadingBlock label="문의를 불러오는 중" />;
  if (isError || !data) return <EmptyState tone="error" title="문의를 불러오지 못했습니다" />;

  const status = inquiryStatus(data.answered);

  /** 저장이 끝난 뒤에야 편집 모드를 닫는다. 실패하면 입력을 그대로 남긴다. */
  async function submit(mode: 'create' | 'update') {
    if (!draft.trim()) {
      setError('답변 내용을 입력해 주세요.');
      return;
    }
    setError(null);

    try {
      if (mode === 'create') await onCreateAnswer(draft.trim());
      else await onUpdateAnswer(draft.trim());
      setDraft('');
      setEditing(false);
    } catch {
      // 실패 토스트는 호출부에서 띄운다. 입력값은 보존한다.
    }
  }

  /** 삭제 후에는 다시 작성 폼이 보이므로 입력값을 비워 둔다. */
  async function removeAnswer() {
    try {
      await onDeleteAnswer();
      setDraft('');
      setEditing(false);
    } catch {
      /* 실패 토스트는 호출부에서 띄운다. */
    }
  }

  return (
    <>
      {/* ---- 문의 본문 ---- */}
      <section className="inquiry-panel__section">
        <div className="inquiry-panel__head">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <span className="inquiry-panel__meta">{formatDateTime(data.createdAt)}</span>
        </div>

        <h3 className="inquiry-panel__title">{data.title}</h3>

        <p className="inquiry-panel__author">
          작성자 {maskName(data.memberNickname)} ·{' '}
          <Link to={`/members/${data.memberId}`}>회원 상세</Link>
        </p>

        <p className="inquiry-panel__body">{data.content}</p>

        {data.attachmentUrl || data.linkUrl ? (
          <ul className="inquiry-panel__attachments">
            {data.attachmentUrl ? <li>첨부: {data.attachmentUrl}</li> : null}
            {data.linkUrl ? (
              <li>
                링크:{' '}
                <a href={data.linkUrl} target="_blank" rel="noreferrer noopener">
                  {data.linkUrl}
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}
      </section>

      {/* ---- 답변 ---- */}
      <section className="inquiry-panel__section">
        <h3 className="inquiry-panel__heading">답변</h3>

        {data.answer && !editing ? (
          <>
            <div className="inquiry-panel__answer">
              <p className="inquiry-panel__body">{data.answer.content}</p>
              <p className="inquiry-panel__meta">
                등록 {formatDateTime(data.answer.createdAt)}
                {data.answer.updatedAt !== data.answer.createdAt
                  ? ` · 수정 ${formatDateTime(data.answer.updatedAt)}`
                  : ''}
              </p>
            </div>

            <div className="inquiry-panel__actions">
              <Button
                onClick={() => {
                  setDraft(data.answer?.content ?? '');
                  setEditing(true);
                }}
              >
                답변 수정
              </Button>
              <Button variant="danger" loading={deleting} onClick={() => void removeAnswer()}>
                답변 삭제
              </Button>
            </div>
          </>
        ) : (
          <>
            <FormField label={data.answer ? '답변 수정' : '답변 작성'} required error={error}>
              {(p) => (
                <TextArea
                  {...p}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="회원에게 전달할 답변을 입력하세요."
                />
              )}
            </FormField>

            <div className="inquiry-panel__actions">
              {data.answer ? (
                <Button
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  취소
                </Button>
              ) : null}
              <Button
                variant="primary"
                loading={submitting}
                onClick={() => void submit(data.answer ? 'update' : 'create')}
              >
                {data.answer ? '수정 저장' : '답변 등록'}
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
