import sys
import os

# 프로젝트 디렉토리를 Python 경로에 추가
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

# app.py에서 app 객체 가져오기
from app import app as application 