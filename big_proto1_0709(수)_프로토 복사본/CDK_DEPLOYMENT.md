# AWS CDK 배포 가이드 🚀

## 개요

AWS CDK (Cloud Development Kit)를 사용하여 BigKinds News Concierge를 서버리스 환경에 배포하는 가이드입니다.

## 🏗️ 인프라 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │     Lambda      │
│   (React)       │───▶│   WebSocket     │───▶│   WebSocket     │
│                 │    │                 │    │   Handler       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                              ┌─────────────────┐      │
                              │   DynamoDB      │◀─────┘
                              │  Connections    │
                              └─────────────────┘
                                       │
                              ┌─────────────────┐
                              │  AWS Bedrock    │
                              │    Claude       │
                              └─────────────────┘
```

## 📋 사전 요구사항

### 1. 개발 환경
- **Node.js**: 18.x 이상
- **Python**: 3.11 이상
- **AWS CLI**: 최신 버전
- **AWS CDK**: v2.87.0 이상

### 2. AWS 계정 설정
- AWS 계정 및 적절한 권한
- Bedrock Claude 모델 액세스 활성화
- 프리티어 또는 적절한 예산 설정

## 🚀 빠른 배포

### 1단계: 환경 설정
```bash
# AWS 자격 증명 설정
aws configure

# BigKinds API 키 설정
export BIGKINDS_API_KEY=your_bigkinds_api_key_here
```

### 2단계: 배포 실행
```bash
# 원클릭 배포
./deploy-cdk.sh
```

### 3단계: 배포 확인
배포 완료 후 출력되는 WebSocket URL을 확인하세요.

## 📖 상세 배포 과정

### 1. 사전 준비

#### AWS CLI 설치 및 설정
```bash
# macOS
brew install awscli

# 설정
aws configure
```

#### Node.js 의존성 설치
```bash
cd cdk
npm install
```

#### CDK CLI 설치 (전역)
```bash
npm install -g aws-cdk
```

### 2. CDK Bootstrap (최초 1회)
```bash
# AWS 계정/리전에 CDK 리소스 초기화
cdk bootstrap
```

### 3. Lambda Layer 빌드
```bash
# Python 의존성을 Lambda Layer로 빌드
./cdk/scripts/build-layer.sh
```

### 4. CDK 프로젝트 빌드
```bash
cd cdk
npm run build
```

### 5. 배포 전 변경사항 확인
```bash
npm run diff
```

### 6. 배포 실행
```bash
npm run deploy
```

## 🛠️ CDK 명령어

### 프로젝트 관리
```bash
cd cdk

# 빌드
npm run build

# 타입스크립트 감시 모드
npm run watch

# 변경사항 확인
npm run diff

# CloudFormation 템플릿 생성
npm run synth
```

### 배포 관리
```bash
# 배포
npm run deploy

# 특정 스택 배포
cdk deploy BigKindsNewsConciergeStack

# 스택 삭제
npm run destroy
```

### 로그 및 모니터링
```bash
# Lambda 로그 실시간 확인
aws logs tail /aws/lambda/BigKindsNewsConciergeStack-websocket-handler-dev --follow

# CloudFormation 스택 상태 확인
aws cloudformation describe-stacks --stack-name BigKindsNewsConciergeStack
```

## 🔧 환경별 배포

### 개발 환경 (dev)
```bash
export STAGE=dev
./deploy-cdk.sh dev us-east-1
```

### 프로덕션 환경 (prod)
```bash
export STAGE=prod
./deploy-cdk.sh prod us-east-1
```

## 📊 배포된 리소스

### AWS 서비스
- **Lambda Function**: WebSocket 핸들러
- **API Gateway**: WebSocket API
- **DynamoDB**: 연결 상태 관리
- **IAM Roles**: 최소 권한 원칙
- **CloudWatch**: 로깅 및 모니터링

### 자동 생성되는 리소스
- Lambda Layer (Python 의존성)
- CloudWatch Log Groups
- IAM 정책 및 역할
- API Gateway 스테이지

## 💰 비용 최적화

### 프리티어 범위
- **Lambda**: 월 100만 요청 무료
- **API Gateway**: 월 100만 API 호출 무료
- **DynamoDB**: 25GB 저장공간 무료
- **CloudWatch**: 기본 모니터링 무료

### 비용 모니터링
```bash
# 예산 알림 설정 (권장)
aws budgets create-budget --account-id YOUR_ACCOUNT_ID --budget file://budget.json
```

## 🔍 문제 해결

### 일반적인 오류

#### 1. "CDK Bootstrap 필요" 오류
```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

#### 2. "권한 부족" 오류
IAM 사용자에게 다음 권한 확인:
- CloudFormation 관리
- Lambda 관리  
- API Gateway 관리
- DynamoDB 관리
- IAM 역할 생성

#### 3. "Bedrock 액세스 거부" 오류
AWS Bedrock 콘솔에서 Claude 모델 액세스 활성화 필요

#### 4. "Layer 크기 초과" 오류
```bash
# Layer 정리 후 재빌드
rm -rf lambda-layers/
./cdk/scripts/build-layer.sh
```

### 디버깅 명령어
```bash
# CDK 상세 로그
cdk deploy --verbose

# CloudFormation 이벤트 확인
aws cloudformation describe-stack-events --stack-name BigKindsNewsConciergeStack

# Lambda 함수 테스트
aws lambda invoke --function-name BigKindsNewsConciergeStack-websocket-handler-dev --payload '{}' response.json
```

## 🔄 업데이트 및 롤백

### 코드 업데이트
```bash
# 코드 변경 후
npm run build
npm run deploy
```

### 롤백
```bash
# CloudFormation 콘솔에서 이전 버전으로 롤백
# 또는 Git에서 이전 커밋으로 복원 후 재배포
```

## 🧹 정리

### 전체 스택 삭제
```bash
cd cdk
npm run destroy
```

### 수동 정리가 필요한 리소스
- CloudWatch Log Groups (보존 기간 설정에 따라)
- DynamoDB 백업 (활성화한 경우)

## 🚀 다음 단계

1. **프론트엔드 연동**: WebSocket URL을 React 앱에 설정
2. **모니터링 설정**: CloudWatch 대시보드 구성
3. **CI/CD 파이프라인**: GitHub Actions 또는 CodePipeline 설정
4. **도메인 연결**: Route 53 및 Certificate Manager 설정

도움이 필요하시면 언제든 문의하세요! 😊