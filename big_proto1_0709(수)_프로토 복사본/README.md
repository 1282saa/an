# BigKinds News Concierge - Serverless AI News Analysis Platform

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://typescriptlang.org)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange.svg)](https://aws.amazon.com/lambda/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-purple.svg)](https://aws.amazon.com/bedrock/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

_Serverless AI-powered news analysis platform with real-time streaming via WebSocket_

</div>

---

## 🌟 Overview

**BigKinds News Concierge**는 AWS 서버리스 아키텍처와 AWS Bedrock Claude를 기반으로 한 차세대 뉴스 분석 및 질의응답 시스템입니다. WebSocket을 통한 실시간 스트리밍으로 언론인, 콘텐츠 크리에이터, 기업 분석가에게 즉시적인 뉴스 인사이트를 제공합니다.

### 🎯 핵심 가치 제안

- **서버리스 아키텍처**: AWS Lambda와 API Gateway를 통한 확장 가능하고 비용 효율적인 인프라
- **실시간 스트리밍**: WebSocket을 통한 즉시적인 AI 응답 전달
- **AWS Bedrock Claude**: 최신 Claude 모델을 활용한 고품질 뉴스 분석
- **BigKinds API 통합**: 한국 주요 언론사의 실시간 뉴스 데이터 수집 및 분석
- **무제한 확장성**: 서버리스 환경에서 자동 스케일링

---

## 🏗️ 시스템 아키텍처

### 기술 스택

<table>
<tr>
<td>

**Backend**

- FastAPI (Python 3.8+)
- OpenAI GPT-4 Turbo
- BigKinds API Integration
- ChromaDB (Vector Database)
- Redis (Caching)
- MongoDB (Data Storage)

</td>
<td>

**Frontend**

- React 18.3.1 + TypeScript 5.8.3
- Vite 6.3.5 (Build Tool)
- Tailwind CSS 3.3.5
- Framer Motion 10.12.16
- Zustand 4.3.8 (State Management)
- React Router DOM 6.30.1

</td>
</tr>
</table>

### 프로젝트 구조

```
big_proto/
├── backend/                     # FastAPI 백엔드
│   ├── api/
│   │   ├── clients/            # 외부 API 클라이언트
│   │   │   └── bigkinds/       # BigKinds API 클라이언트
│   │   ├── routes/             # API 엔드포인트
│   │   ├── models/             # 데이터 모델
│   │   └── utils/              # 유틸리티 함수
│   ├── services/               # 비즈니스 로직
│   └── utils/                  # 공통 유틸리티
├── frontend/                   # React 프론트엔드
│   └── src/
│       ├── components/         # UI 컴포넌트
│       ├── pages/             # 페이지 컴포넌트
│       ├── hooks/             # 커스텀 훅
│       └── services/          # API 서비스
├── cache/                     # 벡터 데이터베이스 캐시
├── config/                    # 설정 파일
├── docs/                      # 문서
└── logs/                      # 로그 파일
```

---

## 🚀 주요 기능

### 📰 뉴스 분석 기능

- **실시간 이슈 랭킹**: 오늘의 핫이슈와 트렌딩 키워드 분석
- **지능형 뉴스 검색**: 키워드, 기업, 카테고리별 고도화된 검색
- **AI 뉴스 요약**: 3가지 요약 스타일 (이슈중심, 인용중심, 데이터중심)
- **연관 질문 생성**: Perplexity 스타일의 관련 질문 자동 생성
- **뉴스 타임라인**: 시간순 뉴스 흐름 분석 및 시각화

### 🏢 기업 모니터링

- **관심 종목 워치리스트**: 실시간 기업 뉴스 모니터링
- **기업별 뉴스 레포트**: 일일/주간/월간/분기/연간 리포트 자동 생성
- **기업 뉴스 요약**: AI 기반 기업별 핵심 뉴스 요약
- **주가 캘린더 연동**: 경제 일정과 뉴스 데이터 연계 분석

### 🤖 AI 지원 기능

- **콘텐츠 제작 도구**: 언론인을 위한 AI 작성 지원
- **팩트체킹 지원**: 출처 검증 및 교차 확인 도구
- **멀티미디어 생성**: 인포그래픽 자동 생성 (계획)
- **협업 도구**: 팀 워크스페이스 기능 (계획)

---

## 🛠️ 설치 및 실행

### 시스템 요구사항

- **Python**: 3.8 이상
- **Node.js**: 14 이상
- **메모리**: 최소 4GB RAM 권장
- **디스크**: 2GB 이상 여유 공간

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-org/big_proto.git
cd big_proto
```

### 2. 백엔드 설정

```bash
# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정 (.env 파일 생성)
cp .env.example .env
# 필요한 API 키 설정:
# BIGKINDS_API_KEY=your_bigkinds_key
# OPENAI_API_KEY=your_openai_key

# 서버 실행
python -m backend.server
```

### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 접속 확인

- **백엔드 API**: http://localhost:8000
- **프론트엔드**: http://localhost:5173
- **API 문서**: http://localhost:8000/api/docs

---

## 📚 API 문서

### 주요 엔드포인트

#### 뉴스 API

```typescript
// 최신 뉴스 및 이슈 조회
GET /api/news/latest

// 뉴스 검색
GET /api/news/search?query=키워드&from=2024-01-01&to=2024-12-31

// 뉴스 상세 조회
GET /api/news/detail/{news_id}

// AI 뉴스 요약
POST /api/news/ai-summary
{
  "news_ids": ["news1", "news2"],
  "summary_type": "issue_focused" | "quote_focused" | "data_focused"
}

// 연관 질문 생성
GET /api/news/related-questions/{keyword}
```

#### 기업 뉴스 API

```typescript
// 기업 뉴스 조회
POST /api/news/company
{
  "company_name": "삼성전자",
  "days": 7,
  "limit": 20
}

// 기업 뉴스 레포트
GET /api/news/company/{company_name}/report/{report_type}
// report_type: daily, weekly, monthly, quarterly, yearly

// 관심 종목 관리
GET /api/news/watchlist
POST /api/news/watchlist
```

#### 경제 캘린더 API

```typescript
// 경제 일정 조회
GET /api/stock-calendar/events?date=2024-06-08
```

### API 인증

모든 API 요청은 헤더에 인증 정보가 필요할 수 있습니다:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer your-token' // 필요시
}
```

---

## 🔧 설정 및 커스터마이징

### 환경변수 설정

```bash
# API 키 설정
BIGKINDS_API_KEY=your_bigkinds_api_key
OPENAI_API_KEY=your_openai_api_key

# 서버 설정
HOST=0.0.0.0
PORT=8000
DEBUG=True

# 데이터베이스 설정
VECTOR_DB_PATH=./cache/vectordb
CACHE_TTL=3600
MAX_RETRIES=3

# Redis 설정 (선택사항)
REDIS_URL=redis://localhost:6379
```

### 프론트엔드 설정

`frontend/vite.config.ts`에서 개발 환경 설정을 변경할 수 있습니다:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

---

## 🧪 개발 및 테스트

### 백엔드 개발

```bash
# 테스트 실행
pytest

# 코드 포맷팅
black backend/

# 린트 검사
flake8 backend/

# 개발 서버 (hot reload)
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드 개발

```bash
cd frontend

# 테스트 실행
npm run test

# 코드 린트
npm run lint

# 빌드
npm run build

# 프리뷰
npm run preview
```

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend && npm run build

# 백엔드는 현재 설정으로 프로덕션 실행 가능
python -m backend.server
```

---

## 📖 사용 가이드

### 1. 뉴스 검색 및 분석

1. **홈페이지** 접속 후 검색창에 관심 키워드 입력
2. **고급 검색** 옵션으로 날짜, 언론사, 카테고리 필터링
3. **AI 요약** 버튼으로 선택한 기사들의 인사이트 확인
4. **연관 질문** 을 통해 추가 검색 키워드 발견

### 2. 기업 모니터링 설정

1. **워치리스트** 페이지에서 관심 기업 추가
2. **알림 설정** 으로 새 뉴스 발생시 알림 수신
3. **리포트 생성** 으로 정기적인 기업 분석 확인
4. **일정 연동** 으로 IR, 실적발표 등 일정 추적

### 3. 콘텐츠 제작 활용

1. **이슈 맵핑** 기능으로 토픽 간 관계 분석
2. **타임라인 분석** 으로 사건 전개 과정 추적
3. **AI 어시스턴트** 와 함께 기사 초안 작성
4. **팩트체킹** 도구로 정보 검증

---

## 🤝 기여하기

### 개발 환경 설정

1. 프로젝트 포크 및 클론
2. 로컬 개발 환경 설정
3. feature 브랜치 생성
4. 변경사항 커밋 및 푸시
5. Pull Request 생성

### 코딩 컨벤션

- **Python**: PEP 8 준수, Black 포맷터 사용
- **TypeScript**: Prettier + ESLint 설정 준수
- **커밋 메시지**: Conventional Commits 형식 사용

```bash
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드/설정 변경
```

### 이슈 리포팅

버그 리포트나 기능 제안은 [GitHub Issues](https://github.com/your-org/big_proto/issues)를 통해 제출해 주세요.

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 📞 문의 및 지원

- **이메일**: dev@seoulecon.com
- **문서**: [프로젝트 위키](https://github.com/your-org/big_proto/wiki)
- **이슈 트래커**: [GitHub Issues](https://github.com/your-org/big_proto/issues)

---

<div align="center">

**Made with ❤️ by Seoul Economic Daily Development Team**

[홈페이지](https://www.seoulecon.com) • [API 문서](http://localhost:8000/api/docs) • [기여 가이드](CONTRIBUTING.md)

</div>

# AI NOVA - 구글 클라우드 런 배포 가이드

## 구글 클라우드 런 배포 방법

### 사전 준비

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) 설치
2. [Docker](https://docs.docker.com/get-docker/) 설치
3. Google Cloud 프로젝트 생성 및 결제 계정 연결
4. 필요한 API 활성화 (Cloud Run, Container Registry 등)

### 로컬에서 도커 이미지 빌드 및 테스트

```bash
# 도커 이미지 빌드
docker build -t ainova .

# 로컬에서 실행
docker run -p 8080:8080 ainova
```

### 구글 클라우드 런에 배포

#### 방법 1: 수동 배포

```bash
# 1. Google Cloud에 로그인
gcloud auth login

# 2. 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# 3. Docker 인증 설정
gcloud auth configure-docker

# 4. 이미지 빌드 및 태그 지정
docker build -t gcr.io/YOUR_PROJECT_ID/ainova:latest .

# 5. 이미지 푸시
docker push gcr.io/YOUR_PROJECT_ID/ainova:latest

# 6. Cloud Run에 배포
gcloud run deploy ainova \
  --image gcr.io/YOUR_PROJECT_ID/ainova:latest \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --port 8080
```

#### 방법 2: Cloud Build를 사용한 자동 배포

```bash
# Cloud Build 트리거 실행
gcloud builds submit --config cloudbuild.yaml .
```

### 환경 변수 설정

구글 클라우드 런에서 환경 변수는 두 가지 방법으로 설정할 수 있습니다:

1. **콘솔에서 직접 설정**:

   - Google Cloud Console > Cloud Run > 서비스 선택 > 수정 > 컨테이너, 변수 및 보안 비밀 > 환경 변수 추가

2. **배포 명령어에 포함**:
   ```bash
   gcloud run deploy ainova \
     --image gcr.io/YOUR_PROJECT_ID/ainova:latest \
     --set-env-vars="BIGKINDS_KEY=your-key,OPENAI_API_KEY=your-key"
   ```

### 보안 비밀 설정

민감한 정보(API 키 등)는 Secret Manager를 사용하여 관리하는 것이 좋습니다:

```bash
# 1. 보안 비밀 생성
gcloud secrets create OPENAI_API_KEY --data-file=./openai-key.txt

# 2. 서비스 계정에 접근 권한 부여
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT \
  --role=roles/secretmanager.secretAccessor

# 3. 배포 시 보안 비밀 참조
gcloud run deploy ainova \
  --image gcr.io/YOUR_PROJECT_ID/ainova:latest \
  --set-secrets=OPENAI_API_KEY=OPENAI_API_KEY:latest
```

## 문제 해결

- **로그 확인**: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ainova"`
- **컨테이너 상태 확인**: Google Cloud Console > Cloud Run > 서비스 선택 > 수정 > 컨테이너 탭
- **메모리/CPU 부족**: 리소스 할당량 증가 고려
- **타임아웃 오류**: 요청 시간 초과 설정 확인 (기본 60초)
