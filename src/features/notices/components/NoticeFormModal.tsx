import { useEffect, useState, type FormEvent } from 'react';
import { Button, FormField, Modal, TextArea, TextInput, Toggle } from '@/shared/ui';
import type { NoticeDetail, NoticeRequest } from '../types';

interface NoticeFormModalProps {
  open: boolean;
  /** 수정 대상. null 이면 신규 작성. */
  notice: NoticeDetail | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: NoticeRequest) => void;
}

/** 공지 작성 / 수정 모달. */
export function NoticeFormModal({
  open,
  notice,
  submitting,
  onClose,
  onSubmit,
}: NoticeFormModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState('');
  const [exposeMobile, setExposeMobile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(notice?.title ?? '');
    setContent(notice?.content ?? '');
    setLinks((notice?.links ?? []).join('\n'));
    setExposeMobile(notice?.exposeMobile ?? true);
  }, [open, notice]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!content.trim()) {
      setError('본문을 입력해 주세요.');
      return;
    }

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      links: links
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      exposeMobile,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={notice ? '공지 수정' : '공지 작성'}
      description="모바일 노출을 켜면 앱의 공지 페이지에도 함께 표시됩니다."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            {notice ? '저장' : '등록'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <FormField label="제목" required>
          {(p) => (
            <TextInput
              {...p}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: [점검] 8월 27일 새벽 서버 정기 점검 안내"
            />
          )}
        </FormField>

        <FormField label="본문" required>
          {(p) => (
            <TextArea
              {...p}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요."
            />
          )}
        </FormField>

        <FormField label="링크" hint="한 줄에 하나씩 입력하세요. 비워두면 링크 없이 등록됩니다.">
          {(p) => (
            <TextArea
              {...p}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder={'https://example.com/guide'}
              style={{ minHeight: 72 }}
            />
          )}
        </FormField>

        <Toggle
          checked={exposeMobile}
          onChange={setExposeMobile}
          label="모바일 공지 페이지 노출"
          description="끄면 관리자 콘솔에서만 보이는 내부 공지가 됩니다."
        />

        {error ? (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-label)' }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
