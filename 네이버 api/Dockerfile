FROM python:3.9-slim

WORKDIR /app

# 필요한 파일 복사
COPY requirements.txt .
COPY app.py .
COPY wsgi.py .
COPY templates/ templates/
COPY static/ static/

# 필요한 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# 포트 설정 (Cloud Run은 PORT 환경 변수를 사용)
ENV PORT=8080

# 컨테이너 실행 시 실행될 명령어
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app 