# BigKinds News Concierge - AWS CDK Infrastructure

AWS CDK를 사용한 서버리스 인프라 정의

## 구조

```
cdk/
├── bin/                    # CDK 앱 진입점
├── lib/                    # CDK 스택 정의
├── scripts/                # 빌드 스크립트
├── package.json           # Node.js 의존성
├── tsconfig.json          # TypeScript 설정
└── cdk.json              # CDK 설정
```

## 빠른 시작

```bash
# 의존성 설치
npm install

# Lambda Layer 빌드
../deploy-cdk.sh
```

## 개발 명령어

```bash
# 빌드
npm run build

# 변경사항 확인
npm run diff

# 배포
npm run deploy

# 삭제
npm run destroy
```

## 상세 가이드

전체 배포 가이드는 상위 디렉토리의 `CDK_DEPLOYMENT.md`를 참고하세요.