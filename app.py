import streamlit as st
from datetime import datetime, timedelta

# 설정, 유틸리티, 탭 모듈 임포트
from config import check_api_key
from utils import setup_korean_font
import dashboard  # 대시보드 모듈 임포트
import detail_page  # 상세 페이지 모듈 임포트

# --- 페이지 설정 (가장 먼저 호출) ---
st.set_page_config(page_title="뉴스 이슈 분석 시스템", layout="wide", initial_sidebar_state="expanded")

# --- 초기화 ---
# 한글 폰트 설정
setup_korean_font()

# API 키 확인
if not check_api_key():
    st.stop() # API 키 없으면 중단

# 세션 상태 초기화
if 'view' not in st.session_state:
    st.session_state.view = 'dashboard' # 기본 뷰는 대시보드
if 'selected_issue_data' not in st.session_state:
    st.session_state.selected_issue_data = None # 선택된 이슈 데이터 초기화
if 'selected_date' not in st.session_state:
    st.session_state.selected_date = datetime.now().date()
if 'days_to_analyze' not in st.session_state:
    st.session_state.days_to_analyze = 30

# --- 사이드바 (기존 로직 유지) --- 
with st.sidebar:
    # 로고 이미지 URL 유효성 확인 후 로드 시도
    logo_url = "https://raw.githubusercontent.com/1282saa/sene/main/ai%20%EA%B2%80%EC%83%89/%EB%B9%85%EC%B9%B4%EC%9D%B8%EC%A6%88_%EC%8B%A4%ED%97%981_files/logo-white.svg"
    try:
        st.markdown("## 뉴스 분석") # 임시 텍스트 로고
    except Exception:
        st.sidebar.write("로고 로딩 중 오류 발생.")

    st.header("📅 분석 기준 설정")
    today = datetime.now().date()
    date_option = st.radio("기준 날짜 선택", ["오늘", "어제", "직접 선택"], index=0, horizontal=True)
    
    if date_option == "오늘":
        selected_date = today
    elif date_option == "어제":
        selected_date = today - timedelta(days=1)
    else:
        selected_date = st.date_input("분석 기준 날짜", today, max_value=today)
    
    st.session_state.selected_date = selected_date  # 세션 상태에 저장
    st.caption(f"선택된 기준 날짜: {selected_date.strftime('%Y-%m-%d')}")
    
    st.header("⏱️ 분석 기간 설정")
    days_to_analyze = st.slider("타임라인 분석 기간 (일)", 7, 90, 30, help="이슈 분석 시 시간별 추이를 볼 기간입니다.") 
    st.session_state.days_to_analyze = days_to_analyze  # 세션 상태에 저장
    st.caption(f"타임라인 분석 기간: {days_to_analyze}일")
    
    st.divider()
    debug_mode = st.checkbox("🐞 디버그 모드", value=False, help="API 요청/응답 등 상세 정보를 출력합니다.")

# --- 메인 영역 렌더링 --- 
if st.session_state.view == 'dashboard':
    # === 대시보드 뷰 렌더링 ===
    dashboard.render_dashboard(selected_date, debug_mode)

elif st.session_state.view == 'detail':
    # === 상세 페이지 뷰 렌더링 ===
    if st.session_state.selected_issue_data:
        detail_page.render_detail_page(st.session_state.selected_issue_data, debug_mode)
    else:
        st.warning("표시할 이슈 데이터가 없습니다. 대시보드로 돌아갑니다.")
        st.button("대시보드로 돌아가기", on_click=lambda: st.session_state.update(view='dashboard', selected_issue_data=None))

# --- 푸터 (기존 로직 유지) --- 
st.divider()
st.caption("© 2025 Seoul Economic Daily News | 빅카인즈 API 기반")