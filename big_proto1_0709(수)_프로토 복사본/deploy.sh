#!/bin/bash

# Dynamic Prompt System 배포 스크립트
# 로컬에서 직접 실행하거나 GitHub Actions 대안으로 사용

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 환경 변수 확인
if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="ap-northeast-2"
    print_warning "AWS_REGION이 설정되지 않아 기본값($AWS_REGION)을 사용합니다."
fi

# 1. 백엔드 배포
print_step "백엔드 배포 시작"
if [ -d "cdk" ]; then
    cd cdk
    pip install -r requirements.txt
    cdk deploy BedrockDiyAuthStack --require-approval never
    cd ..
    print_success "백엔드 배포 완료"
else
    print_error "cdk 폴더를 찾을 수 없습니다."
    exit 1
fi

# 2. API Gateway URL 가져오기
print_step "API Gateway URL 조회"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name BedrockDiyAuthStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

if [ -z "$API_URL" ]; then
    print_error "API Gateway URL을 가져올 수 없습니다."
    exit 1
fi
print_success "API URL: $API_URL"

# 3. 프론트엔드 빌드
print_step "프론트엔드 빌드 시작"
if [ -d "frontend" ]; then
    cd frontend
    echo "REACT_APP_API_URL=$API_URL" > .env.production
    npm ci
    npm run build
    cd ..
    print_success "프론트엔드 빌드 완료"
else
    print_error "frontend 폴더를 찾을 수 없습니다."
    exit 1
fi

# 4. 프론트엔드 스택 배포 (S3 + CloudFront)
print_step "프론트엔드 인프라 배포"
cd cdk
cdk deploy FrontendStack --require-approval never
cd ..
print_success "프론트엔드 인프라 배포 완료"

# 5. S3 배포
print_step "S3 배포 시작"
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name FrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
    print_error "S3 버킷 이름을 가져올 수 없습니다."
    exit 1
fi

aws s3 sync frontend/build/ s3://$BUCKET_NAME --delete
print_success "S3 배포 완료"

# 6. CloudFront 캐시 무효화
print_step "CloudFront 캐시 무효화 시작"
DISTRIBUTION_ID=$(aws cloudfront describe-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3.$AWS_REGION.amazonaws.com'].Id" \
  --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
    print_error "CloudFront 배포 ID를 가져올 수 없습니다."
    exit 1
fi

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)
print_success "캐시 무효화 ID: $INVALIDATION_ID"

# 7. 배포 완료
print_step "배포 완료"
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name FrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
  --output text)

echo ""
echo "🎉 배포가 성공적으로 완료되었습니다!"
echo ""
echo "📱 Frontend URL: $FRONTEND_URL"
echo "🔗 API URL: $API_URL"
echo ""
print_success "Dynamic Prompt System이 준비되었습니다!"