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

    /*
     * 이메일은 값이 있을 때만 형식을 본다. 자녀 계정은 이메일 없이 가입할 수 있어
     * 무조건 검사하면 **전화번호만 고치려 해도 저장이 막혔다.**
     */
    if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      setError('이메일 형식이 올바르지 않습니다.');
      return;
    }

    /*
     * 실제로 바뀐 칸만 보낸다.
     *
     * 서버 PATCH 규약은 "null 인 필드는 미변경" 인데 빈 문자열은 null 이 아니라
     * 그대로 덮어쓴다. 네 칸을 늘 함께 보내던 탓에, 원래 값이 없던(null) 주소·
     * 닉네임이 저장만 눌러도 "" 로 바뀌어 데이터가 오염됐다.
     *
     * 빈 칸을 일괄로 빼면 이번엔 **값을 지울 수 없게** 되므로, 열었을 때와 달라진
     * 칸만 골라 보낸다. 지우려고 비운 칸은 달라졌으니 그대로 전달된다.
     */
    const before = {
      nickname: member?.nickname ?? '',
      email: member?.email ?? '',
      phoneNumber: member?.phoneNumber ?? '',
      address: member?.address ?? '',
    };
    const patch = Object.fromEntries(
      Object.entries(values).filter(([key, v]) => v !== before[key as keyof typeof before]),
    ) as typeof values;

    onSubmit(patch);
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

        {/* 자녀 계정은 이메일 없이 가입할 수 있어 필수가 아니다. */}
        <FormField label="이메일">
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
