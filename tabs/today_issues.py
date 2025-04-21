import streamlit as st
from datetime import datetime
from utils import make_api_request
from config import API_KEY, ENDPOINTS

def render(selected_date, debug_mode):
    """'오늘의 이슈' 탭 UI 및 로직 렌더링"""
    date_str = selected_date.strftime("%Y-%m-%d")
    date_str_no_dash = selected_date.strftime("%Y%m%d")

    st.header(f"📋 {date_str} 주요 이슈")

    # 오늘의 이슈 API 호출 (issue_ranking)
    with st.spinner(f"{date_str}의 이슈를 불러오는 중..."):
        # 디버깅: API 요청 전 날짜 확인
        st.write(f"DEBUG: API 요청 날짜 (사용 형식): {date_str}")
        issue_data = {
            "argument": {
                "date": date_str, # 수정: "YYYY-MM-DD" 형식 사용
                "provider": ["02100201"], # 서울경제 코드로 추정됨, 확인 필요
            }
        }

        issues_result = make_api_request(API_KEY, ENDPOINTS.get("issue_ranking"), issue_data, debug=debug_mode)

        if issues_result:
            topics = issues_result.get("topics", [])

            if not topics:
                st.warning(f"{date_str}에 해당하는 이슈를 찾을 수 없습니다.")
            else:
                st.success(f"{len(topics)}개의 이슈를 찾았습니다.")

                # 이슈 목록 표시 (제한 제거)
                for i, issue in enumerate(topics):  # 수정: [:10] 제한 제거
                    topic = issue.get("topic", "제목 없음")
                    news_count = len(issue.get("news_cluster", []))
                    keywords = issue.get("topic_keyword", "").split(",")[:10]  # 키워드는 여전히 상위 10개 표시

                    expander_title = f"{i+1}. {topic} (관련 기사: {news_count}개)"
                    with st.expander(expander_title):
                        # 키워드 표시
                        st.write("**주요 키워드:**")
                        st.write(", ".join(keywords))

                        # 관련 기사 ID 목록
                        news_cluster = issue.get("news_cluster", [])
                        if news_cluster:
                            st.write("**관련 기사 미리보기 (최대 5개):**")

                            # 관련 기사 상세 정보 가져오기
                            with st.spinner("관련 기사를 불러오는 중..."):
                                detail_data = {
                                    "argument": {
                                        "news_ids": news_cluster[:5],
                                        "fields": ["title", "published_at", "provider", "hilight"]
                                    }
                                }

                                news_details_result = make_api_request(API_KEY, ENDPOINTS.get("search_news"), detail_data, debug=debug_mode)

                                if news_details_result:
                                    news_docs = news_details_result.get("documents", [])
                                    for j, news in enumerate(news_docs):
                                        st.markdown(f"**{j+1}. {news.get('title', '제목 없음')}**")
                                        st.caption(f"출처: {news.get('provider', '미상')} | 발행: {news.get('published_at', '')[:10]}")
                                        if "hilight" in news and news["hilight"]:
                                            st.markdown(f"> {news['hilight']}") # 인용구 스타일
                                        st.divider() # 구분선
                                else:
                                    st.error("관련 기사 상세 정보를 불러오는데 실패했습니다.")
                        else:
                            st.info("이 이슈에 대한 관련 기사가 없습니다.")

                        # 이슈 분석 버튼 (app.py에서 처리하기 위해 세션 상태 사용)
                        if st.button(f"'{topic}' 분석하기", key=f"analyze_issue_{i}"):
                            st.session_state.selected_issue = issue
                            st.session_state.go_to_analysis = True # 분석 탭 이동 플래그
                            st.rerun()
        else:
            st.error(f"{date_str}의 이슈를 불러오는데 실패했습니다.") 