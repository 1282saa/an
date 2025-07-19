#!/bin/bash

# BigKinds News Concierge CDK 배포 스크립트

set -e

echo "🚀 BigKinds News Concierge CDK 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수 확인
STAGE=${1:-dev}
REGION=${2:-us-east-1}

echo -e "${BLUE}📋 배포 설정:${NC}"
echo -e "  - Stage: ${GREEN}$STAGE${NC}"
echo -e "  - Region: ${GREEN}$REGION${NC}"
echo ""

# 필수 환경 변수 확인
if [ -z "$BIGKINDS_API_KEY" ]; then
    echo -e "${RED}❌ BIGKINDS_API_KEY 환경 변수가 설정되지 않았습니다.${NC}"
    echo "다음 명령어로 설정해주세요:"
    echo "export BIGKINDS_API_KEY=your_api_key_here"
    exit 1
fi

echo -e "${GREEN}✅ BigKinds API Key: ${BIGKINDS_API_KEY:0:10}***${NC}"

# 도구 설치 확인
echo -e "${BLUE}🔍 필수 도구 확인 중...${NC}"

# AWS CLI 확인
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI가 설치되지 않았습니다.${NC}"
    echo "설치 방법: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다.${NC}"
    echo "설치 방법: https://nodejs.org/"
    exit 1
fi

# CDK CLI 확인
if ! command -v cdk &> /dev/null; then
    echo -e "${YELLOW}⚠️ AWS CDK CLI가 설치되지 않았습니다. 설치 중...${NC}"
    npm install -g aws-cdk
fi

echo -e "${GREEN}✅ 모든 필수 도구가 설치되어 있습니다.${NC}"

# AWS 자격 증명 확인
echo -e "${BLUE}🔐 AWS 자격 증명 확인 중...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS 자격 증명이 설정되지 않았습니다.${NC}"
    echo "aws configure 명령어로 설정해주세요."
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS 계정: ${AWS_ACCOUNT}${NC}"

# Lambda Layer 빌드
echo -e "${BLUE}📦 Lambda Layer 빌드 중...${NC}"
./cdk/scripts/build-layer.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lambda Layer 빌드 실패${NC}"
    exit 1
fi

# CDK 디렉토리로 이동
cd cdk

# CDK 의존성 설치
echo -e "${BLUE}📦 CDK 의존성 설치 중...${NC}"
npm install

# CDK Bootstrap (최초 1회만 필요)
echo -e "${BLUE}🔄 CDK Bootstrap 확인 중...${NC}"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION &> /dev/null; then
    echo -e "${YELLOW}⚠️ CDK Bootstrap이 필요합니다. 실행 중...${NC}"
    cdk bootstrap aws://${AWS_ACCOUNT}/${REGION}
else
    echo -e "${GREEN}✅ CDK Bootstrap이 이미 완료되어 있습니다.${NC}"
fi

# CDK 빌드
echo -e "${BLUE}🔨 CDK 프로젝트 빌드 중...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CDK 빌드 실패${NC}"
    exit 1
fi

# CDK 차이점 확인 (선택사항)
echo -e "${BLUE}🔍 변경사항 확인 중...${NC}"
cdk diff --context stage=$STAGE --context region=$REGION

# 배포 확인
echo ""
echo -e "${YELLOW}❓ 위 변경사항으로 배포를 진행하시겠습니까? (y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}ℹ️ 배포가 취소되었습니다.${NC}"
    exit 0
fi

# CDK 배포
echo -e "${BLUE}🚀 CDK 배포 중...${NC}"
export STAGE=$STAGE
export BIGKINDS_API_KEY=$BIGKINDS_API_KEY

cdk deploy \
    --context stage=$STAGE \
    --context region=$REGION \
    --require-approval never \
    --outputs-file ../cdk-outputs.json

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CDK 배포 실패${NC}"
    exit 1
fi

# 배포 완료
echo ""
echo -e "${GREEN}🎉 배포가 성공적으로 완료되었습니다!${NC}"
echo ""

# 출력 정보 표시
if [ -f "../cdk-outputs.json" ]; then
    echo -e "${BLUE}📋 배포된 리소스 정보:${NC}"
    cat ../cdk-outputs.json | jq -r 'to_entries[] | "\(.key): \(.value)"' | while read line; do
        echo -e "  ${GREEN}$line${NC}"
    done
    echo ""
fi

echo -e "${BLUE}🔗 다음 단계:${NC}"
echo -e "1. 출력된 WebSocket URL을 프론트엔드 환경 변수에 설정하세요"
echo -e "2. AWS Bedrock에서 Claude 모델 액세스를 활성화하세요"
echo -e "3. 애플리케이션을 테스트해보세요"
echo ""
echo -e "${BLUE}📚 유용한 명령어:${NC}"
echo -e "  - 로그 확인: ${YELLOW}aws logs tail /aws/lambda/BigKindsNewsConciergeStack-websocket-handler-${STAGE} --follow${NC}"
echo -e "  - 스택 삭제: ${YELLOW}cd cdk && cdk destroy${NC}"
echo -e "  - 상태 확인: ${YELLOW}aws cloudformation describe-stacks --stack-name BigKindsNewsConciergeStack${NC}"