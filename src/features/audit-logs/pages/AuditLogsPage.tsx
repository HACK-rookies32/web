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
  StackedCell,
  StatusPill,
  Table,
  TextInput,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useListParams } from '@/shared/hooks/useListParams';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { AUDIT_ACTION_LABEL, type AuditAction, parseAuditTarget } from '@/shared/lib/audit';
import { auditLogKeys, fetchAuditLogs } from '../api';
import { AuditDatePicker } from '../components/AuditDatePicker';
import type { AuditLogItem, AuditLogListParams } from '../types';
import './AuditLogsPage.css';

const MIN_AUDIT_DATE = '2000-01-01';

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MAX_AUDIT_DATE = getTodayDate();

function actionTone(action: AuditAction): 'danger' | 'warning' | 'info' | 'neutral' | 'accent' {
  if (action.includes('DELETE') || action === 'MEMBER_BAN') return 'danger';
  if (action === 'PAYMENT_REFUND' || action === 'WALLET_ADJUST') return 'warning';
  // 권한 변경은 되돌리기 어려운 영향이 커서 수정 계열과 구분해 경고로 둔다.
  if (action === 'ADMIN_ROLE_UPDATE') return 'warning';
  if (action.includes('UPDATE') || action === 'MEMBER_SUSPEND') return 'info';
  if (action.includes('CREATE')) return 'accent';
  return 'neutral';
}

export function AuditLogsPage() {
  const { patchParams, resetParams, getParam, page } = useListParams();
  const adminIdValue = getParam('adminId');
  const actionValue = getParam('action');
  const from = getParam('from');
  const to = getParam('to');

  const params = useMemo<AuditLogListParams>(
    () => ({
      adminId: adminIdValue ? Number(adminIdValue) : undefined,
      action: actionValue ? (actionValue as AuditAction) : undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      size: DEFAULT_PAGE_SIZE,
    }),
    [adminIdValue, actionValue, from, to, page],
  );

  const query = useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => fetchAuditLogs(params),
  });

  const hasFilters = Boolean(adminIdValue || actionValue || from || to);
  const invalidPeriod = Boolean(from && to && from > to);

  function resetFilters() {
    resetParams();
  }

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'id',
      header: '로그 ID',
      width: '92px',
      numeric: true,
      render: (row) => <span className="audit-logs__id">#{row.logId}</span>,
    },
    {
      key: 'admin',
      header: '관리자',
      width: '132px',
      /* 계정명을 앞세우고 숫자 ID 는 보조로 내린다. */
      render: (row) => <StackedCell primary={row.adminUsername} secondary={`#${row.adminId}`} />,
    },
    {
      key: 'action',
      header: '활동',
      width: '168px',
      render: (row) => (
        <div className="audit-logs__action">
          <StatusPill tone={actionTone(row.action)}>{AUDIT_ACTION_LABEL[row.action]}</StatusPill>
          <code>{row.action}</code>
        </div>
      ),
    },
    {
      key: 'target',
      header: '대상',
      width: '184px',
      /*
       * target 은 "member:1001" 같은 문자열이다. 종류를 우리말로 풀고,
       * 해당 관리 화면으로 바로 갈 수 있게 링크를 건다. 연결할 화면이
       * 없는 종류(리포트 등)는 링크 없이 값만 보여준다.
       */
      render: (row) => {
        const target = parseAuditTarget(row.target);
        const body = (
          <StackedCell
            primary={target.id ? `${target.label} #${target.id}` : target.label}
            secondary={row.target}
          />
        );
        return target.href ? (
          <Link className="audit-logs__target-link" to={target.href}>
            {body}
          </Link>
        ) : (
          body
        );
      },
    },
    {
      key: 'description',
      header: '내용',
      render: (row) =>
        row.description ? (
          <span className="audit-logs__description">{row.description}</span>
        ) : (
          <span className="muted">-</span>
        ),
    },
    {
      key: 'createdAt',
      header: '발생일시',
      width: '168px',
      numeric: true,
      render: (row) => <span className="muted">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  return (
    <div className="audit-logs">
      <Card className="audit-logs__filters" title="조회 조건" description="관리자, 활동 유형, 발생 기간으로 기록을 좁혀볼 수 있습니다.">
        <div className="audit-logs__filter-grid">
          <FormField label="관리자 ID">
            {(props) => (
              <TextInput
                {...props}
                type="number"
                min={1}
                inputMode="numeric"
                value={adminIdValue}
                placeholder="전체 관리자"
                onChange={(event) => patchParams({ adminId: event.target.value })}
              />
            )}
          </FormField>

          <FormField label="활동 유형">
            {(props) => (
              <Select {...props} value={actionValue} onChange={(event) => patchParams({ action: event.target.value })}>
                <option value="">전체 활동</option>
                {Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
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
                max={to && to < MAX_AUDIT_DATE ? to : MAX_AUDIT_DATE}
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
                max={MAX_AUDIT_DATE}
                onChange={(value) => patchParams({ to: value || null })}
              />
            )}
          </FormField>

          <div className="audit-logs__filter-action">
            <Button disabled={!hasFilters} onClick={resetFilters}>필터 초기화</Button>
          </div>
        </div>
      </Card>

      <ListToolbar summary={`총 ${query.data?.totalElements ?? 0}건`} />

      <Card flush>
        <Table
          caption="관리자 감사 로그 목록"
          columns={columns}
          rows={invalidPeriod ? [] : query.data?.content ?? []}
          rowKey={(row) => row.logId}
          loading={!invalidPeriod && query.isPending}
          error={query.isError ? '감사 로그를 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title={invalidPeriod ? '조회 기간을 확인해 주세요' : '감사 로그가 없습니다'}
              description={invalidPeriod ? '시작일은 종료일보다 늦을 수 없습니다.' : '현재 조건에 해당하는 활동 기록이 없습니다.'}
              icon={<Icon name="nav-audit" />}
              action={hasFilters ? <Button size="sm" onClick={resetFilters}>필터 초기화</Button> : undefined}
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
