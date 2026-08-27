import { useEffect, useState, type FormEvent } from 'react';
import { Button, FormField, Modal, TextArea, TextInput } from '@/shared/ui';
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
  const [attachments, setAttachments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(notice?.title ?? '');
    setContent(notice?.content ?? '');
    setLinks((notice?.links ?? []).join('\n'));
    setAttachments(notice?.attachments ?? []);
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
      attachments,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={notice ? '공지 수정' : '공지 작성'}
      description="제목과 본문은 필수입니다. 링크와 첨부 파일은 선택입니다."
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

        {/*
          TODO(api): 관리자 명세 5.3 에 첨부 업로드 엔드포인트가 없다.
          지금은 고른 파일의 이름만 들고 있다가 함께 넘긴다. 실제 업로드 경로가
          생기면 여기서 presign → upload → 완료 확인 순서로 바꾼다.
        */}
        <FormField label="첨부 파일" hint="여러 개를 고를 수 있습니다.">
          {(p) => (
            <input
              {...p}
              className="control"
              type="file"
              multiple
              onChange={(e) => setAttachments([...(e.target.files ?? [])].map((f) => f.name))}
            />
          )}
        </FormField>

        {attachments.length > 0 ? (
          <ul className="notice-form__files">
            {attachments.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-label)' }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
