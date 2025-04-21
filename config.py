import os
from dotenv import load_dotenv
import streamlit as st

# 환경 변수 로드
load_dotenv()

# API 키 로딩
API_KEY = os.getenv("BIGKINDS_KEY")

# API 엔드포인트 설정
ENDPOINTS = {
    "search_news": "https://tools.kinds.or.kr/search/news",
    "issue_ranking": "https://tools.kinds.or.kr/issue_ranking",
    "word_cloud": "https://tools.kinds.or.kr/word_cloud",
    "time_line": "https://tools.kinds.or.kr/time_line"
}

def check_api_key():
    """API 키 유효성 확인 및 사이드바에 상태 표시"""
    if API_KEY:
        masked_key = "●" * (len(API_KEY) - 4) + API_KEY[-4:] if len(API_KEY) > 4 else "●●●●"
        st.sidebar.success(f"API 키 로드됨: {masked_key}")
        return True
    else:
        st.error("API 키를 불러올 수 없습니다. Streamlit Secrets에 BIGKINDS_KEY가 설정되어 있는지 확인하세요.")
        st.stop()
        return False 