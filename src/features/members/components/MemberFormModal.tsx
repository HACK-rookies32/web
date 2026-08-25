import { useEffect, useState, type FormEvent } from 'react';
import { Button, FormField, Modal, Select, TextInput } from '@/shared/ui';
import type { MemberStatus } from '@/shared/lib/status';
import type { MemberDetail, MemberUpdateRequest } from '../types';

interface MemberFormModalProps {
  open: boolean;
  /** 수정 대상. null 이면 신규 등록. */
  member: MemberDetail | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: MemberUpdateRequest) => void;
}

const EMPTY = { name: '', nickname: '', email: '', phoneNumber: '', address: '' };

/**
 * 회원 등록 / 수정 폼.
 *
 * NOTE: 신규 등록은 명세상 POST /auth/signup 을 쓰게 되어 있으나, 그 엔드포인트는
 *       인증이 필요 없고 role 을 임의로 지정할 수 있어 관리자 화면에서 쓰기에 부적절하다.
 *       관리자 전용 생성 엔드포인트가 생기면 연결한다. 지금은 목에서만 동작한다.
 */
export function MemberFormModal({ open, member, submitting, onClose, onSubmit }: MemberFormModalProps) {
  const [values, setValues] = useState(EMPTY);
  const [status, setStatus] = useState<MemberStatus>('ACTIVE');
  const [error, setError] = useState<string | null>(null);

  // 모달이 열릴 때마다 대상 회원 값으로 초기화한다.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (member) {
      setValues({
        name: member.name,
        nickname: member.nickname,
        email: member.email,
        phoneNumber: member.phoneNumber,
        address: member.address,
      });
      setStatus(member.status);
    } else {
      setValues(EMPTY);
      setStatus('ACTIVE');
    }
  }, [open, member]);

  function set(key: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!values.name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      setError('이메일 형식이 올바르지 않습니다.');
      return;
    }

    onSubmit({ ...values, status });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? '회원 정보 수정' : '회원 추가'}
      description={
        member
          ? '수정 내용은 감사 로그에 기록됩니다.'
          : '관리자가 직접 회원을 등록합니다. 필수 항목만 입력하세요.'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {member ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <FormField label="이름" required>
          {(p) => (
            <TextInput {...p} value={values.name} onChange={(e) => set('name', e.target.value)} />
          )}
        </FormField>

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

        <FormField label="계정 상태">
          {(p) => (
            <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>
              <option value="ACTIVE">활성</option>
              <option value="SUSPENDED">정지</option>
              <option value="WITHDRAWN">탈퇴</option>
            </Select>
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
