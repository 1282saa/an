import streamlit as st
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import re
from datetime import datetime, timedelta
from utils import make_api_request
from config import API_KEY, ENDPOINTS

def render(selected_date, days_to_analyze, debug_mode):
    """'이슈 분석' 탭 UI 및 로직 렌더링"""
    st.header("🔍 이슈 상세 분석")

    # 세션 상태에서 분석할 이슈 가져오기
    if "selected_issue" not in st.session_state:
        st.info("먼저 '오늘의 이슈' 탭에서 분석할 이슈를 선택해주세요.")
        # 필요시 기본 이슈 로딩 로직 추가 가능 (선택 사항)
        # 예: 기본 로딩 로직
        # with st.spinner("기본 이슈 목록을 불러오는 중..."):
        #     # ... (today_issues.py의 이슈 로딩과 유사한 로직)
        #     if topics:
        #         st.session_state.selected_issue = topics[0] # 첫 번째 이슈를 기본값으로
        #     else:
        #         st.warning("선택할 수 있는 이슈가 없습니다.")
        #         st.stop()
        st.stop() # 선택된 이슈 없으면 여기서 중단

    selected_issue = st.session_state.selected_issue
    topic = selected_issue.get('topic', '제목 없음')
    st.subheader(f"선택한 이슈: {topic}")

    # 이슈 키워드 표시
    keywords = selected_issue.get("topic_keyword", "").split(",")[:15]
    st.write("**이슈 키워드:**")
    st.write(", ".join(keywords))

    # 분석 시작 버튼
    if st.button("이슈 분석 시작", key="start_analysis"):
        with st.spinner("이슈를 분석하는 중... (최대 2분 소요)"):
            # 분석 기간 설정
            end_date_obj = selected_date
            start_date_obj = end_date_obj - timedelta(days=7) # 최근 1주일
            start_date_str = start_date_obj.strftime("%Y-%m-%d")
            end_date_str = end_date_obj.strftime("%Y-%m-%d")

            # 키워드 설정 (상위 3개)
            main_keywords = keywords[:3]
            query = " AND ".join(main_keywords)

            # 분석 결과를 저장할 딕셔너리 초기화
            analysis_result = {
                "issue_topic": topic,
                "query": query,
                "period": f"{start_date_str} ~ {end_date_str}",
                "related_news": [],
                "related_keywords": [],
                "timeline": None # 초기값 None
            }

            # 1. 관련 뉴스 검색
            search_data = {
                "argument": {
                    "query": query,
                    "published_at": {"from": start_date_str, "until": end_date_str},
                    "provider": ["02100201"], # 서울경제
                    "sort": {"date": "desc"},
                    "return_from": 0,
                    "return_size": 50, # 뉴스 개수 증가
                    "fields": ["title", "content", "published_at", "provider", "category", "byline", "hilight", "news_id"]
                }
            }
            news_result = make_api_request(API_KEY, ENDPOINTS.get("search_news"), search_data, debug=debug_mode)
            if news_result:
                analysis_result["related_news"] = news_result.get("documents", [])

            # 2. 연관어 분석
            wordcloud_data = {
                "argument": {
                    "query": query,
                    "published_at": {"from": start_date_str, "until": end_date_str},
                    "provider": ["02100201"]
                }
            }
            wordcloud_result = make_api_request(API_KEY, ENDPOINTS.get("word_cloud"), wordcloud_data, debug=debug_mode)
            if wordcloud_result:
                analysis_result["related_keywords"] = wordcloud_result.get("nodes", [])

            # 3. 시간별 키워드 트렌드 분석 (전체 분석 기간)
            timeline_start = selected_date - timedelta(days=days_to_analyze)
            timeline_end = selected_date
            timeline_data = {
                "argument": {
                    "query": query,
                    "published_at": {
                        "from": timeline_start.strftime("%Y-%m-%d"),
                        "until": timeline_end.strftime("%Y-%m-%d")
                    },
                    "provider": ["02100201"],
                    "interval": "day",
                    "normalize": False # 실제 빈도수 확인
                }
            }
            timeline_result = make_api_request(API_KEY, ENDPOINTS.get("time_line"), timeline_data, debug=debug_mode)
            if timeline_result:
                analysis_result["timeline"] = timeline_result

            # 분석 결과 세션 상태에 저장
            st.session_state.analysis_result = analysis_result
            st.success("이슈 분석 완료!")

    # 분석 결과 표시
    if "analysis_result" in st.session_state:
        display_analysis_results(st.session_state.analysis_result)

def display_analysis_results(analysis_result):
    """분석 결과를 탭으로 나누어 표시"""
    # 분석 정보 요약 표시
    st.markdown("--- ")
    st.markdown(f"**분석 대상:** {analysis_result.get('issue_topic', 'N/A')}")
    st.markdown(f"**분석 기간:** {analysis_result.get('period', 'N/A')}")
    st.markdown(f"**사용 키워드:** `{analysis_result.get('query', 'N/A')}`")
    st.markdown("--- ")

    # 분석 결과 탭 생성
    analysis_tab1, analysis_tab2, analysis_tab3 = st.tabs([
        "📰 관련 기사", "🔑 키워드 분석", "📈 시간별 추이"
    ])

    # 탭 1: 관련 기사
    with analysis_tab1:
        render_related_news(analysis_result.get("related_news", []))

    # 탭 2: 키워드 분석
    with analysis_tab2:
        render_keyword_analysis(analysis_result.get("related_keywords", []))

    # 탭 3: 시간별 추이
    with analysis_tab3:
        render_timeline_analysis(analysis_result.get("timeline"))

def render_related_news(related_news):
    """관련 기사 목록 렌더링"""
    st.subheader(f"관련 기사 목록 ({len(related_news)}개)")

    if not related_news:
        st.info("분석 기간 내 관련 기사를 찾을 수 없습니다.")
        return

    # 페이지네이션 설정
    items_per_page = 10
    total_pages = (len(related_news) + items_per_page - 1) // items_per_page
    page_key = "related_news_page"
    if page_key not in st.session_state: st.session_state[page_key] = 1

    # 페이지 선택
    cols = st.columns([1, 2, 1])
    if cols[0].button("◀ 이전", key="prev_news_page"):
        if st.session_state[page_key] > 1:
            st.session_state[page_key] -= 1
    cols[1].write(f"페이지: {st.session_state[page_key]} / {total_pages}")
    if cols[2].button("다음 ▶", key="next_news_page"):
        if st.session_state[page_key] < total_pages:
            st.session_state[page_key] += 1

    # 현재 페이지에 해당하는 기사 슬라이싱
    start_idx = (st.session_state[page_key] - 1) * items_per_page
    end_idx = start_idx + items_per_page
    current_page_news = related_news[start_idx:end_idx]

    # 관련 기사 표시
    for i, news in enumerate(current_page_news):
        idx_overall = start_idx + i + 1
        with st.expander(f"{idx_overall}. {news.get('title', '제목 없음')} ({news.get('provider', '미상')})", expanded=(i==0)):
            st.caption(f"발행: {news.get('published_at', '')[:10]} | 기자: {news.get('byline', 'N/A')} | 카테고리: {news.get('category', 'N/A')}")

            # 하이라이트
            if "hilight" in news and news["hilight"]:
                st.markdown("**하이라이트:**")
                st.markdown(f"> {news['hilight']}")

            # 내용 요약 (첫 3문장 또는 200자)
            if "content" in news and news["content"]:
                st.markdown("**내용 요약:**")
                content = news.get("content", "")
                sentences = re.split(r'(?<=[.!?])\s+', content)
                summary = " ".join(sentences[:3])
                if len(summary) > 200:
                    summary = summary[:197] + "..."
                st.write(summary)

            # 전체 내용 보기 토글
            if "content" in news and news["content"]:
                 if st.checkbox(f"전체 내용 보기 #{idx_overall}", key=f"show_content_{news.get('news_id', idx_overall)}"):
                     st.markdown("**전체 내용:**")
                     st.text_area("", news["content"], height=200, disabled=True)

    st.divider()

def render_keyword_analysis(related_keywords):
    """키워드 분석 결과 렌더링"""
    st.subheader("연관 키워드 분석")

    if not related_keywords:
        st.info("연관어 분석 결과가 없습니다.")
        return

    # 데이터프레임 생성
    related_keywords_df = pd.DataFrame([
        {"키워드": item.get("name", ""), "중요도": round(item.get("weight", 0), 2)}
        for item in related_keywords
    ]).sort_values(by="중요도", ascending=False).reset_index(drop=True)

    st.dataframe(related_keywords_df, use_container_width=True)

    # 상위 키워드 막대 차트 (상위 15개)
    st.markdown("**상위 연관 키워드 (Top 15)**")
    top_keywords = related_keywords_df.head(15)

    try:
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.barplot(data=top_keywords, x="중요도", y="키워드", palette="viridis", ax=ax)
        ax.set_title("상위 연관 키워드 중요도")
        ax.tick_params(axis='y', labelsize=10)
        plt.tight_layout()
        st.pyplot(fig)
    except Exception as e:
        st.error(f"키워드 차트 생성 중 오류 발생: {str(e)}")
        st.dataframe(top_keywords) # 오류 시 데이터프레임으로 대체 표시

def render_timeline_analysis(timeline_data):
    """시간별 추이 분석 결과 렌더링"""
    st.subheader("기간별 키워드 언급 추이")

    if not timeline_data or "time_line" not in timeline_data or not timeline_data["time_line"]:
        st.info("시간별 추이 데이터가 없습니다.")
        return

    # 날짜 포맷 변환 함수
    def format_date(date_str):
        try:
            if len(date_str) == 8: return datetime.strptime(date_str, "%Y%m%d")
            if len(date_str) == 6: return datetime.strptime(date_str, "%Y%m")
            return pd.to_datetime(date_str) # 다른 형식 시도
        except ValueError:
            return None # 파싱 실패 시 None 반환

    # 데이터프레임 생성 및 날짜 변환
    timeline_df_data = []
    for item in timeline_data["time_line"]:
        parsed_date = format_date(item.get("label"))
        if parsed_date:
            timeline_df_data.append({"날짜": parsed_date, "언급 횟수": item.get("hits", 0)})

    if not timeline_df_data:
        st.error("타임라인 날짜 데이터를 처리할 수 없습니다.")
        return

    timeline_df = pd.DataFrame(timeline_df_data).sort_values(by="날짜")

    st.dataframe(timeline_df.style.format({"날짜": '{:%Y-%m-%d}'}), use_container_width=True)

    # 타임라인 차트 생성
    st.markdown("**키워드 언급 추이 차트**")
    try:
        fig, ax = plt.subplots(figsize=(12, 6))
        sns.lineplot(data=timeline_df, x="날짜", y="언급 횟수", marker="o", ax=ax)

        # 차트 스타일링
        plt.xticks(rotation=45)
        ax.set_title("일자별 키워드 언급 횟수")
        ax.set_xlabel("날짜")
        ax.set_ylabel("언급 횟수")
        plt.grid(True, axis='y', linestyle='--', alpha=0.7)
        plt.tight_layout()
        st.pyplot(fig)
    except Exception as e:
        st.error(f"타임라인 차트 생성 중 오류 발생: {str(e)}")
        st.dataframe(timeline_df) # 오류 시 데이터프레임으로 대체 표시 