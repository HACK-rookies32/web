import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  type Column,
  EmptyState,
  FormField,
  Icon,
  ListToolbar,
  Pagination,
  Select,
  StatusPill,
  Table,
  TextInput,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useListParams } from '@/shared/hooks/useListParams';
import {
  AUDIT_ACTIVITY_LABEL,
  AUDIT_FILTER_ACTIVITIES,
  type AuditActivityType,
  parseAuditTarget,
} from '@/shared/lib/audit';
import { auditLogKeys, fetchAuditLogs } from '../api';
import { AuditDatePicker } from '../components/AuditDatePicker';
import type { AuditLogItem, AuditLogListParams } from '../types';
import './AuditLogsPage.css';

const MIN_AUDIT_DATE = '2000-01-01';

/**
 * 감사 로그는 과거 기록이므로 조회 상한은 오늘이다.
 * 모듈 로드 시점에 한 번 고정하면 자정을 넘겨 열어 둔 화면에서 상한이
 * 어제로 남아 당일 로그를 조회할 수 없으므로, 렌더할 때마다 계산한다.
 */
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function activityTone(type: string): 'danger' | 'warning' | 'info' | 'neutral' | 'accent' {
  if (type.includes('DELETE')) return 'danger';
  if (type === 'PAYMENT_REFUND' || type === 'WALLET_BALANCE_ADJUST') return 'warning';
  // 권한 변경은 되돌리기 어려운 영향이 커서 수정 계열과 구분해 경고로 둔다.
  if (type === 'MEMBER_ROLE_UPDATE') return 'warning';
  if (type.includes('UPDATE')) return 'info';
  if (type.includes('CREATE') || type.includes('ADD')) return 'accent';
  return 'neutral';
}

export function AuditLogsPage() {
  const { patchParams, resetParams, getParam, page } = useListParams();
  const adminLoginIdValue = getParam('adminLoginId');
  const activityTypeValue = getParam('activityType');
  const from = getParam('from');
  const to = getParam('to');

  const params = useMemo<AuditLogListParams>(
    () => ({
      adminLoginId: adminLoginIdValue || undefined,
      activityType: activityTypeValue ? (activityTypeValue as AuditActivityType) : undefined,
      from: from || undefined,
      to: to || undefined,
      page,
    }),
    [adminLoginIdValue, activityTypeValue, from, to, page],
  );

  const query = useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => fetchAuditLogs(params),
  });

  const hasFilters = Boolean(adminLoginIdValue || activityTypeValue || from || to);
  const invalidPeriod = Boolean(from && to && from > to);
  const maxAuditDate = getTodayDate();

  /*
   * 컬럼은 관리자 · 활동 · 대상 · 발생일시 넷이다.
   * 대상만 폭을 비워 남는 공간을 흡수하게 두고, 나머지는 내용 길이에 맞춰 고정한다.
   */
  const columns: Column<AuditLogItem>[] = [
    {
      key: 'admin',
      header: '관리자',
      width: '200px',
      /* 계정 아이디만 보여준다. 숫자 adminId 는 화면에서 쓸 일이 없다. */
      render: (row) => row.adminLoginId,
    },
    {
      key: 'action',
      header: '활동',
      width: '260px',
      /* 표시 문구는 서버가 확정해 내려준다(activityLabel). */
      render: (row) => (
        <StatusPill tone={activityTone(row.activityType)}>
          {row.activityLabel || AUDIT_ACTIVITY_LABEL[row.activityType] || row.activityType}
        </StatusPill>
      ),
    },
    {
      key: 'target',
      header: '대상',
      /*
       * 대상은 targetType + targetId 두 값으로 온다. 종류를 우리말로 풀어 한 줄로
       * 보여주고, 해당 관리 화면으로 바로 갈 수 있게 링크를 건다. 연결할 화면이
       * 없는 종류는 링크 없이 값만 보여준다.
       */
      render: (row) => {
        const target = parseAuditTarget(row.targetType, row.targetId);
        const label = row.targetId ? `${target.label} #${row.targetId}` : target.label;
        return target.href ? (
          <Link className="audit-logs__target-link" to={target.href}>
            {label}
          </Link>
        ) : (
          label
        );
      },
    },
    {
      key: 'createdAt',
      header: '발생일시',
      width: '200px',
      numeric: true,
      render: (row) => <span className="muted">{formatDateTime(row.occurredAt)}</span>,
    },
  ];

  return (
    <div className="audit-logs">
      <Card className="audit-logs__filters" title="조회 조건" description="관리자, 활동 유형, 발생 기간으로 기록을 좁혀볼 수 있습니다.">
        <div className="audit-logs__filter-grid">
          <FormField label="관리자 아이디">
            {(props) => (
              <TextInput
                {...props}
                value={adminLoginIdValue}
                placeholder="예: admin01, general_lee"
                onChange={(event) => patchParams({ adminLoginId: event.target.value })}
              />
            )}
          </FormField>

          <FormField label="활동 유형">
            {(props) => (
              <Select
                {...props}
                value={activityTypeValue}
                onChange={(event) => patchParams({ activityType: event.target.value })}
              >
                <option value="">전체 활동</option>
                {AUDIT_FILTER_ACTIVITIES.map((value: AuditActivityType) => (
                  <option key={value} value={value}>{AUDIT_ACTIVITY_LABEL[value]}</option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="시작일" error={invalidPeriod ? '종료일보다 늦을 수 없습니다.' : undefined}>
            {(props) => (
              <AuditDatePicker
                id={props.id}
                describedBy={props['aria-describedby']}
                invalid={props['aria-invalid']}
                value={from}
                min={MIN_AUDIT_DATE}
                max={to && to < maxAuditDate ? to : maxAuditDate}
                onChange={(value) => patchParams({ from: value || null })}
              />
            )}
          </FormField>

          <FormField label="종료일">
            {(props) => (
              <AuditDatePicker
                id={props.id}
                describedBy={props['aria-describedby']}
                invalid={props['aria-invalid']}
                value={to}
                min={from || MIN_AUDIT_DATE}
                max={maxAuditDate}
                onChange={(value) => patchParams({ to: value || null })}
              />
            )}
          </FormField>

          <div className="audit-logs__filter-action">
            <Button disabled={!hasFilters} onClick={resetParams}>필터 초기화</Button>
          </div>
        </div>
      </Card>

      <ListToolbar summary={`총 ${query.data?.totalElements ?? 0}건`} />

      <Card flush>
        <Table
          caption="관리자 감사 로그 목록"
          columns={columns}
          rows={invalidPeriod ? [] : query.data?.content ?? []}
          rowKey={(row) => row.id}
          loading={!invalidPeriod && query.isPending}
          error={query.isError ? '감사 로그를 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title={invalidPeriod ? '조회 기간을 확인해 주세요' : '감사 로그가 없습니다'}
              description={invalidPeriod ? '시작일은 종료일보다 늦을 수 없습니다.' : '현재 조건에 해당하는 활동 기록이 없습니다.'}
              icon={<Icon name="nav-audit" />}
              action={hasFilters ? <Button size="sm" onClick={resetParams}>필터 초기화</Button> : undefined}
            />
          }
          footer={
            !invalidPeriod && query.data && query.data.totalElements > 0 ? (
              <Pagination
                page={query.data.page}
                size={query.data.size}
                totalElements={query.data.totalElements}
                totalPages={query.data.totalPages}
                onChange={(next) => patchParams({ page: String(next) }, false)}
              />
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
