import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, FormField, Modal, TextArea, TextInput, useToast } from '@/shared/ui';
import { attachmentName } from '@/shared/lib/format';
import { ApiError } from '@/shared/api/client';
import { uploadNoticeAttachment } from '../api';
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
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState('');
  /** 서버가 준 첨부 공개 경로 목록. 파일명이 아니라 업로드 후의 경로다. */
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(notice?.title ?? '');
    setContent(notice?.content ?? '');
    setLinks((notice?.links ?? []).join('\n'));
    setAttachments(notice?.attachments ?? []);
    setUploading(false);
  }, [open, notice]);

  /**
   * 파일을 고르면 즉시 업로드해 공개 경로를 attachments 에 더한다.
   *
   * 서버는 공지 저장 시 첨부가 실제로 올라온 파일인지 검증하므로(파일명만 넘기면
   * 400), 여기서 presign → S3 PUT 을 끝내고 받은 경로만 들고 있어야 한다.
   */
  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    /* 같은 파일을 다시 고를 수 있도록 input 값을 비운다. */
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;

    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        paths.push(await uploadNoticeAttachment(file));
      }
      setAttachments((prev) => [...prev, ...paths]);
    } catch (err) {
      // 로컬 디스크 모드면 presign 이 409 다. 그 밖은 일반 업로드 실패로 안내한다.
      if (err instanceof ApiError && err.status === 409) {
        toast.error('첨부 업로드를 사용할 수 없습니다', '현재 저장소 설정에서는 파일 업로드가 지원되지 않습니다.');
      } else {
        toast.error('첨부 업로드에 실패했습니다', err instanceof Error ? err.message : undefined);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(path: string) {
    setAttachments((prev) => prev.filter((p) => p !== path));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    /* 검증 실패는 폼 안 텍스트 대신 알림(토스트)으로 띄운다. */
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요.');
      return;
    }
    if (!content.trim()) {
      toast.error('본문을 입력해 주세요.');
      return;
    }
    if (uploading) {
      toast.error('첨부 업로드가 끝난 뒤 등록해 주세요.');
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
          <Button onClick={onClose} disabled={submitting || uploading}>
            취소
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={uploading}
            onClick={handleSubmit}
          >
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

        <FormField
          label="첨부 파일"
          hint={uploading ? '업로드 중입니다…' : '여러 개를 고를 수 있습니다. 고르면 바로 업로드됩니다.'}
        >
          {(p) => (
            <input
              {...p}
              ref={fileInputRef}
              className="control"
              type="file"
              multiple
              disabled={uploading}
              onChange={(e) => void handleFiles(e)}
            />
          )}
        </FormField>

        {attachments.length > 0 ? (
          <ul className="notice-form__files">
            {attachments.map((path) => (
              <li key={path}>
                <span>{attachmentName(path)}</span>
                <button
                  type="button"
                  className="notice-form__file-remove"
                  aria-label={`${attachmentName(path)} 첨부 제거`}
                  onClick={() => removeAttachment(path)}
                  disabled={uploading || submitting}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </Modal>
  );
}
