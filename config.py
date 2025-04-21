import os
import streamlit as st

# API 엔드포인트 설정
ENDPOINTS = {
    "search_news": "https://tools.kinds.or.kr/search/news",
    "issue_ranking": "https://tools.kinds.or.kr/issue_ranking",
    "word_cloud": "https://tools.kinds.or.kr/word_cloud",
    "time_line": "https://tools.kinds.or.kr/time_line"
}

# 모듈 레벨에서 실행되지 않도록 API 키 로딩 로직을 함수로 이동
def load_api_key():
    """Streamlit Secrets에서 API 키 로드 (또는 .env 파일에서 로드)"""
    try:
        # Streamlit Secrets에서 API 키 로딩 시도
        api_key = st.secrets["BIGKINDS_KEY"]
    except:
        # Streamlit Secrets 로딩 실패 시 .env 파일에서 로드
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("BIGKINDS_KEY")
    
    return api_key

# 초기에는 None으로 설정하고, 나중에 check_api_key()에서 로드
API_KEY = None

def check_api_key():
    """API 키 유효성 확인 및 사이드바에 상태 표시"""
    global API_KEY
    if API_KEY is None:
        API_KEY = load_api_key()
        
    if API_KEY:
        masked_key = "●" * (len(API_KEY) - 4) + API_KEY[-4:] if len(API_KEY) > 4 else "●●●●"
        st.sidebar.success(f"API 키 로드됨: {masked_key}")
        return True
    else:
        st.error("API 키를 불러올 수 없습니다. Streamlit Secrets에 BIGKINDS_KEY가 설정되어 있는지 확인하세요.")
        st.stop()
        return False