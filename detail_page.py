import streamlit as st
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import re
import os # os 모듈 임포트 추가 (폰트 경로 확인 시 사용될 수 있음)
from datetime import datetime, timedelta
from utils import make_api_request # utils.py 의 함수 임포트
from config import API_KEY, ENDPOINTS # config.py 의 설정값 임포트

# --- issue_analysis.py 에서 가져온 함수들 ---

def render_related_news(related_news):
    """관련 기사 목록 렌더링"""
    st.subheader(f"관련 기사 목록 ({len(related_news)}개)")

    if not related_news:
        st.info("분석 기간 내 관련 기사를 찾을 수 없습니다.")
        return

    # 페이지네이션 설정
    items_per_page = 5 # 상세 페이지에서는 5개씩 표시
    total_pages = (len(related_news) + items_per_page - 1) // items_per_page
    page_key = "related_news_page_detail" # 세션 키 이름 변경
    if page_key not in st.session_state: st.session_state[page_key] = 1

    # 페이지 선택 UI 개선
    col1, col2, col3 = st.columns([1, 3, 1])
    if col1.button("◀ 이전", key="prev_news_page_detail", use_container_width=True):
        if st.session_state[page_key] > 1:
            st.session_state[page_key] -= 1
    col2.write(f"<div style='text-align: center;'>페이지: {st.session_state[page_key]} / {total_pages}</div>", unsafe_allow_html=True)
    if col3.button("다음 ▶", key="next_news_page_detail", use_container_width=True):
        if st.session_state[page_key] < total_pages:
            st.session_state[page_key] += 1

    # 현재 페이지에 해당하는 기사 슬라이싱
    start_idx = (st.session_state[page_key] - 1) * items_per_page
    end_idx = start_idx + items_per_page
    current_page_news = related_news[start_idx:end_idx]

    # 관련 기사 표시 (디자인 개선)
    for i, news in enumerate(current_page_news):
        idx_overall = start_idx + i + 1
        with st.container():
            st.markdown(f"**{idx_overall}. {news.get('title', '제목 없음')}**")
            col_meta1, col_meta2 = st.columns([1,1])
            with col_meta1:
                st.caption(f"출처: {news.get('provider', '미상')}")
            with col_meta2:
                st.caption(f"발행: {news.get('published_at', '')[:10]}")
            
            # 간단 요약 (내용의 첫 부분)
            if "content" in news and news["content"]:
                content = news.get("content", "")
                summary = content[:150] + "..." if len(content) > 150 else content
                st.write(summary)

            # 전체 내용 보기 버튼
            if "content" in news and news["content"]:
                 if st.button(f"기사 전문 보기 #{idx_overall}", key=f"view_content_{news.get('news_id', idx_overall)}"):
                     # 모달이나 expander 형태로 전체 내용 표시 (여기서는 expander 활용)
                     with st.expander("기사 전문", expanded=True):
                         st.text_area("", news["content"], height=300, disabled=True, label_visibility="collapsed")
            st.divider()


def render_keyword_analysis(related_keywords):
    """키워드 분석 결과 렌더링 (디자인 개선)"""
    st.subheader("🔑 연관 키워드 분석")

    if not related_keywords:
        st.info("연관어 분석 결과가 없습니다.")
        return

    # 데이터프레임 생성
    related_keywords_df = pd.DataFrame([
        {"키워드": item.get("name", ""), "중요도": round(item.get("weight", 0), 2)}
        for item in related_keywords
    ]).sort_values(by="중요도", ascending=False).reset_index(drop=True)

    # 키워드 목록 표시 (상위 20개)
    st.markdown("**주요 연관 키워드 (Top 20)**")
    st.dataframe(related_keywords_df.head(20), use_container_width=True, height=300)

    # 상위 키워드 막대 차트 (상위 15개)
    st.markdown("---")
    st.markdown("**상위 연관 키워드 중요도 시각화 (Top 15)**")
    top_keywords = related_keywords_df.head(15)

    try:
        fig, ax = plt.subplots(figsize=(10, 6)) # 차트 크기 조정
        sns.barplot(data=top_keywords, x="중요도", y="키워드", palette="viridis", ax=ax, orient='h')
        ax.set_title("상위 연관 키워드 중요도", fontsize=14)
        ax.tick_params(axis='y', labelsize=10)
        ax.tick_params(axis='x', labelsize=10)
        plt.tight_layout()
        st.pyplot(fig)
    except Exception as e:
        st.error(f"키워드 차트 생성 중 오류 발생: {str(e)}")
        # st.dataframe(top_keywords) # 오류 시 데이터프레임으로 대체 표시


def render_timeline_analysis(timeline_data):
    """시간별 추이 분석 결과 렌더링 (디자인 개선)"""
    st.subheader("📈 기간별 키워드 언급 추이")

    if not timeline_data or "time_line" not in timeline_data or not timeline_data["time_line"]:
        st.info("시간별 추이 데이터가 없습니다.")
        return

    # 날짜 포맷 변환 함수
    def format_date(date_str):
        try:
            if len(date_str) == 8: return datetime.strptime(date_str, "%Y%m%d")
            if len(date_str) == 6: return datetime.strptime(date_str, "%Y%m").replace(day=1) # 월별 데이터면 1일로
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

    # 타임라인 차트 생성
    st.markdown("**키워드 언급 추이 차트**")
    try:
        fig, ax = plt.subplots(figsize=(12, 5)) # 차트 크기 조정
        sns.lineplot(data=timeline_df, x="날짜", y="언급 횟수", marker="o", ax=ax, color="dodgerblue")

        # 차트 스타일링 개선
        ax.set_title("일자별 키워드 언급 횟수", fontsize=14)
        ax.set_xlabel("날짜", fontsize=10)
        ax.set_ylabel("언급 횟수", fontsize=10)
        plt.xticks(rotation=45, ha='right', fontsize=9)
        plt.yticks(fontsize=9)
        ax.grid(True, axis='y', linestyle='--', alpha=0.6)
        sns.despine() # 테두리 제거
        plt.tight_layout()
        st.pyplot(fig)
    except Exception as e:
        st.error(f"타임라인 차트 생성 중 오류 발생: {str(e)}")

    # 데이터 테이블 표시 (옵션)
    with st.expander("데이터 테이블 보기"):
        st.dataframe(timeline_df.style.format({"날짜": '{:%Y-%m-%d}'}), use_container_width=True)


def display_analysis_results(analysis_result):
    """분석 결과를 탭으로 나누어 표시 (탭 생성 부분 제거)"""
    st.markdown("--- ")
    col1, col2, col3 = st.columns(3)
    col1.metric("분석 대상 이슈", analysis_result.get('issue_topic', 'N/A'))
    col2.metric("분석 기간 (뉴스 검색)", analysis_result.get('period', 'N/A'))
    # col3.metric("타임라인 기간", f"{analysis_result.get('timeline_start', 'N/A')} ~ {analysis_result.get('timeline_end', 'N/A')}")
    col3.metric("분석 사용 키워드", f"`{analysis_result.get('query', 'N/A')}`")
    st.markdown("--- ")

    # 상세 분석 결과 탭
    analysis_tab1, analysis_tab2, analysis_tab3 = st.tabs([
        "📰 관련 기사", "🔑 키워드 분석", "📈 시간별 추이"
    ])

    with analysis_tab1:
        render_related_news(analysis_result.get("related_news", []))

    with analysis_tab2:
        render_keyword_analysis(analysis_result.get("related_keywords", []))

    with analysis_tab3:
        # 타임라인 데이터 전달 시점 확인 필요
        render_timeline_analysis(analysis_result.get("timeline"))

# --- 상세 페이지 렌더링 함수 (수정) ---
def render_detail_page(selected_issue_data, debug_mode=False):
    """상세 페이지를 렌더링하는 함수"""

    # 뒤로가기 버튼 (상단으로 이동 및 스타일 개선)
    if st.button("← 대시보드로 돌아가기", key="back_to_dashboard"):
        st.session_state.view = "dashboard"
        st.session_state.selected_issue_data = None
        if "analysis_result" in st.session_state: # 분석 결과도 초기화
            del st.session_state.analysis_result
        # 페이지네이션 키 초기화
        if "related_news_page_detail" in st.session_state:
             del st.session_state.related_news_page_detail
        if "back_to_dashboard" in st.session_state:
            del st.session_state["back_to_dashboard"]
        st.rerun()

    topic = selected_issue_data.get('title', '제목 없음')
    st.header(f"🔍 이슈 상세 분석: {topic}")
    st.markdown("---")

    # 세션 상태에서 날짜 및 분석 기간 가져오기 (app.py에서 설정됨)
    # app.py의 사이드바에서 설정된 값을 참조
    if 'selected_date' not in st.session_state:
        st.session_state.selected_date = datetime.now().date() # 없으면 기본값
    if 'days_to_analyze' not in st.session_state:
        st.session_state.days_to_analyze = 30 # 없으면 기본값

    selected_date = st.session_state.selected_date
    days_to_analyze = st.session_state.days_to_analyze

    # 탭 생성
    tab1, tab2 = st.tabs(["**이슈 분석**", "**과거 데이터 비교**"])

    with tab1:
        # === 이슈 분석 탭 내용 (issue_analysis.py 로직 통합) ===
        st.subheader("데이터 분석")

        # 이슈 키워드 표시 (dashboard에서 전달받은 데이터 활용)
        # dashboard.py에서 'keywords' 필드를 topics 딕셔너리에 추가했다고 가정
        # 예: topics.append({"title": title, "summary": summary, ..., "keywords": keyword_str})
        keywords_str = selected_issue_data.get("keywords", "") # dashboard.py 에서 넣어줘야 함
        if keywords_str:
             keywords = [k.strip() for k in keywords_str.split(",")[:15] if k.strip()]
        else:
             # 키워드가 없으면 제목에서 임시 추출 (개선 필요)
             st.warning("이슈 키워드 정보가 없습니다. 제목을 기반으로 분석합니다.")
             keywords = topic.split()[:3]

        st.info(f"**분석 키워드:** {', '.join(keywords[:3])} (상위 3개 사용)")

        # 분석 시작 버튼 (스타일 개선)
        if st.button("📈 데이터 분석 시작", key="start_analysis_detail", type="primary", use_container_width=True):
            with st.spinner("데이터를 분석 중입니다... 잠시만 기다려주세요."):
                # 분석 기간 설정
                end_date_obj = selected_date
                start_date_obj = end_date_obj - timedelta(days=7) # 최근 1주일 뉴스 검색
                start_date_str = start_date_obj.strftime("%Y-%m-%d")
                end_date_str = end_date_obj.strftime("%Y-%m-%d")

                # 키워드 설정 (상위 3개)
                main_keywords = keywords[:3]
                query = " AND ".join(main_keywords)

                # 분석 결과를 저장할 딕셔너리 초기화
                analysis_result = {
                    "issue_topic": topic,
                    "query": query,
                    "period": f"{start_date_str} ~ {end_date_str}", # 뉴스 검색 기간
                    "related_news": [],
                    "related_keywords": [],
                    "timeline": None, # 초기값 None
                    "timeline_start": None, # 타임라인 기간 추가
                    "timeline_end": None
                }

                # 1. 관련 뉴스 검색 (최근 1주일, 최대 50개)
                search_data = {
                    "argument": {
                        "query": query,
                        "published_at": {"from": start_date_str, "until": end_date_str},
                        "provider": ["02100201"], # 서울경제
                        "sort": {"date": "desc"},
                        "return_from": 0,
                        "return_size": 50,
                        "fields": ["title", "content", "published_at", "provider", "category", "byline", "hilight", "news_id"]
                    }
                }
                news_result = make_api_request(API_KEY, ENDPOINTS.get("search_news"), search_data, debug=debug_mode)
                if news_result:
                    analysis_result["related_news"] = news_result.get("documents", [])

                # 2. 연관어 분석 (최근 1주일)
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

                # 3. 시간별 키워드 트렌드 분석 (days_to_analyze 기간)
                timeline_start_obj = selected_date - timedelta(days=days_to_analyze)
                timeline_end_obj = selected_date
                timeline_start_str = timeline_start_obj.strftime("%Y-%m-%d")
                timeline_end_str = timeline_end_obj.strftime("%Y-%m-%d")
                analysis_result["timeline_start"] = timeline_start_str
                analysis_result["timeline_end"] = timeline_end_str

                timeline_data = {
                    "argument": {
                        "query": query,
                        "published_at": {
                            "from": timeline_start_str,
                            "until": timeline_end_str
                        },
                        "provider": ["02100201"],
                        "interval": "day",
                        "normalize": False
                    }
                }
                timeline_result = make_api_request(API_KEY, ENDPOINTS.get("time_line"), timeline_data, debug=debug_mode)
                if timeline_result:
                    analysis_result["timeline"] = timeline_result

                # 분석 결과 세션 상태에 저장
                st.session_state.analysis_result = analysis_result
                st.success("✅ 데이터 분석 완료!")
                st.rerun() # 분석 완료 후 결과 표시 위해 rerun

        # 분석 결과 표시
        st.markdown("---")
        st.subheader("분석 결과")
        if "analysis_result" in st.session_state and st.session_state.analysis_result:
             # 현재 보고 있는 이슈와 분석 결과의 이슈가 같은지 확인
             if st.session_state.analysis_result.get("issue_topic") == topic:
                 display_analysis_results(st.session_state.analysis_result)
             else:
                 st.info("다른 이슈에 대한 분석 결과가 표시되고 있습니다. 현재 이슈 분석을 시작해주세요.")
                 # 이전 결과 표시 안 함
        else:
             st.info("📈 데이터 분석 시작 버튼을 클릭하여 분석을 진행해주세요.")


    with tab2:
        # === 과거 데이터 비교 탭 내용 (historical_comparison.py 로직 통합) ===
        st.subheader("📊 과거 데이터 비교")

        # 세션 상태에서 분석 결과 확인 (분석이 먼저 수행되어야 함)
        if "analysis_result" not in st.session_state or not st.session_state.analysis_result.get('query'):
            st.info("👈 먼저 '이슈 분석' 탭에서 분석을 실행해주세요. 비교할 키워드가 필요합니다.")
            st.stop()

        analysis_result = st.session_state.analysis_result
        query = analysis_result.get('query')
        issue_topic = analysis_result.get('issue_topic', '선택된 이슈')
        st.write(f"'{issue_topic}' 관련 과거 기사를 검색합니다.")
        st.caption(f"(검색 키워드: `{query}`)")

        # 비교 기간 선택 옵션 (더 다양한 옵션 추가)
        comparison_options = {
            "1주 전": 7,
            "2주 전": 14,
            "3주 전": 21,
            "4주 전 (한 달 전)": 28,
            "6주 전": 42,
            "8주 전 (두 달 전)": 56,
            "12주 전 (세 달 전)": 84
        }
        
        # columns를 사용하여 레이아웃 조정
        col_select1, col_select2 = st.columns([3, 1])
        with col_select1:
             selected_periods = st.multiselect(
                "비교할 과거 기간 선택 (기준일로부터, 해당 주 월~일 검색)",
                options=list(comparison_options.keys()),
                default=["1주 전", "4주 전 (한 달 전)"] # 기본 선택 변경
            )
        # with col_select2:
            # st.write("") # 공간 확보
            # st.button("검색", key="search_historical", use_container_width=True) # 필요 시 검색 버튼 추가

        if not selected_periods:
            st.warning("비교할 과거 기간을 하나 이상 선택해주세요.")
            st.stop()

        st.divider()

        # 선택된 기간별 데이터 조회 및 표시
        for period_label in selected_periods:
            days_ago = comparison_options[period_label]
            
            # 해당 주의 시작일과 종료일 계산 (월요일 ~ 일요일 기준)
            target_past_date = selected_date - timedelta(days=days_ago)
            period_start = target_past_date - timedelta(days=target_past_date.weekday()) # 해당 주의 월요일
            period_end = period_start + timedelta(days=6) # 해당 주의 일요일
            
            expander_title = f"📅 {period_label} ({period_start.strftime('%Y.%m.%d')} ~ {period_end.strftime('%Y.%m.%d')})"
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
                            "return_size": 5, # 각 기간별 상위 5개 뉴스만 표시 (UI 간결화)
                            "fields": ["title", "published_at", "provider", "news_id", "content"] # content도 가져와서 요약 표시
                        }
                    }

                    historical_result = make_api_request(API_KEY, ENDPOINTS.get("search_news"), historical_data, debug=debug_mode)

                    if historical_result:
                        news_list = historical_result.get("documents", [])
                        if news_list:
                            st.success(f"**검색된 기사: {len(news_list)}개** (상위 {len(news_list)}개 표시)")
                            for i, news in enumerate(news_list):
                                st.markdown(f"**{i+1}. {news.get('title', '제목 없음')}**")
                                st.caption(f"출처: {news.get('provider', '미상')} | 발행: {news.get('published_at', '')[:10]}")
                                # 간단 요약 추가
                                if "content" in news and news["content"]:
                                     content = news.get("content", "")
                                     summary = content[:80] + "..." if len(content) > 80 else content
                                     st.write(f"> {summary}")
                                st.divider()
                        else:
                            st.info(f"해당 기간에는 관련 기사가 없습니다.")
                    else:
                        st.error(f"{period_label} 데이터를 불러오는데 실패했습니다. API 상태를 확인해주세요.")

    if debug_mode:
        st.write("--- Debug Info ---")
        st.write("**Selected Issue Data:**")
        st.json(selected_issue_data)
        st.write("**Session State:**")
        # 순환 참조 및 너무 큰 객체 제외
        session_state_to_show = {
            k: v for k, v in st.session_state.items()
            if k not in ['selected_issue_data', 'analysis_result'] # 제외할 키
            and not isinstance(v, (pd.DataFrame)) # 데이터프레임 제외
        }
        try:
            st.json(session_state_to_show)
        except Exception:
             st.write("세션 상태 중 일부를 표시할 수 없습니다.") 