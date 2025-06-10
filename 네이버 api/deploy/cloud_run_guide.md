# Google Cloud Run 배포 가이드

이 가이드는 네이버 뉴스 검색 웹사이트를 Google Cloud Run에 배포하는 방법을 설명합니다.

## 1. 사전 준비사항

### 1.1. Google Cloud 계정 및 프로젝트 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속하여 계정을 생성하거나 로그인합니다.
2. 새 프로젝트를 생성하거나 기존 프로젝트를 선택합니다.
3. 결제 계정을 연결합니다(Google Cloud Run은 사용량에 따라 요금이 부과됩니다. 무료 등급이 있어 소규모 프로젝트는 무료로 사용할 수 있습니다).

### 1.2. Google Cloud SDK 설치

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) 설치 페이지에서 운영체제에 맞는 SDK를 다운로드하고 설치합니다.
2. 설치 후 터미널에서 다음 명령어로 인증합니다:
   ```bash
   gcloud auth login
   ```
3. 프로젝트를 설정합니다:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

### 1.3. Docker 설치

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/)을 다운로드하고 설치합니다.
2. 설치 후 Docker가 실행 중인지 확인합니다:
   ```bash
   docker --version
   ```

## 2. 애플리케이션 컨테이너화

### 2.1. Dockerfile 준비

프로젝트 루트 디렉토리에 이미 생성한 Dockerfile이 있어야 합니다. 내용을 확인하고 필요한 경우 수정합니다.

### 2.2. 네이버 API 키 환경 변수 설정

보안을 위해 네이버 API 키를 환경 변수로 관리하도록 이미 app.py를 수정했습니다.

## 3. Google Cloud Run 배포 과정

### 3.1. 필요한 API 활성화

터미널에서 다음 명령어를 실행하여 필요한 Google Cloud API를 활성화합니다:

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### 3.2. 컨테이너 빌드 및 Cloud Run 배포

다음 명령어로 한 번에 컨테이너를 빌드하고 Cloud Run에 배포할 수 있습니다:

```bash
gcloud run deploy naver-news-app \
  --source . \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars NAVER_CLIENT_ID=YOUR_CLIENT_ID,NAVER_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

명령어 설명:

- `naver-news-app`: 배포할 서비스 이름입니다.
- `--source .`: 현재 디렉토리의 소스 코드와 Dockerfile을 사용합니다.
- `--platform managed`: 완전 관리형 Cloud Run 서비스를 사용합니다.
- `--region asia-northeast3`: 서울 리전을 사용합니다(가장 가까운 리전).
- `--allow-unauthenticated`: 인증 없이 웹사이트에 접근할 수 있게 합니다(공개 웹사이트).
- `--set-env-vars`: 네이버 API 키를 환경 변수로 설정합니다.

### 3.3. 배포 URL 확인

배포가 완료되면 Cloud Run 서비스의 URL이 터미널에 표시됩니다. 이 URL을 통해 배포된 웹사이트에 접속할 수 있습니다.

```
Service [naver-news-app] revision [naver-news-app-00001-abcd] has been deployed and is serving 100 percent of traffic.
Service URL: https://naver-news-app-abcdefghij-du.a.run.app
```

## 4. 배포 업데이트

코드를 수정하고 다시 배포하려면 동일한 `gcloud run deploy` 명령어를 실행하면 됩니다:

```bash
gcloud run deploy naver-news-app \
  --source . \
  --platform managed \
  --region asia-northeast3
```

## 5. 모니터링 및 로그 확인

### 5.1. 대시보드 확인

[Google Cloud Console](https://console.cloud.google.com/)에서 "Cloud Run" 메뉴로 이동하여 서비스 상태를 확인할 수 있습니다.

### 5.2. 로그 확인

다음 명령어로 서비스 로그를 확인할 수 있습니다:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=naver-news-app" --limit=10
```

또는 Google Cloud Console의 Cloud Run 서비스 세부 정보 페이지에서 "로그" 탭을 확인하세요.

## 6. 비용 관리

Google Cloud Run은 사용량에 따라 요금이 부과됩니다. 비용을 관리하려면:

1. Google Cloud Console의 "결제" 섹션에서 비용 알림을 설정하세요.
2. 필요하지 않을 때는 서비스를 삭제하세요:
   ```bash
   gcloud run services delete naver-news-app
   ```

## 7. 문제 해결

### 7.1. 배포 실패

배포가 실패하면 오류 메시지를 확인하고 다음을 점검하세요:

- Dockerfile이 올바른지 확인
- 필요한 API가 활성화되었는지 확인
- 결제 계정이 정상적으로 설정되었는지 확인

### 7.2. 애플리케이션 오류

애플리케이션이 실행되지만 오류가 발생하면:

- 로그를 확인하여 오류 메시지 분석
- 환경 변수가 올바르게 설정되었는지 확인
- 특히 네이버 API 키가 올바르게 설정되었는지 확인

### 7.3. 네이버 API 제한

네이버 API는 하루 25,000회로 호출이 제한됩니다. 이 제한에 도달하면:

- 캐싱을 구현하여 API 호출 빈도 줄이기
- 사용량을 모니터링하고 필요한 경우 제한 조치 추가
