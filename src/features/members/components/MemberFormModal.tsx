import { useEffect, useState, type FormEvent } from 'react';
import { Button, FormField, Modal, TextInput } from '@/shared/ui';
import type { Member, MemberUpdateRequest } from '../types';

interface MemberFormModalProps {
  open: boolean;
  /** 수정 대상. 모달을 열기 전에는 null 이다. */
  member: Member | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: MemberUpdateRequest) => void;
}

const EMPTY = { nickname: '', email: '', phoneNumber: '', address: '' };

/**
 * 회원 정보 수정 폼.
 *
 * 신규 등록은 다루지 않는다. 명세상 POST /auth/signup 은 인증이 필요 없고
 * role 을 임의로 지정할 수 있어 관리자 화면에서 쓸 수 없고, 관리자 전용 생성
 * 엔드포인트도 아직 없다. 목록에 「회원 추가」 진입점을 두지 않은 이유다.
 */
export function MemberFormModal({ open, member, submitting, onClose, onSubmit }: MemberFormModalProps) {
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  // 모달이 열릴 때마다 대상 회원 값으로 초기화한다.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (member) {
      setValues({
        nickname: member.nickname,
        email: member.email ?? '',
        phoneNumber: member.phoneNumber,
        address: member.address ?? '',
      });
    } else {
      setValues(EMPTY);
    }
  }, [open, member]);

  function set(key: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      setError('이메일 형식이 올바르지 않습니다.');
      return;
    }

    onSubmit(values);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="회원 정보 수정"
      description="수정 내용은 감사 로그에 기록됩니다."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            저장
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        {/* 실명과 로그인 아이디는 명세 5.2 의 PATCH 대상이 아니라 폼에 두지 않는다. */}
        <FormField label="닉네임">
          {(p) => (
            <TextInput {...p} value={values.nickname} onChange={(e) => set('nickname', e.target.value)} />
          )}
        </FormField>

        <FormField label="이메일" required>
          {(p) => (
            <TextInput
              {...p}
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
            />
          )}
        </FormField>

        <FormField label="휴대폰" hint="010-0000-0000 형식">
          {(p) => (
            <TextInput
              {...p}
              value={values.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
            />
          )}
        </FormField>

        <FormField label="주소">
          {(p) => (
            <TextInput {...p} value={values.address} onChange={(e) => set('address', e.target.value)} />
          )}
        </FormField>

        {error ? (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-label)' }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
