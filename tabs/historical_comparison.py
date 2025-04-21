import streamlit as st
from datetime import datetime, timedelta
from utils import make_api_request
from config import API_KEY, ENDPOINTS

def render(selected_date, debug_mode):
    """'과거 데이터 비교' 탭 UI 및 로직 렌더링"""
    st.header("📊 과거 데이터 비교")

    # 세션 상태에서 분석 결과 확인 (분석이 먼저 수행되어야 함)
    if "analysis_result" not in st.session_state or not st.session_state.analysis_result.get('query'):
        st.info("먼저 '이슈 분석' 탭에서 분석을 실행해주세요. 비교할 키워드가 필요합니다.")
        st.stop()

    analysis_result = st.session_state.analysis_result
    query = analysis_result.get('query')
    issue_topic = analysis_result.get('issue_topic', '선택된 이슈')
    st.subheader(f"'{issue_topic}' 관련 과거 기사")
    st.write(f"(검색 키워드: `{query}`)")

    # 비교 기간 선택 옵션
    comparison_options = {
        "1주 전": 7,
        "2주 전": 14,
        "4주 전": 28,
        "2달 전": 60, # 예시 추가
        "3달 전": 90  # 예시 추가
    }
    
    selected_periods = st.multiselect(
        "비교할 과거 기간 선택 (기준일로부터)",
        options=list(comparison_options.keys()),
        default=["1주 전", "2주 전"] # 기본 선택
    )

    if not selected_periods:
        st.info("비교할 과거 기간을 선택해주세요.")
        st.stop()

    st.divider()

    # 선택된 기간별 데이터 조회 및 표시
    for period_label in selected_periods:
        days_ago = comparison_options[period_label]
        
        # 해당 주의 시작일과 종료일 계산 (월요일 ~ 일요일 기준)
        # 기준일로부터 days_ago 만큼 이전 날짜를 포함하는 주의 월요일/일요일 계산
        target_past_date = selected_date - timedelta(days=days_ago)
        period_start = target_past_date - timedelta(days=target_past_date.weekday()) # 해당 주의 월요일
        period_end = period_start + timedelta(days=6) # 해당 주의 일요일
        
        expander_title = f"{period_label} 데이터 ({period_start.strftime('%Y-%m-%d')} ~ {period_end.strftime('%Y-%m-%d')})"
        with st.expander(expander_title):
            with st.spinner(f"{period_label} 데이터를 검색 중..."):
                historical_data = {
                    "argument": {
                        "query": query,
                        "published_at": {
                            "from": period_start.strftime("%Y-%m-%d"),
                            "until": period_end.strftime("%Y-%m-%d")
                        },
                        "provider": ["02100201"], # 서울경제
                        "sort": {"date": "desc"},
                        "return_from": 0,
                        "return_size": 10, # 각 기간별 상위 10개 뉴스
                        "fields": ["title", "published_at", "provider", "news_id"]
                    }
                }

                historical_result = make_api_request(API_KEY, ENDPOINTS.get("search_news"), historical_data, debug=debug_mode)

                if historical_result:
                    news_list = historical_result.get("documents", [])
                    if news_list:
                        st.write(f"**검색된 기사: {len(news_list)}개**")
                        for i, news in enumerate(news_list):
                            st.markdown(f"**{i+1}. {news.get('title', '제목 없음')}**")
                            st.caption(f"출처: {news.get('provider', '미상')} | 발행: {news.get('published_at', '')[:10]}")
                            st.divider()
                    else:
                        st.info(f"해당 기간에 '{query}' 관련 기사가 없습니다.")
                else:
                    st.error(f"{period_label} 데이터를 불러오는데 실패했습니다.") 