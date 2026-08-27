import { useEffect, useState, type FormEvent } from 'react';
import { Button, FormField, Modal, Select, TextArea, TextInput } from '@/shared/ui';
import type { BroadcastRequest, BroadcastType } from '../types';

interface BroadcastModalProps {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: BroadcastRequest) => void;
}

const TYPE_OPTIONS: { value: BroadcastType; label: string }[] = [
  { value: 'MAINTENANCE', label: '점검 안내' },
  { value: 'UPDATE', label: '업데이트 안내' },
  { value: 'NOTICE', label: '일반 공지' },
  { value: 'EVENT', label: '이벤트' },
];

/**
 * 전체 알림 발송 모달 (POST /admin/notifications/broadcast).
 *
 * 전 회원에게 푸시가 나가고 되돌릴 수 없으므로, 발송 직전에 한 번 더
 * 명시적으로 확인하도록 2단계로 나눴다.
 */
export function BroadcastModal({ open, submitting, onClose, onSubmit }: BroadcastModalProps) {
  const [type, setType] = useState<BroadcastType>('MAINTENANCE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType('MAINTENANCE');
    setTitle('');
    setBody('');
    setConfirming(false);
    setError(null);
  }, [open]);

  function handleNext(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('알림 제목을 입력해 주세요.');
      return;
    }
    if (!body.trim()) {
      setError('알림 내용을 입력해 주세요.');
      return;
    }
    setError(null);
    setConfirming(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={confirming ? '전체 알림을 발송할까요?' : '전체 알림 발송'}
      description={
        confirming
          ? '모든 회원에게 즉시 푸시가 전송되며 취소할 수 없습니다.'
          : '점검·업데이트 등 전 회원에게 보낼 푸시 알림을 작성합니다.'
      }
      footer={
        confirming ? (
          <>
            <Button onClick={() => setConfirming(false)} disabled={submitting}>
              돌아가기
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              onClick={() => onSubmit({ type, title: title.trim(), body: body.trim() })}
            >
              발송
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>취소</Button>
            <Button variant="primary" onClick={handleNext}>
              다음
            </Button>
          </>
        )
      }
    >
      {confirming ? (
        <div className="broadcast-preview">
          <p className="broadcast-preview__label">발송 미리보기</p>
          <div className="broadcast-preview__card">
            <span className="broadcast-preview__type">
              {TYPE_OPTIONS.find((t) => t.value === type)?.label}
            </span>
            <strong className="broadcast-preview__title">{title}</strong>
            <span className="broadcast-preview__body">{body}</span>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleNext}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <FormField label="알림 유형">
            {(p) => (
              <Select {...p} value={type} onChange={(e) => setType(e.target.value as BroadcastType)}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="제목" required>
            {(p) => (
              <TextInput
                {...p}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 점검 안내"
              />
            )}
          </FormField>

          <FormField label="내용" required error={error}>
            {(p) => (
              <TextArea
                {...p}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="예: 8월 27일 02:00~05:00 서버 점검이 진행됩니다."
                style={{ minHeight: 96 }}
              />
            )}
          </FormField>
        </form>
      )}
    </Modal>
  );
}
