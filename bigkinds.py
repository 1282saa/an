import streamlit as st
import pandas as pd
import numpy as np
import requests
import json
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
import re
from collections import Counter
import os
from dotenv import load_dotenv
import time

# 가장 먼저 set_page_config 호출
st.set_page_config(page_title="뉴스 이슈 분석 시스템", layout="wide")

# 환경 변수에서 API 키 로딩
load_dotenv()
API_KEY = os.getenv("BIGKINDS_KEY")

# API 키 디버깅 - 존재 여부만 확인하고 마스킹
if API_KEY:
    masked_key = "●" * (len(API_KEY) - 4) + API_KEY[-4:] if len(API_KEY) > 4 else "●●●●"
    st.sidebar.success(f"API 키가 로드되었습니다: {masked_key}")
else:
    st.error("API 키를 불러올 수 없습니다. .env 파일에 BIGKINDS_KEY가 설정되어 있는지 확인하세요.")
    st.stop()

# 한글 폰트 설정 (시스템 환경에 맞게 적용)
try:
    # 다양한 한글 폰트 옵션 시도
    font_options = ['NanumGothic', 'AppleGothic', 'Gulim', 'Batang', 'Dotum', 'Arial Unicode MS']
    
    # 폰트 가용성 확인 및 설정
    font_found = False
    for font in font_options:
        try:
            plt.rcParams['font.family'] = font
            # 간단한 텍스트로 폰트 테스트
            fig, ax = plt.subplots(figsize=(1, 1))
            ax.text(0.5, 0.5, '테스트')
            fig.tight_layout()
            plt.close(fig)  # 테스트 후 닫기
            font_found = True
            break
        except Exception:
            continue
            
    if not font_found:
        # 폰트 없을 경우 기본 설정 사용
        plt.rcParams['font.family'] = 'DejaVu Sans'
        plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 표시 문제 해결
        
except Exception as e:
    # 폰트 설정 실패 시 기본 설정으로 진행
    st.warning(f"폰트 설정 중 문제가 발생했습니다: {str(e)}. 기본 폰트를 사용합니다.")

# API 엔드포인트 설정
ENDPOINTS = {
    "search_news": "https://tools.kinds.or.kr/search/news",
    "issue_ranking": "https://tools.kinds.or.kr/issue_ranking",
    "word_cloud": "https://tools.kinds.or.kr/word_cloud",
    "time_line": "https://tools.kinds.or.kr/time_line"
}

# API 요청 함수
def make_api_request(endpoint, data, debug=False):
    """API 요청을 수행하는 함수"""
    url = ENDPOINTS.get(endpoint)
    if not url:
        st.error(f"엔드포인트 '{endpoint}'를 찾을 수 없습니다.")
        return None
    
    # API 키 추가
    data["access_key"] = API_KEY
    
    if debug:
        st.write(f"요청 URL: {url}")
        st.write(f"요청 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    try:
        response = requests.post(url, json=data, timeout=30)
        
        # 디버그 모드에서만 응답 상태를 표시
        if debug:
            st.write(f"응답 상태 코드: {response.status_code}")
            st.write(f"응답 내용 미리보기: {response.text[:200]}...")
            st.write(f"응답 헤더: {dict(response.headers)}")

        response.raise_for_status()
        
        result = response.json()
        
        if debug:
            st.write(f"응답 결과 코드: {result.get('result')}")
        
        if result.get("result") != 0:
            st.error(f"API 응답 오류: {result.get('message', '알 수 없는 오류')}")
            return None
        
        return result.get("return_object")
    except requests.exceptions.RequestException as e:
        st.error(f"API 요청 중 오류 발생: {str(e)}")
        return None
    except json.JSONDecodeError:
        st.error("응답을 JSON으로 파싱할 수 없습니다.")
        if debug:
            st.code(response.text)
        return None
    except Exception as e:
        st.error(f"예상치 못한 오류 발생: {str(e)}")
        return None

# 타이틀 및 소개
st.title("📰 뉴스 이슈 분석 시스템")
st.write("빅카인즈 API를 활용한 뉴스 이슈 자동 분석 시스템")

# 사이드바 설정
with st.sidebar:
    # 날짜 선택
    st.header("📅 분석 기간 설정")
    today = datetime.now().date()
    date_option = st.radio("날짜 선택 방식", ["오늘", "어제", "특정 날짜"])
    
    if date_option == "오늘":
        selected_date = today
    elif date_option == "어제":
        selected_date = today - timedelta(days=1)
    else:
        selected_date = st.date_input("분석할 날짜 선택", today)
    
    # 분석 기간 설정
    st.header("⏱️ 과거 데이터 분석 기간")
    days_to_analyze = st.slider("분석 기간 (일)", 7, 30, 14)
    
    # 디버그 모드 토글
    debug_mode = st.checkbox("디버그 모드", value=False)

# 날짜 형식 변환
date_str = selected_date.strftime("%Y-%m-%d")
date_str_no_dash = date_str.replace("-", "")

# 탭 생성
tab1, tab2, tab3 = st.tabs(["📋 오늘의 이슈", "🔍 이슈 분석", "📊 과거 데이터 비교"])

# 탭 1: 오늘의 이슈
with tab1:
    st.header(f"📋 {date_str} 주요 이슈")
    
    # 오늘의 이슈 API 호출 (issue_ranking)
    with st.spinner("오늘의 이슈를 불러오는 중..."):
        issue_data = {
            "argument": {
                "date": date_str,
                "provider": ["02100201"]
            }
        }
        
        issues_result = make_api_request("issue_ranking", issue_data, debug=debug_mode)
        
        if issues_result:
            topics = issues_result.get("topics", [])
            
            if not topics:
                st.warning(f"{date_str}에 해당하는 이슈를 찾을 수 없습니다.")
            else:
                st.success(f"{len(topics)}개의 이슈를 찾았습니다.")
                
                # 이슈 목록 표시
                for i, issue in enumerate(topics[:10]):  # 상위 10개 이슈만 표시
                    topic = issue.get("topic", "제목 없음")
                    topic_rank = issue.get("topic_rank", 0)
                    
                    # 뉴스 클러스터 ID 목록
                    news_cluster = issue.get("news_cluster", [])
                    news_count = len(news_cluster)
                    
                    # 키워드 추출 및 표시
                    keywords = issue.get("topic_keyword", "").split(",")[:10]  # 상위 10개 키워드만 표시
                    
                    with st.expander(f"{i+1}. {topic} (관련 기사: {news_count}개)"):
                        # 키워드 표시
                        st.write("**주요 키워드:**")
                        st.write(", ".join(keywords))
                        
                        # 관련 기사 ID 목록
                        if news_cluster and len(news_cluster) > 0:
                            st.write("**관련 기사 미리보기:**")
                            
                            # 관련 기사 상세 정보 가져오기 (최대 5개만)
                            with st.spinner("관련 기사를 불러오는 중..."):
                                detail_data = {
                                    "argument": {
                                        "news_ids": news_cluster[:5],
                                        "fields": ["title", "published_at", "provider", "hilight"]
                                    }
                                }
                                
                                news_details_result = make_api_request("search_news", detail_data, debug=debug_mode)
                                
                                if news_details_result:
                                    news_docs = news_details_result.get("documents", [])
                                    
                                    # 관련 기사 표시
                                    for j, news in enumerate(news_docs):
                                        st.write(f"**{j+1}. {news.get('title', '제목 없음')}**")
                                        st.write(f"*출처: {news.get('provider', '출처 미상')} | 발행: {news.get('published_at', '날짜 정보 없음')[:10]}*")
                                        if "hilight" in news:
                                            st.write(news.get("hilight", ""))
                                        st.write("---")
                                else:
                                    st.error("관련 기사를 불러오는데 실패했습니다.")
                        
                        # 이슈 분석 버튼
                        if st.button(f"이슈 분석하기 #{i+1}", key=f"analyze_issue_{i}"):
                            # 세션 상태에 선택한 이슈 저장
                            st.session_state.selected_issue = issue
                            st.session_state.selected_issue_index = i
                            # 이슈 분석 탭으로 이동 (URL 파라미터 사용)
                            st.query_params.tab = "issue_analysis"  # 수정된 부분
                            st.rerun()  # 수정된 부분
        else:
            st.error("오늘의 이슈를 불러오는데 실패했습니다.")

# 탭 2: 이슈 분석
with tab2:
    st.header("🔍 이슈 상세 분석")
    
    # 세션 상태에서 선택한 이슈 가져오기 또는 사용자가 직접 선택
    if "selected_issue" in st.session_state:
        selected_issue = st.session_state.selected_issue
        selected_issue_index = st.session_state.selected_issue_index
    else:
        # 오늘의 이슈 API 호출 (issue_ranking)
        with st.spinner("이슈 목록을 불러오는 중..."):
            issue_data = {
                "argument": {
                    "date": date_str_no_dash,
                    "provider": ["서울경제"]
                }
            }
            
            issues_result = make_api_request("issue_ranking", issue_data, debug=debug_mode)
            
            if issues_result:
                topics = issues_result.get("topics", [])
                
                if not topics:
                    st.warning(f"{date_str}에 해당하는 이슈를 찾을 수 없습니다.")
                    st.stop()
                
                # 이슈 선택 박스
                issue_titles = [f"{i+1}. {issue.get('topic', '제목 없음')}" for i, issue in enumerate(topics)]
                selected_issue_title = st.selectbox("분석할 이슈 선택", issue_titles)
                
                # 선택한 이슈 인덱스 추출
                selected_issue_index = issue_titles.index(selected_issue_title)
                selected_issue = topics[selected_issue_index]
            else:
                st.error("이슈 목록을 불러오는데 실패했습니다.")
                st.stop()
    
    # 선택한 이슈 정보 표시
    st.subheader(f"선택한 이슈: {selected_issue.get('topic', '제목 없음')}")
    
    # 이슈 키워드 표시
    keywords = selected_issue.get("topic_keyword", "").split(",")[:15]
    st.write("**이슈 키워드:**")
    st.write(", ".join(keywords))
    
    # 이슈 분석 시작
    if st.button("이슈 분석 시작", key="start_analysis"):
        with st.spinner("이슈를 분석하는 중... 이 작업은 다소 시간이 걸릴 수 있습니다."):
            # 분석 시작일과 종료일 설정
            end_date_obj = selected_date
            start_date_obj = end_date_obj - timedelta(days=7)
            
            start_date_str = start_date_obj.strftime("%Y-%m-%d")
            end_date_str = end_date_obj.strftime("%Y-%m-%d")
            
            # 이슈 분석 실행
            topic_keywords = selected_issue.get("topic_keyword", "").split(",")
            main_keywords = topic_keywords[:3]  # 상위 3개 키워드만 사용
            query = " AND ".join(main_keywords)
            
            # 분석 결과를 저장할 딕셔너리
            analysis_result = {
                "issue": selected_issue,
                "related_news": [],
                "keywords": [],
                "related_keywords": [],
                "timeline": {},
                "historical_comparison": []
            }
            
            # 1. 관련 뉴스 검색
            search_data = {
                "argument": {
                    "query": query,
                    "published_at": {
                        "from": start_date_str,
                        "until": end_date_str
                    },
                    "provider": ["서울경제"],
                    "sort": {"date": "desc"},
                    "return_from": 0,
                    "return_size": 20,
                    "fields": ["title", "content", "published_at", "provider", "category", "byline", "hilight"]
                }
            }
            
            news_result = make_api_request("search_news", search_data, debug=debug_mode)
            
            if news_result:
                analysis_result["related_news"] = news_result.get("documents", [])
            
            # 2. 연관어 분석
            wordcloud_data = {
                "argument": {
                    "query": query,
                    "published_at": {
                        "from": start_date_str,
                        "until": end_date_str
                    },
                    "provider": ["서울경제"]
                }
            }
            
            wordcloud_result = make_api_request("word_cloud", wordcloud_data, debug=debug_mode)
            
            if wordcloud_result:
                analysis_result["related_keywords"] = wordcloud_result.get("nodes", [])
            
            # 3. 시간별 키워드 트렌드 분석
            timeline_start = datetime.now() - timedelta(days=days_to_analyze)
            timeline_end = datetime.now()
            
            timeline_data = {
                "argument": {
                    "query": query,
                    "published_at": {
                        "from": timeline_start.strftime("%Y-%m-%d"),
                        "until": timeline_end.strftime("%Y-%m-%d")
                    },
                    "provider": ["서울경제"],
                    "interval": "day",
                    "normalize": "false"
                }
            }
            
            timeline_result = make_api_request("time_line", timeline_data, debug=debug_mode)
            
            if timeline_result:
                analysis_result["timeline"] = timeline_result
            
            # 4. 과거 데이터 비교 (1주일 전, 2주일 전)
            historical_comparison = []
            
            # 1주일 전 데이터
            week_ago_end = datetime.now() - timedelta(days=7)
            week_ago_start = week_ago_end - timedelta(days=7)
            
            week_ago_data = {
                "argument": {
                    "query": query,
                    "published_at": {
                        "from": week_ago_start.strftime("%Y-%m-%d"),
                        "until": week_ago_end.strftime("%Y-%m-%d")
                    },
                    "provider": ["서울경제"],
                    "sort": {"date": "desc"},
                    "return_from": 0,
                    "return_size": 10,
                    "fields": ["title", "published_at", "provider"]
                }
            }
            
            week_ago_result = make_api_request("search_news", week_ago_data, debug=debug_mode)
            
            if week_ago_result:
                historical_comparison.append({
                    "period": "1주일 전",
                    "news": week_ago_result.get("documents", [])
                })
            
            # 2주일 전 데이터
            two_weeks_ago_end = datetime.now() - timedelta(days=14)
            two_weeks_ago_start = two_weeks_ago_end - timedelta(days=7)
            
            two_weeks_ago_data = {
                "argument": {
                    "query": query,
                    "published_at": {
                        "from": two_weeks_ago_start.strftime("%Y-%m-%d"),
                        "until": two_weeks_ago_end.strftime("%Y-%m-%d")
                    },
                    "provider": ["서울경제"],
                    "sort": {"date": "desc"},
                    "return_from": 0,
                    "return_size": 10,
                    "fields": ["title", "published_at", "provider"]
                }
            }
            
            two_weeks_ago_result = make_api_request("search_news", two_weeks_ago_data, debug=debug_mode)
            
            if two_weeks_ago_result:
                historical_comparison.append({
                    "period": "2주일 전",
                    "news": two_weeks_ago_result.get("documents", [])
                })
            
            analysis_result["historical_comparison"] = historical_comparison
            
            # 분석 결과 세션 상태에 저장
            st.session_state.analysis_result = analysis_result
    
    # 분석 결과 표시
    if "analysis_result" in st.session_state:
        analysis_result = st.session_state.analysis_result
        
        # 분석 결과 탭 생성
        analysis_tab1, analysis_tab2, analysis_tab3 = st.tabs([
            "📰 관련 기사", "🔑 키워드 분석", "📈 시간별 추이"
        ])
        
        # 탭 1: 관련 기사
        with analysis_tab1:
            st.subheader("관련 기사 목록")
            
            related_news = analysis_result.get("related_news", [])
            
            if not related_news:
                st.info("관련 기사를 찾을 수 없습니다.")
            else:
                # 기사 정렬 (최신순)
                sorted_news = sorted(
                    related_news,
                    key=lambda x: x.get("published_at", ""),
                    reverse=True
                )
                
                # 관련 기사 표시
                for i, news in enumerate(sorted_news):
                    with st.expander(f"{i+1}. {news.get('title', '제목 없음')} ({news.get('provider', '출처 미상')})"):
                        # 발행 정보
                        st.write(f"*출처: {news.get('provider', '출처 미상')} | 발행: {news.get('published_at', '날짜 정보 없음')[:10]} | 기자: {news.get('byline', '정보 없음')}*")
                        
                        # 하이라이트 또는 요약
                        if "hilight" in news:
                            st.write("**하이라이트:**")
                            st.write(news.get("hilight", ""))
                        
                        # 내용 요약
                        if "content" in news:
                            st.write("**내용 요약:**")
                            # 간단한 요약 (첫 3문장 또는 최대 200자)
                            content = news.get("content", "")
                            sentences = re.split(r'(?<=[.!?])\s+', content)
                            summary = " ".join(sentences[:3])
                            if len(summary) > 200:
                                summary = summary[:197] + "..."
                            st.write(summary)
                        
                        # 전체 내용 보기 옵션
                        if "content" in news and st.checkbox(f"전체 내용 보기 #{i+1}", key=f"show_content_{i}"):
                            st.write("**전체 내용:**")
                            st.write(news.get("content", ""))
        
        # 탭 2: 키워드 분석
        with analysis_tab2:
            st.subheader("키워드 분석")
            
            # 이슈 키워드 표시
            st.write("**이슈 키워드:**")
            st.write(", ".join(keywords))
            
            # 연관어 분석 결과 표시
            related_keywords = analysis_result.get("related_keywords", [])
            
            if related_keywords:
                st.write("**연관어 분석 결과:**")
                
                # 연관어 표 표시
                related_keywords_df = pd.DataFrame([
                    {"키워드": item.get("name", ""), "중요도": round(item.get("weight", 0), 2)}
                    for item in related_keywords
                ])
                
                st.dataframe(related_keywords_df, use_container_width=True)
                
                # 상위 키워드 막대 차트
                st.write("**상위 키워드:**")
                top_keywords = related_keywords_df.sort_values(by="중요도", ascending=False).head(10)
                
                try:
                    fig, ax = plt.subplots(figsize=(10, 6))
                    sns.barplot(data=top_keywords, x="중요도", y="키워드", palette="viridis", ax=ax)
                    plt.title("상위 연관 키워드")
                    plt.tight_layout()
                    st.pyplot(fig)
                except Exception as e:
                    st.error(f"차트 생성 중 오류가 발생했습니다: {str(e)}")
                    # 차트 대신 텍스트 형식으로 표시
                    st.write("상위 키워드 목록:")
                    for _, row in top_keywords.iterrows():
                        st.write(f"- {row['키워드']}: {row['중요도']}")
            else:
                st.info("연관어 분석 결과가 없습니다.")
        
        # 탭 3: 시간별 추이
        with analysis_tab3:
            st.subheader("시간별 키워드 추이")
            
            timeline_data = analysis_result.get("timeline", {})
            
            if timeline_data and "time_line" in timeline_data and timeline_data["time_line"]:
                # 타임라인 데이터 표시
                st.write("**기간별 언급 횟수:**")
                
                # 날짜 포맷 변환 함수
                def format_date(date_str):
                    if len(date_str) == 8:  # YYYYMMDD
                        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
                    elif len(date_str) == 6:  # YYYYMM
                        return f"{date_str[:4]}-{date_str[4:]}"
                    else:
                        return date_str
                
                # 데이터프레임 생성 및 표시
                timeline_df = pd.DataFrame([
                    {"날짜": format_date(item.get("label", "")), "언급 횟수": item.get("hits", 0)}
                    for item in timeline_data["time_line"]
                ])
                
                st.dataframe(timeline_df, use_container_width=True)
                
                # 타임라인 차트 생성 및 표시
                st.write("**키워드 추이 차트:**")
                
                try:
                    # 날짜 변환 및 정렬
                    timeline_df["날짜"] = pd.to_datetime(timeline_df["날짜"])
                    timeline_df = timeline_df.sort_values(by="날짜")
                    
                    fig, ax = plt.subplots(figsize=(12, 6))
                    sns.lineplot(data=timeline_df, x="날짜", y="언급 횟수", marker="o", ax=ax)
                    
                    # 차트 스타일 설정
                    plt.xticks(rotation=45)
                    plt.title("키워드 언급 추이")
                    plt.xlabel("날짜")
                    plt.ylabel("언급 횟수")
                    plt.tight_layout()
                    
                    st.pyplot(fig)
                except Exception as e:
                    st.error(f"차트 생성 중 오류가 발생했습니다: {str(e)}")
                    # 차트 대신 텍스트 형식으로 표시
                    st.write("날짜별 언급 횟수:")
                    for _, row in timeline_df.iterrows():
                        st.write(f"- {row['날짜'].strftime('%Y-%m-%d')}: {row['언급 횟수']}회")
            else:
                st.info("시간별 추이 데이터가 없습니다.")

# 탭 3: 과거 데이터 비교
with tab3:
    st.header("📊 과거 데이터 비교")
    
    # 세션 상태에서 분석 결과 가져오기
    if "analysis_result" in st.session_state:
        analysis_result = st.session_state.analysis_result
        
        # 과거 데이터 비교 결과 표시
        historical_comparison = analysis_result.get("historical_comparison", [])
        
        if historical_comparison:
            for period_data in historical_comparison:
                period = period_data.get("period", "")
                news_list = period_data.get("news", [])
                
                st.subheader(f"{period} 관련 기사 ({len(news_list)}개)")
                
                if news_list:
                    # 기사 목록 표시
                    for i, news in enumerate(news_list):
                        st.write(f"**{i+1}. {news.get('title', '제목 없음')}**")
                        st.write(f"*출처: {news.get('provider', '출처 미상')} | 발행: {news.get('published_at', '날짜 정보 없음')[:10]}*")
                        st.write("---")
                else:
                    st.info(f"{period}에 관련 기사가 없습니다.")
        else:
            st.info("과거 데이터 비교 결과가 없습니다.")
    else:
        st.info("이슈를 먼저 분석해주세요. '이슈 분석' 탭에서 이슈를 선택하고 분석을 시작하세요.")

# 푸터
st.markdown("---")
st.caption("© 2025 뉴스 이슈 분석 시스템 | 빅카인즈 API 기반")