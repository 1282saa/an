# 로컬 환경 설정 가이드 🚀

## 빠른 시작

### 1단계: AWS 설정 (필수)
```bash
# AWS CLI 설치 (macOS)
brew install awscli

# AWS 계정 설정
aws configure
```

**입력 정보:**
- AWS Access Key ID: [AWS IAM에서 생성한 액세스 키]
- AWS Secret Access Key: [AWS IAM에서 생성한 비밀 키]
- Default region name: `us-east-1`
- Default output format: `json`

> ⚠️ **AWS 설정이 필요한 이유**: Bedrock Claude 모델을 사용하기 위해 AWS 인증이 필요합니다.

### 2단계: 환경 변수 설정
```bash
# .env 파일 생성
cp env.example .env

# .env 파일 편집
nano .env  # 또는 VS Code로 편집
```

**필수 설정 항목:**
```env
# BigKinds API 키 (필수!)
BIGKINDS_API_KEY=실제_빅카인즈_API_키_입력

# AWS 리전 설정
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
```

### 3단계: 서버 실행
```bash
# 실행 스크립트로 간단 시작
./run_local.sh
```

또는 수동 실행:
```bash
# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 4단계: 테스트
서버가 성공적으로 시작되면:
- **API 문서**: http://localhost:8000/api/docs
- **서버 상태**: http://localhost:8000/api/health

## 주요 기능 테스트

### 1. 뉴스 컨시어지 API 테스트
```bash
curl -X POST "http://localhost:8000/api/news/concierge" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "삼성전자 최근 실적은?",
    "max_articles": 5
  }'
```

### 2. 브라우저에서 테스트
http://localhost:8000/api/docs 에서 Interactive API 문서를 통해 테스트할 수 있습니다.

## 문제 해결

### 자주 발생하는 오류들

#### 1. "AWS credentials not found"
```bash
# AWS 설정 확인
aws sts get-caller-identity

# 안 되면 다시 설정
aws configure
```

#### 2. "Access denied for Bedrock"
- [AWS Bedrock 콘솔](https://console.aws.amazon.com/bedrock/)에서 모델 액세스 요청
- Claude 3 Sonnet 모델 활성화 확인

#### 3. "BigKinds API key not found"
- `.env` 파일에서 `BIGKINDS_API_KEY` 확인
- 값이 `your_bigkinds_api_key_here`이면 실제 키로 교체

#### 4. "Port already in use"
```bash
# 다른 포트로 실행
PORT=8001 ./run_local.sh

# 또는 기존 프로세스 종료
lsof -ti:8000 | xargs kill -9
```

#### 5. Python 의존성 오류
```bash
# 가상환경 재생성
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 개발 모드

### 핫 리로딩 활성화
```bash
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### 로그 레벨 설정
`.env` 파일에서:
```env
LOG_LEVEL=DEBUG  # 더 자세한 로그
DEBUG=true       # 개발 모드
```

### API 응답 확인
- 로그 파일: `logs/` 디렉토리에 저장됨
- 실시간 로그: 터미널에서 확인

## 다음 단계

1. **프론트엔드 연동**: React 앱과 연결하기
2. **AWS 배포**: Lambda + API Gateway로 배포하기
3. **데이터베이스**: Redis 캐싱 설정하기

도움이 필요하시면 언제든 문의하세요! 😊