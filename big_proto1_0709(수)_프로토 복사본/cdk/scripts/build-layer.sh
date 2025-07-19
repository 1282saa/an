#!/bin/bash

# Lambda Layer 의존성 빌드 스크립트

set -e

echo "🔨 Lambda Layer 의존성 빌드 시작..."

# 현재 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LAYER_DIR="$PROJECT_ROOT/lambda-layers/dependencies"

# 기존 레이어 디렉토리 정리
echo "🧹 기존 레이어 디렉토리 정리..."
rm -rf "$LAYER_DIR"
mkdir -p "$LAYER_DIR/python"

# Python 의존성 설치
echo "📦 Python 의존성 설치 중..."
cd "$PROJECT_ROOT"

# requirements.txt에서 의존성 설치 (Lambda에서 사용할 라이브러리만)
pip install \
    boto3==1.34.0 \
    botocore==1.34.0 \
    pydantic==2.3.0 \
    httpx==0.24.1 \
    python-dotenv==1.0.0 \
    -t "$LAYER_DIR/python" \
    --no-deps

# 추가로 필요한 의존성들
pip install \
    requests==2.31.0 \
    python-json-logger==2.0.7 \
    tenacity==8.2.0 \
    -t "$LAYER_DIR/python"

# 불필요한 파일들 제거 (Lambda 패키지 크기 최적화)
echo "🗂️ 불필요한 파일 제거 중..."
cd "$LAYER_DIR/python"

# __pycache__ 디렉토리 제거
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# .pyc 파일 제거
find . -name "*.pyc" -delete 2>/dev/null || true

# 테스트 관련 파일 제거
find . -name "test*" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*test*" -name "*.py" -delete 2>/dev/null || true

# 문서 파일 제거
find . -name "*.md" -delete 2>/dev/null || true
find . -name "*.rst" -delete 2>/dev/null || true
find . -name "*.txt" -delete 2>/dev/null || true

# 예제 파일 제거
find . -name "example*" -delete 2>/dev/null || true
find . -name "sample*" -delete 2>/dev/null || true

echo "✅ Lambda Layer 빌드 완료!"
echo "📍 Layer 경로: $LAYER_DIR"
echo "📊 Layer 크기: $(du -sh "$LAYER_DIR" | cut -f1)"

# Layer 내용 요약
echo ""
echo "📋 설치된 주요 패키지:"
ls -la "$LAYER_DIR/python" | grep "^d" | awk '{print "  - " $9}' | head -10

echo ""
echo "🎯 다음 단계: CDK 배포"
echo "cd cdk && npm run deploy"