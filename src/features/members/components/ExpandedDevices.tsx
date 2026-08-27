import { useQuery } from '@tanstack/react-query';
import { EmptyState, Spinner, StatusPill } from '@/shared/ui';
import { formatRelative, maskName } from '@/shared/lib/format';
import { fetchMemberDevices, memberKeys } from '../api';
import { DeviceGlyph } from './Glyphs';
import './ExpandedDevices.css';

const DEVICE_STATUS = {
  ONLINE: { label: '온라인', tone: 'success' },
  OFFLINE: { label: '오프라인', tone: 'neutral' },
  BLOCKED: { label: '차단', tone: 'danger' },
} as const;

/** 회원 목록에서 행을 펼쳤을 때 보이는 연결 자녀 기기 목록. */
export function ExpandedDevices({ memberId }: { memberId: number }) {
  const { data, isPending, isError } = useQuery({
    queryKey: memberKeys.devices(memberId),
    queryFn: () => fetchMemberDevices(memberId),
  });

  if (isPending) {
    return (
      <div className="expanded expanded--center">
        <Spinner size={18} label="기기 목록을 불러오는 중" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="expanded">
        <EmptyState tone="error" title="기기 목록을 불러오지 못했습니다" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="expanded">
        <EmptyState title="등록된 기기가 없습니다" description="이 회원은 아직 자녀 기기를 연결하지 않았습니다." />
      </div>
    );
  }

  return (
    <div className="expanded">
      <p className="expanded__title">연결 자녀 기기 {data.length}대</p>
      <ul className="expanded__list">
        {data.map((d) => (
          <li key={d.deviceId} className="expanded__item">
            <span className="expanded__icon">
              <DeviceGlyph />
            </span>
            <span className="expanded__name">
              {d.childName ? maskName(d.childName) : '본인 기기'}
            </span>
            <span className="expanded__meta">
              {d.model} · {d.os} · v{d.appVersion}
            </span>
            <span className="expanded__seen">최근 접속 {formatRelative(d.lastSeenAt)}</span>
            <StatusPill tone={DEVICE_STATUS[d.status].tone}>{DEVICE_STATUS[d.status].label}</StatusPill>
          </li>
        ))}
      </ul>
    </div>
  );
}
