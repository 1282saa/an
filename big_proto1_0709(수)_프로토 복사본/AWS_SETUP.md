# AWS 설정 가이드

## 1. AWS 계정 및 인증 설정

### AWS 계정 생성
1. [AWS 콘솔](https://aws.amazon.com/ko/)에서 계정을 생성하세요
2. 신용카드 정보를 입력해야 하지만, 프리티어 사용량 내에서는 무료입니다

### AWS CLI 설치
```bash
# macOS
brew install awscli

# Windows
# AWS CLI 공식 사이트에서 msi 파일 다운로드

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### AWS 액세스 키 생성
1. [AWS IAM 콘솔](https://console.aws.amazon.com/iam/)로 이동
2. 왼쪽 메뉴에서 "사용자" 클릭
3. "사용자 추가" 버튼 클릭
4. 사용자 이름 입력 (예: `bigkinds-user`)
5. "프로그래밍 방식 액세스" 선택
6. 권한 설정에서 "기존 정책 직접 연결" 선택
7. 다음 정책들을 검색해서 선택:
   - `AmazonBedrockFullAccess` (Bedrock 사용을 위해)
   - `AWSLambdaFullAccess` (나중에 배포할 때)
   - `AmazonAPIGatewayAdministrator` (API Gateway 사용을 위해)
   - `AmazonDynamoDBFullAccess` (DynamoDB 사용을 위해)
8. 태그는 건너뛰고 검토 후 사용자 생성
9. **중요**: 액세스 키 ID와 비밀 액세스 키를 안전한 곳에 저장하세요!

### AWS CLI 설정
터미널에서 다음 명령어 실행:
```bash
aws configure
```

입력 정보:
- AWS Access Key ID: (위에서 생성한 액세스 키 ID)
- AWS Secret Access Key: (위에서 생성한 비밀 액세스 키)
- Default region name: `us-east-1`
- Default output format: `json`

### 설정 확인
```bash
aws sts get-caller-identity
```
정상적으로 설정되었다면 계정 정보가 출력됩니다.

## 2. AWS Bedrock 모델 액세스 활성화

### Bedrock 콘솔에서 모델 액세스 설정
1. [AWS Bedrock 콘솔](https://console.aws.amazon.com/bedrock/)로 이동
2. 왼쪽 메뉴에서 "Model access" 클릭
3. "Request access" 또는 "Manage model access" 버튼 클릭
4. Anthropic의 Claude 모델들을 찾아서 체크:
   - Claude 3 Sonnet
   - Claude 3 Haiku (더 빠른 응답용)
5. 사용 목적을 간단히 기재하고 요청 제출
6. **주의**: 모델 액세스 승인에는 몇 분에서 몇 시간이 걸릴 수 있습니다

### 리전 확인
- Bedrock Claude는 현재 `us-east-1`, `us-west-2` 등에서 지원됩니다
- 이 프로젝트는 `us-east-1`을 기본으로 설정되어 있습니다

## 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```bash
# .env 파일 생성
cp env.example .env
```

`.env` 파일을 편집하여 다음 내용을 입력:

```env
# BigKinds API 설정
BIGKINDS_API_KEY=your_bigkinds_api_key_here

# AWS 설정 (aws configure로 설정했다면 생략 가능)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1

# AWS Bedrock 설정
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# 애플리케이션 설정
STAGE=dev
DEBUG=true
```

## 4. 비용 관리

### 프리티어 한도
- Bedrock: 매월 제한된 무료 사용량 제공
- Lambda: 매월 100만 요청 무료
- API Gateway: 매월 100만 API 호출 무료
- DynamoDB: 25GB 저장공간, 25개 읽기/쓰기 용량 단위 무료

### 비용 알림 설정 (권장)
1. [AWS Billing 콘솔](https://console.aws.amazon.com/billing/)로 이동
2. "Budgets" 클릭
3. "Create budget" 클릭
4. 월 예산을 $10-20 정도로 설정하고 알림 설정

## 5. 보안 주의사항

### 액세스 키 보안
- `.env` 파일을 절대 Git에 커밋하지 마세요
- 액세스 키가 노출되면 즉시 새로 생성하고 기존 키는 삭제하세요
- IAM 사용자에게 최소 권한만 부여하세요

### .gitignore 확인
`.gitignore` 파일에 다음이 포함되어 있는지 확인:
```
.env
.env.local
.env.*.local
.aws-sam/
```

## 문제 해결

### 자주 발생하는 오류들

1. **"Unable to locate credentials"**
   - `aws configure` 다시 실행
   - `.env` 파일의 AWS 키 확인

2. **"Access denied for Bedrock"**
   - Bedrock 콘솔에서 모델 액세스 상태 확인
   - IAM 권한 확인

3. **"Region not supported"**
   - `us-east-1` 또는 `us-west-2` 사용 확인

도움이 필요하시면 언제든 말씀해주세요!