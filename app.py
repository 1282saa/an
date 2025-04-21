import streamlit as st
from datetime import datetime, timedelta

# 설정, 유틸리티, 탭 모듈 임포트
from config import check_api_key
from utils import setup_korean_font
# dashboard와 detail_page 모듈을 임포트할 예정 (다음 단계에서 생성)
# from tabs import today_issues, issue_analysis, historical_comparison
from tabs import issue_analysis, historical_comparison # 우선 기존 탭 임포트 유지 (detail_page에서 사용 예정)
import dashboard # 수정: dashboard 모듈 임포트
# import detail_page # 다음 단계에서 임포트 예정

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
# 기존 세션 상태 변수 (필요시 유지 또는 제거)
# if 'selected_issue' not in st.session_state: st.session_state.selected_issue = None
# if 'analysis_result' not in st.session_state: st.session_state.analysis_result = None
# if 'go_to_analysis' not in st.session_state: st.session_state.go_to_analysis = False
# if 'active_tab' not in st.session_state: st.session_state.active_tab = "오늘의 이슈"

# --- 사이드바 (기존 로직 유지) --- 
with st.sidebar:
    # 로고 이미지 URL 유효성 확인 후 로드 시도
    logo_url = "https://raw.githubusercontent.com/1282saa/sene/main/ai%20%EA%B2%80%EC%83%89/%EB%B9%85%EC%B9%B4%EC%9D%B8%EC%A6%88_%EC%8B%A4%ED%97%981_files/logo-white.svg"
    try:
        # 간단히 헤더 확인으로 이미지 유효성 검사
        # import requests # 필요시 requests 임포트
        # response = requests.head(logo_url, timeout=5)
        # if response.status_code == 200 and 'image' in response.headers.get('Content-Type', ''):
        #     st.image(logo_url, width=150)
        # else:
        #     st.sidebar.write("로고 이미지를 로드할 수 없습니다.")
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
    
    st.caption(f"선택된 기준 날짜: {selected_date.strftime('%Y-%m-%d')}")
    st.header("⏱️ 분석 기간 설정")
    days_to_analyze = st.slider("타임라인 분석 기간 (일)", 7, 90, 30, help="이슈 분석 시 시간별 추이를 볼 기간입니다.") 
    st.caption(f"타임라인 분석 기간: {days_to_analyze}일")
    st.divider()
    debug_mode = st.checkbox("🐞 디버그 모드", value=False, help="API 요청/응답 등 상세 정보를 출력합니다.")

# --- 메인 영역 렌더링 --- 
if st.session_state.view == 'dashboard':
    # === 대시보드 뷰 렌더링 ===
    # st.title("📰 서울경제 뉴스 대시보드") # dashboard.py에서 타이틀 설정
    # st.write(f"{selected_date.strftime('%Y년 %m월 %d일')} 기준 주요 이슈입니다.")
    dashboard.render_dashboard(selected_date, debug_mode) # 수정: dashboard 모듈의 함수 호출
    # st.info("대시보드 UI가 여기에 표시됩니다. (다음 단계에서 구현)") 
    # 임시 today_issues 호출 제거
    # from tabs import today_issues
    # today_issues.render(selected_date, debug_mode) 

elif st.session_state.view == 'detail':
    # === 상세 페이지 뷰 렌더링 (다음 단계에서 detail_page.py 생성 및 연결) ===
    # st.title("🔍 이슈 상세 분석") # detail_page.py에서 타이틀 설정 예정
    if st.session_state.selected_issue_data:
        # 여기에 detail_page.render(...) 호출 예정
        # 임시 상세 뷰 내용 유지
        st.title("🔍 이슈 상세 분석 (임시)")
        st.write(f"선택된 이슈: {st.session_state.selected_issue_data.get('topic', 'N/A')}")
        st.info("이슈 상세 페이지 UI가 여기에 표시됩니다. (다음 단계에서 구현)")
        tab1, tab2 = st.tabs(["현재 이슈 분석", "과거 데이터 비교"])
        with tab1:
             # 상세 페이지로 이동 시, 분석이 자동으로 실행되도록 하거나, 버튼을 유지해야 함
             # 우선 기존 issue_analysis.render 호출 유지 (버튼이 내부에 있음)
             issue_analysis.render(selected_date, days_to_analyze, debug_mode)
        with tab2:
             historical_comparison.render(selected_date, debug_mode)
        # 뒤로가기 버튼
        if st.button("◀ 대시보드로 돌아가기"):
            st.session_state.view = 'dashboard'
            st.session_state.selected_issue_data = None # 선택된 이슈 초기화
            # 이전 분석 결과도 초기화할지 결정 필요
            if 'analysis_result' in st.session_state: 
                del st.session_state.analysis_result
            st.rerun()
    else:
        st.warning("표시할 이슈 데이터가 없습니다. 대시보드로 돌아갑니다.")
        st.session_state.view = 'dashboard'
        st.rerun()

# --- 푸터 (기존 로직 유지) --- 
st.divider()
st.caption("© 2025 Seoul Economic Daily News | 빅카인즈 API 기반") 