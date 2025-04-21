import streamlit as st
from datetime import datetime, timedelta

# 설정, 유틸리티, 탭 모듈 임포트
from config import check_api_key
from utils import setup_korean_font
from tabs import today_issues, issue_analysis, historical_comparison

# --- 페이지 설정 (가장 먼저 호출) ---
st.set_page_config(page_title="뉴스 이슈 분석 시스템", layout="wide", initial_sidebar_state="expanded")

# --- 초기화 ---
# 한글 폰트 설정
setup_korean_font()

# API 키 확인
if not check_api_key():
    st.stop() # API 키 없으면 중단

# 세션 상태 초기화 (필요한 경우)
if 'selected_issue' not in st.session_state:
    st.session_state.selected_issue = None
if 'analysis_result' not in st.session_state:
    st.session_state.analysis_result = None
if 'go_to_analysis' not in st.session_state:
    st.session_state.go_to_analysis = False
if 'active_tab' not in st.session_state:
    st.session_state.active_tab = "오늘의 이슈"

# --- 사이드바 --- 
with st.sidebar:
    st.image("https://github.com/user-attachments/assets/d6a3bc2a-43bd-45c3-91f5-1d83104c6257", width=150) # 로고 이미지 추가 (URL은 예시)
    st.header("📅 분석 기준 설정")
    
    # 날짜 선택
    today = datetime.now().date()
    date_option = st.radio("기준 날짜 선택", ["오늘", "어제", "직접 선택"], index=0, horizontal=True)
    
    if date_option == "오늘":
        selected_date = today
    elif date_option == "어제":
        selected_date = today - timedelta(days=1)
    else:
        selected_date = st.date_input("분석 기준 날짜", today, max_value=today)
    
    st.caption(f"선택된 기준 날짜: {selected_date.strftime('%Y-%m-%d')}")
    
    # 과거 데이터 분석 기간
    st.header("⏱️ 분석 기간 설정")
    days_to_analyze = st.slider("타임라인 분석 기간 (일)", 7, 90, 30, help="이슈 분석 시 시간별 추이를 볼 기간입니다.") 
    st.caption(f"타임라인 분석 기간: {days_to_analyze}일")

    # 디버그 모드 토글
    st.divider()
    debug_mode = st.checkbox("🐞 디버그 모드", value=False, help="API 요청/응답 등 상세 정보를 출력합니다.")

# --- 메인 영역 --- 
st.title("📰 서울경제 뉴스 이슈 분석")
st.write(f"{selected_date.strftime('%Y년 %m월 %d일')} 기준 뉴스 데이터 분석 결과입니다.")

# 탭 생성
tab_names = ["오늘의 이슈", "이슈 분석", "과거 데이터 비교"]

# 탭 전환 로직
if st.session_state.go_to_analysis:
    st.session_state.active_tab = "이슈 분석"
    st.session_state.go_to_analysis = False # 플래그 초기화

tab1, tab2, tab3 = st.tabs(tab_names)

# 각 탭 렌더링
with tab1:
    if st.session_state.active_tab == "오늘의 이슈":
        today_issues.render(selected_date, debug_mode)

with tab2:
    if st.session_state.active_tab == "이슈 분석":
        issue_analysis.render(selected_date, days_to_analyze, debug_mode)

with tab3:
    if st.session_state.active_tab == "과거 데이터 비교":
        historical_comparison.render(selected_date, debug_mode)

# 탭 상태 업데이트 (사용자가 탭을 직접 클릭했을 때)
# Streamlit 탭은 기본적으로 클릭 시 상태를 저장하지 않으므로, 
# URL query parameter나 다른 방식으로 현재 활성 탭을 추적해야 할 수 있음.
# 여기서는 버튼 클릭을 통한 전환만 구현.

# --- 푸터 --- 
st.divider()
st.caption("© 2025 Seoul Economic Daily News | 빅카인즈 API 기반") 