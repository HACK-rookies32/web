# ==================================================================
# careguard 관리자 웹 이미지 (빌드 + Nginx 서빙)
#
# WAS 와 달리 여기서는 이미지 안에서 빌드한다.
# 산출물이 정적 파일이라 빌드 단계 결과만 다음 단계로 복사하면 되고,
# node_modules 가 최종 이미지에 남지 않는다.
# ==================================================================

# ------------------------------------------------------------------
# 1단계: 빌드
# ------------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

# 의존성 설치를 소스 복사보다 먼저 한다.
# package*.json 이 안 바뀌면 이 레이어가 캐시되어, 소스만 고쳤을 때 재설치가 없다.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# ------------------------------------------------------------------
# ⚠️ VITE_* 는 빌드 시점에 코드로 치환된다. 런타임에 바꿀 수 없다.
#    컨테이너 환경변수로 넘겨도 아무 효과가 없으므로 여기서 박아야 한다.
#    (런타임에 정해지는 값은 NLB 주소뿐이고, 그건 nginx 설정으로 처리한다)
#
# ⚠️ VITE_USE_MOCK 을 반드시 문자열 "false" 로 넘길 것.
#    client.ts 는 `VITE_USE_MOCK !== 'false'` 로 판정한다. 즉 값이 없거나
#    오타가 나면 목 데이터가 켜진 채로 배포된다. 화면은 멀쩡히 뜨고 숫자도
#    그럴듯해서 아무도 눈치채지 못하는 종류의 사고다.
#
# VITE_API_BASE_URL=/api 인 이유:
#    별도 API 도메인을 쓰면 CORS 설정이 추가로 필요하다. 같은 도메인에서
#    nginx 가 /api/ 를 내부 NLB 로 프록시하므로, 상대 경로면 CORS 가
#    아예 발생하지 않는다. (client.ts 의 기본값도 '/api' 라 일치한다)
#
# ARG 로 둔 것은 CI 에서 덮어쓸 수 있게 하기 위함이다.
#    예: 목 데이터로 띄운 데모가 필요하면 --build-arg VITE_USE_MOCK=true
# ------------------------------------------------------------------
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=/api
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# tsc -b 가 함께 돌므로 타입 에러도 여기서 걸린다.
RUN npm run build

# 목 데이터가 켜진 채 빌드되는 사고를 이미지 빌드 단계에서 잡는다.
# mock 청크가 실제로 로드되는지까지는 확인할 수 없으니, 최소한 플래그가
# 의도대로 들어갔는지만 검증한다.
RUN if [ "$VITE_USE_MOCK" != "false" ]; then \
      echo "WARNING: 목 데이터가 켜진 이미지입니다 (VITE_USE_MOCK=$VITE_USE_MOCK)"; \
    fi

# ------------------------------------------------------------------
# 2단계: 서빙
# ------------------------------------------------------------------
FROM nginx:1.27-alpine

# 기본 설정을 치운다. 두면 우리 설정과 함께 로드되어
# listen 80 default_server 가 중복 선언으로 충돌한다.
RUN rm -f /etc/nginx/conf.d/default.conf

# 공식 이미지가 기동 시 이 디렉터리의 *.template 을 envsubst 로 처리해
# /etc/nginx/conf.d/ 로 내보낸다. NLB_DNS 와 DNS_RESOLVER 가 이때 채워진다.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx 공식 이미지의 기본 ENTRYPOINT/CMD 를 그대로 쓴다.
# entrypoint 가 템플릿 치환을 먼저 수행한 뒤 nginx 를 포그라운드로 띄운다.