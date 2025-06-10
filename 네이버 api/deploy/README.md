# 네이버 뉴스 검색 웹사이트 배포 가이드

이 가이드는 네이버 뉴스 검색 웹사이트를 PythonAnywhere에 배포하는 방법을 설명합니다.

## 1. PythonAnywhere 계정 생성

1. [PythonAnywhere](https://www.pythonanywhere.com/) 웹사이트에 접속합니다.
2. "Pricing & Signup" 버튼을 클릭하고 무료 계정(Beginner)을 선택합니다.
3. 계정 정보를 입력하고 가입을 완료합니다.

## 2. 프로젝트 파일 업로드

1. PythonAnywhere 대시보드에서 "Files" 탭을 클릭합니다.
2. "Upload a file" 버튼을 클릭하여 아래 파일들을 업로드합니다:

   - app.py
   - wsgi.py
   - requirements.txt
   - templates/ 디렉토리 내의 모든 파일
   - static/ 디렉토리 내의 모든 파일

   또는 다음과 같이 업로드할 수 있습니다:

   - 모든 파일을 압축하여 ZIP 파일로 만듭니다.
   - ZIP 파일을 업로드합니다.
   - PythonAnywhere 콘솔에서 `unzip 파일명.zip` 명령어를 사용하여 압축을 풉니다.

## 3. 가상 환경 설정

1. PythonAnywhere 대시보드에서 "Consoles" 탭을 클릭합니다.
2. "Start a new console" 섹션에서 "Bash"를 선택하여 새 콘솔을 엽니다.
3. 다음 명령어를 실행하여 가상 환경을 생성하고 활성화합니다:

```bash
mkvirtualenv --python=python3.9 venv
```

4. 가상 환경이 활성화되면 다음 명령어를 실행하여 필요한 패키지를 설치합니다:

```bash
pip install -r requirements.txt
```

## 4. 웹 애플리케이션 설정

1. PythonAnywhere 대시보드에서 "Web" 탭을 클릭합니다.
2. "Add a new web app" 버튼을 클릭합니다.
3. 도메인 이름을 확인하고 "Next" 버튼을 클릭합니다.
4. "Manual configuration"을 선택하고 "Next" 버튼을 클릭합니다.
5. Python 버전으로 "Python 3.9"를 선택하고 "Next" 버튼을 클릭합니다.

## 5. WSGI 파일 구성

1. "Web" 탭에서 WSGI 파일 경로를 찾아 클릭합니다.
2. 파일 내용을 모두 지우고 다음 코드를 붙여넣습니다:

```python
import sys
import os

# 프로젝트 디렉토리 경로 설정
path = '/home/YOUR_USERNAME/프로젝트_디렉토리'
if path not in sys.path:
    sys.path.append(path)

from app import app as application
```

3. `YOUR_USERNAME`을 PythonAnywhere 사용자 이름으로 변경하고, `프로젝트_디렉토리`를 실제 프로젝트 디렉토리 경로로 변경합니다.
4. "Save" 버튼을 클릭하여 저장합니다.

## 6. 가상 환경 경로 설정

1. "Web" 탭으로 돌아갑니다.
2. "Virtualenv" 섹션에서 "Enter path to a virtualenv" 입력란에 다음을 입력합니다:

```
/home/YOUR_USERNAME/.virtualenvs/venv
```

3. `YOUR_USERNAME`을 PythonAnywhere 사용자 이름으로 변경합니다.
4. "Check path" 버튼을 클릭하여 경로를 확인합니다.

## 7. 정적 파일 설정

1. "Web" 탭에서 "Static files" 섹션을 찾습니다.
2. "/static/" URL에 대해 다음 경로를 추가합니다:

```
/home/YOUR_USERNAME/프로젝트_디렉토리/static
```

3. `YOUR_USERNAME`을 PythonAnywhere 사용자 이름으로 변경하고, `프로젝트_디렉토리`를 실제 프로젝트 디렉토리 경로로 변경합니다.

## 8. 웹 앱 재시작

1. "Web" 탭에서 "Reload" 버튼을 클릭하여 웹 앱을 재시작합니다.
2. 사이트 주소(예: `http://username.pythonanywhere.com`)를 클릭하여 배포된 웹사이트에 접속합니다.

## 9. 문제 해결

배포 과정에서 문제가 발생하면 PythonAnywhere의 "Web" 탭에서 "Error log" 링크를 클릭하여 오류 로그를 확인할 수 있습니다. 일반적인 문제는 다음과 같습니다:

1. 경로 문제: WSGI 파일에서 프로젝트 디렉토리 경로가 올바르게 설정되었는지 확인합니다.
2. 가상 환경 문제: 가상 환경이 올바르게 설정되었는지 확인합니다.
3. 패키지 문제: 필요한 모든 패키지가 설치되었는지 확인합니다.

## 10. 네이버 API 키 보안

네이버 API 키(클라이언트 ID와 시크릿)를 안전하게 관리하기 위해 다음 단계를 수행할 수 있습니다:

1. app.py 파일에서 API 키를 직접 하드코딩하는 대신 환경 변수에서 가져오도록 코드를 수정합니다.
2. PythonAnywhere의 "Web" 탭에서 "Environment variables" 섹션에 API 키를 추가합니다.

## 11. 유지 관리

- 무료 PythonAnywhere 계정은 3개월 동안 활동이 없으면 비활성화될 수 있으므로 정기적으로 웹사이트에 접속하여 활성 상태를 유지하세요.
- 코드를 업데이트할 때는 PythonAnywhere에 파일을 업로드하고 "Web" 탭에서 "Reload" 버튼을 클릭하여 웹 앱을 재시작해야 합니다.
