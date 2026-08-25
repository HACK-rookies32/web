import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiEnvelope, ApiErrorBody } from '@/shared/lib/types';
import { AUTH_STORAGE_KEY } from '@/shared/lib/constants';

/**
 * 실제 백엔드(Spring Boot) 연동용 axios 클라이언트.
 *
 * 프로토타입은 VITE_USE_MOCK=true 로 목 데이터를 쓰므로 이 파일은 아직 호출되지 않는다.
 * 백엔드가 붙는 시점에 .env 의 VITE_USE_MOCK 만 false 로 바꾸면 각 feature 의 api.ts 가
 * 이 클라이언트를 타도록 되어 있다.
 */

/** 봉투가 success=false 로 왔을 때 던지는 에러. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(body: ApiErrorBody, status: number) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
  }
}

function readToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

export const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

/* 요청 인터셉터 — JWT 부착 */
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * 응답 인터셉터 — 봉투 { success, data, error } 를 벗겨 data 만 돌려준다.
 * 덕분에 컴포넌트/훅은 봉투 구조를 몰라도 된다.
 */
client.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => {
    const envelope = response.data;

    // 봉투 규약을 따르지 않는 응답(파일 다운로드 등)은 그대로 통과시킨다.
    if (envelope === null || typeof envelope !== 'object' || !('success' in envelope)) {
      return response;
    }

    if (!envelope.success) {
      throw new ApiError(
        envelope.error ?? { code: 'UNKNOWN', message: '알 수 없는 오류가 발생했습니다.' },
        response.status,
      );
    }

    response.data = envelope.data as never;
    return response;
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const status = error.response?.status ?? 0;

    // 401 — 토큰 만료/무효. 저장소를 비우고 로그인으로 보낸다.
    if (status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const body = error.response?.data?.error;
    if (body) return Promise.reject(new ApiError(body, status));

    return Promise.reject(
      new ApiError(
        { code: 'NETWORK', message: error.message || '서버에 연결할 수 없습니다.' },
        status,
      ),
    );
  },
);

/** 봉투가 벗겨진 data 만 반환하는 얇은 래퍼. */
export async function request<T>(config: Parameters<AxiosInstance['request']>[0]): Promise<T> {
  const res = await client.request<T>(config);
  return res.data;
}

/** VITE_USE_MOCK 플래그. 문자열 'false' 일 때만 실제 API 를 쓴다. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
