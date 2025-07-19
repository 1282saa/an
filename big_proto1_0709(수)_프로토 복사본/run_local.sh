#!/bin/bash

# BigKinds News Concierge 로컬 실행 스크립트

set -e  # 오류 시 스크립트 중단

echo "🚀 BigKinds News Concierge 로컬 서버 시작..."

# 현재 디렉토리 확인
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt 파일을 찾을 수 없습니다."
    echo "프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

# .env 파일 존재 확인
if [ ! -f ".env" ]; then
    echo "❌ .env 파일이 없습니다."
    echo "env.example을 복사하여 .env 파일을 만들고 설정을 완료해주세요:"
    echo "cp env.example .env"
    echo "그 후 .env 파일을 편집하여 API 키들을 설정하세요."
    exit 1
fi

# Python 버전 확인
python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
echo "🐍 Python 버전: $python_version"

# 가상환경 확인 및 생성
if [ ! -d "venv" ]; then
    echo "📦 Python 가상환경 생성 중..."
    python3 -m venv venv
fi

# 가상환경 활성화
echo "🔄 가상환경 활성화 중..."
source venv/bin/activate

# 의존성 설치
echo "📦 의존성 설치 중..."
pip install --upgrade pip
pip install -r requirements.txt

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI가 설치되지 않았습니다."
    echo "AWS 기능을 사용하려면 AWS CLI를 설치하고 설정해주세요:"
    echo "brew install awscli (macOS)"
    echo "aws configure"
else
    # AWS 자격 증명 확인
    if aws sts get-caller-identity &> /dev/null; then
        echo "✅ AWS 자격 증명 확인됨"
    else
        echo "⚠️  AWS 자격 증명이 설정되지 않았습니다."
        echo "다음 명령어로 설정해주세요:"
        echo "aws configure"
    fi
fi

# 환경 변수 확인
echo "🔍 환경 변수 확인 중..."
source .env

if [ -z "$BIGKINDS_API_KEY" ] || [ "$BIGKINDS_API_KEY" = "your_bigkinds_api_key_here" ]; then
    echo "⚠️  BIGKINDS_API_KEY가 설정되지 않았습니다."
    echo ".env 파일에서 BIGKINDS_API_KEY를 실제 값으로 설정해주세요."
fi

# 백엔드 서버 시작
echo "🌐 FastAPI 서버 시작 중..."
echo "서버 주소: http://localhost:${PORT:-8000}"
echo "API 문서: http://localhost:${PORT:-8000}/api/docs"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요."
echo ""

# uvicorn으로 서버 실행
cd backend
python -m uvicorn server:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --reload --reload-dir . --reload-dir ../config