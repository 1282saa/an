import streamlit as st
from datetime import datetime
import re # 요약 생성을 위해 추가
from utils import make_api_request
from config import API_KEY, ENDPOINTS

def render_dashboard(selected_date, debug_mode):
    """뉴스 대시보드 UI 및 로직 렌더링"""
    date_str = selected_date.strftime("%Y-%m-%d")
    st.title("📰 서울경제 뉴스 대시보드")
    st.write(f"{selected_date.strftime('%Y년 %m월 %d일')} 기준 주요 이슈입니다.")

    # --- 카드 스타일 정의 (st.markdown으로 CSS 주입) ---
    card_style = """
    <style>
        .issue-card {
            border: 1px solid #e1e1e1;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px; /* 행 간격 */
            box-shadow: 0px 2px 8px rgba(0,0,0,0.08);
            background-color: #ffffff; /* 카드 배경 흰색 */
            height: 260px; /* 카드 높이 고정 (내용 길이에 따라 조정 필요 가능성) */
            display: flex;
            flex-direction: column;
            justify-content: space-between; /* 내용 위아래 정렬 */
        }
        .issue-card h3 {
            font-size: 16pt; 
            font-weight: bold; 
            margin-bottom: 8px; 
            /* 제목 길어질 경우 말줄임 */
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2; /* 최대 2줄 */
            -webkit-box-orient: vertical;
        }
        .issue-card .meta {
            font-size: 12pt;
            color: #888888;
            margin-bottom: 12px;
        }
        .issue-card .summary {
            font-size: 14pt;
            color: #333333;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3; /* 최대 3줄 */
            -webkit-box-orient: vertical;
            margin-bottom: 16px;
            line-height: 1.5; /* 줄 간격 */
        }
         /* 버튼 스타일 (선택적) */
        .issue-card .stButton>button {
            /* background-color: #FF4C4C; 
            color: white; */
            width: 100%; /* 버튼 너비 카드에 맞춤 */
        }
    </style>
    """
    st.markdown(card_style, unsafe_allow_html=True)

    # --- 이슈 데이터 로드 --- 
    @st.cache_data(ttl=3600) # 1시간 캐시
    def load_issues(req_date_str):
        """선택된 날짜의 이슈를 API로 로드 (캐싱 적용)"""
        st.write(f"DEBUG: Loading issues for {req_date_str}") # 캐시 동작 확인용
        issue_data = {
            "argument": {
                "date": req_date_str,
                "provider": ["02100311"],  # 서울경제의 올바른 코드로 수정
            }
        }
        return make_api_request(API_KEY, ENDPOINTS.get("issue_ranking"), issue_data, debug=debug_mode)

    issues_result = load_issues(date_str)

    if issues_result:
        topics = issues_result.get("topics", [])
        if not topics:
            st.warning(f"{date_str}에 해당하는 이슈를 찾을 수 없습니다.")
            return # 이슈 없으면 여기서 종료

        st.success(f"{len(topics)}개의 주요 이슈를 찾았습니다.")
        st.markdown("--- ") # 구분선

        # --- 3열 그리드 생성 --- 
        cols = st.columns(3, gap="medium") # gap="medium"으로 컬럼 간격 조정

        for i, issue in enumerate(topics):
            col_index = i % 3 # 0, 1, 2 반복하여 컬럼에 분배
            with cols[col_index]:
                with st.container(): # 각 카드를 컨테이너로 감쌈
                    st.markdown("<div class='issue-card'>", unsafe_allow_html=True)
                    
                    # --- 카드 내용 --- 
                    topic = issue.get("topic", "제목 없음")
                    news_cluster = issue.get("news_cluster", [])
                    news_count = len(news_cluster)
                    
                    # 요약 생성 (첫번째 관련 기사 내용 활용 - API 호출 필요)
                    summary_text = "요약 정보를 불러오는 중..." # 기본값
                    first_news_id = news_cluster[0] if news_cluster else None
                    if first_news_id:
                        # 첫 기사 내용 가져오기 (캐싱 고려)
                        @st.cache_data(ttl=86400) # 하루 캐시
                        def get_news_content(news_id):
                            detail_data = {"argument": {"news_ids": [news_id], "fields": ["content"]}}
                            details = make_api_request(API_KEY, ENDPOINTS.get("search_news"), detail_data, debug=False)
                            if details and details.get("documents"): 
                                return details["documents"][0].get("content", "")
                            return ""
                        
                        content = get_news_content(first_news_id)
                        if content:
                            # 첫 3문장 또는 100자로 요약 (간단 버전)
                            sentences = re.split(r'(?<=[.!?])\s+', content)
                            summary_text = " ".join(sentences[:2]) # 첫 2문장
                            if len(summary_text) > 100:
                                summary_text = summary_text[:97] + "..."
                        else:
                             summary_text = "관련 기사 내용을 불러올 수 없습니다."
                    else:
                         summary_text = "관련 기사가 없어 요약을 생성할 수 없습니다."

                    # 제목
                    st.markdown(f"<h3>{topic}</h3>", unsafe_allow_html=True)
                    # 메타 정보 (발행일은 첫 기사 발행일로? API 응답 확인 필요)
                    # 우선 날짜는 생략, 언론사만 표시 (API 응답에 언론사 정보 없음)
                    st.markdown(f"<div class='meta'>관련기사 {news_count}건</div>", unsafe_allow_html=True)
                    # 요약
                    st.markdown(f"<div class='summary'>{summary_text}</div>", unsafe_allow_html=True)
                    
                    # 상세 보기 버튼
                    button_key = f"detail_btn_{i}"
                    if st.button("자세히 보기", key=button_key):
                        st.session_state.view = 'detail'
                        # 이슈 데이터에 필요한 정보 추가
                        issue_data_for_detail = {
                            "title": topic,
                            "summary": summary_text,
                            "news_cluster": news_cluster,
                            "news_count": news_count,
                            "keywords": issue.get("topic_keyword", ""),  # 키워드 데이터 추가
                            "topic_rank": issue.get("topic_rank", 0)
                        }
                        st.session_state.selected_issue_data = issue_data_for_detail
                        st.rerun()
                        
                    st.markdown("</div>", unsafe_allow_html=True) # 카드 div 닫기

    else:
        st.error(f"{date_str}의 이슈를 불러오는데 실패했습니다.")