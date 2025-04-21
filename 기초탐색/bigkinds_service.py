import streamlit as st
import pandas as pd
import numpy as np
import requests
import json
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
import networkx as nx
from wordcloud import WordCloud
import matplotlib.font_manager as fm
from collections import Counter
import re
from PIL import Image
import io
import base64

# 한글 폰트 설정 (맥/윈도우/리눅스 환경에 따라 적절히 수정 필요)
plt.rcParams['font.family'] = 'Malgun Gothic'  # 윈도우의 경우
# plt.rcParams['font.family'] = 'AppleGothic'  # 맥의 경우

class BigKindsAPI:
    """빅카인즈 API 호출을 위한 클래스"""
    
    def __init__(self, access_key):
        """
        API 키로 초기화
        
        Args:
            access_key (str): 빅카인즈 API 접근 키
        """
        self.access_key = access_key
        self.base_url = "https://tools.kinds.or.kr"
        self.headers = {
            "Content-Type": "application/json"
        }
    
    def _make_request(self, endpoint, data):
        """
        API 요청을 수행하는 내부 메서드
        
        Args:
            endpoint (str): API 엔드포인트
            data (dict): 요청 데이터
            
        Returns:
            dict: 응답 데이터
        """
        url = f"{self.base_url}/{endpoint}"
        data["access_key"] = self.access_key
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            st.error(f"API 요청 중 오류 발생: {str(e)}")
            return {"result": -1, "return_object": {}}
    
    def get_issues(self, date=None, providers=None):
        """
        오늘의 이슈(이슈 랭킹) API를 호출하여 주요 이슈 목록을 가져옵니다.
        
        Args:
            date (str): 이슈를 조회할 날짜 (YYYY-MM-DD)
            providers (list): 언론사 목록
            
        Returns:
            list: 이슈 목록
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        
        data = {
            "argument": {
                "date": date.replace("-", "")
            }
        }
        
        if providers:
            data["argument"]["provider"] = providers
        
        response = self._make_request("issue_ranking", data)
        
        if response["result"] == 0:
            return response["return_object"]["topics"]
        else:
            st.error("이슈 목록을 가져오는데 실패했습니다.")
            return []
    
    def search_news(self, query=None, start_date=None, end_date=None, providers=None, 
                   categories=None, incident_categories=None, byline=None, 
                   sort=None, return_from=0, return_size=10, fields=None):
        """
        뉴스 검색 API를 호출하여 조건에 맞는 뉴스 기사를 검색합니다.
        
        Args:
            query (str): 검색 쿼리
            start_date (str): 검색 시작일 (YYYY-MM-DD)
            end_date (str): 검색 종료일 (YYYY-MM-DD)
            providers (list): 언론사 목록
            categories (list): 뉴스 분류 목록
            incident_categories (list): 사건/사고 분류 목록
            byline (str): 기자 이름
            sort (dict): 정렬 조건
            return_from (int): 검색 시작 위치
            return_size (int): 검색 결과 수
            fields (list): 반환할 필드 목록
            
        Returns:
            dict: 검색 결과
        """
        data = {
            "argument": {
                "return_from": return_from,
                "return_size": return_size
            }
        }
        
        if fields:
            data["argument"]["fields"] = fields
        else:
            data["argument"]["fields"] = ["title", "content", "published_at", "provider", "byline"]
        
        if query:
            data["argument"]["query"] = query
        
        if start_date and end_date:
            data["argument"]["published_at"] = {
                "from": start_date,
                "until": end_date
            }
        
        if providers:
            data["argument"]["provider"] = providers
        
        if categories:
            data["argument"]["category"] = categories
        
        if incident_categories:
            data["argument"]["category_incident"] = incident_categories
        
        if byline:
            data["argument"]["byline"] = byline
        
        if sort:
            data["argument"]["sort"] = sort
        else:
            data["argument"]["sort"] = {"date": "desc"}
        
        if "hilight" not in data["argument"]:
            data["argument"]["hilight"] = 200
        
        response = self._make_request("search/news", data)
        
        if response["result"] == 0:
            return response["return_object"]
        else:
            st.error("뉴스 검색에 실패했습니다.")
            return {"total_hits": 0, "documents": []}
    
    def get_news_detail(self, news_ids, fields=None):
        """
        뉴스 조회 API를 호출하여 지정한 뉴스의 상세 정보를 가져옵니다.
        
        Args:
            news_ids (list): 뉴스 ID 목록
            fields (list): 반환할 필드 목록
            
        Returns:
            dict: 뉴스 상세 정보
        """
        data = {
            "argument": {
                "news_ids": news_ids
            }
        }
        
        if fields:
            data["argument"]["fields"] = fields
        else:
            data["argument"]["fields"] = ["title", "content", "published_at", "provider", "byline", "category", "category_incident"]
        
        response = self._make_request("search/news", data)
        
        if response["result"] == 0:
            return response["return_object"]
        else:
            st.error("뉴스 상세 정보를 가져오는데 실패했습니다.")
            return {"total_hits": 0, "documents": []}
    
    def get_word_cloud(self, query, start_date=None, end_date=None, providers=None, 
                      categories=None, incident_categories=None, byline=None):
        """
        연관어 분석(워드 클라우드) API를 호출하여 연관 키워드를 가져옵니다.
        
        Args:
            query (str): 검색 쿼리
            start_date (str): 검색 시작일 (YYYY-MM-DD)
            end_date (str): 검색 종료일 (YYYY-MM-DD)
            providers (list): 언론사 목록
            categories (list): 뉴스 분류 목록
            incident_categories (list): 사건/사고 분류 목록
            byline (str): 기자 이름
            
        Returns:
            list: 연관 키워드 목록
        """
        data = {
            "argument": {
                "query": query
            }
        }
        
        if start_date and end_date:
            data["argument"]["published_at"] = {
                "from": start_date,
                "until": end_date
            }
        
        if providers:
            data["argument"]["provider"] = providers
        
        if categories:
            data["argument"]["category"] = categories
        
        if incident_categories:
            data["argument"]["category_incident"] = incident_categories
        
        if byline:
            data["argument"]["byline"] = byline
        
        response = self._make_request("word_cloud", data)
        
        if response["result"] == 0:
            return response["return_object"]["nodes"]
        else:
            st.error("연관어 분석에 실패했습니다.")
            return []
    
    def get_time_line(self, query, start_date=None, end_date=None, providers=None, 
                     categories=None, incident_categories=None, byline=None, 
                     interval="day", normalize=False):
        """
        키워드 트렌드(뉴스 타임라인) API를 호출하여 키워드 트렌드를 가져옵니다.
        
        Args:
            query (str): 검색 쿼리
            start_date (str): 검색 시작일 (YYYY-MM-DD)
            end_date (str): 검색 종료일 (YYYY-MM-DD)
            providers (list): 언론사 목록
            categories (list): 뉴스 분류 목록
            incident_categories (list): 사건/사고 분류 목록
            byline (str): 기자 이름
            interval (str): 집계 간격 (day, month, year)
            normalize (bool): 정규화 여부
            
        Returns:
            dict: 키워드 트렌드
        """
        data = {
            "argument": {
                "query": query,
                "interval": interval,
                "normalize": str(normalize).lower()
            }
        }
        
        if start_date and end_date:
            data["argument"]["published_at"] = {
                "from": start_date,
                "until": end_date
            }
        
        if providers:
            data["argument"]["provider"] = providers
        
        if categories:
            data["argument"]["category"] = categories
        
        if incident_categories:
            data["argument"]["category_incident"] = incident_categories
        
        if byline:
            data["argument"]["byline"] = byline
        
        response = self._make_request("time_line", data)
        
        if response["result"] == 0:
            return response["return_object"]
        else:
            st.error("키워드 트렌드 분석에 실패했습니다.")
            return {"total_hits": 0, "time_line": []}
    
    def extract_keywords(self, title=None, subtitle=None, content=None):
        """
        키워드 추출 API를 호출하여 텍스트에서 키워드를 추출합니다.
        
        Args:
            title (str): 제목
            subtitle (str): 부제목
            content (str): 본문
            
        Returns:
            dict: 추출된 키워드
        """
        data = {
            "argument": {}
        }
        
        if title:
            data["argument"]["title"] = title
        
        if subtitle:
            data["argument"]["sub_title"] = subtitle
        
        if content:
            data["argument"]["content"] = content
        
        response = self._make_request("keyword", data)
        
        if response["result"] == 0:
            return response["return_object"]["result"]
        else:
            st.error("키워드 추출에 실패했습니다.")
            return {"title": "", "sub_title": "", "content": ""}
    
    def extract_features(self, title=None, subtitle=None, content=None):
        """
        특성 추출 API를 호출하여 텍스트에서 특성을 추출합니다.
        
        Args:
            title (str): 제목
            subtitle (str): 부제목
            content (str): 본문
            
        Returns:
            dict: 추출된 특성
        """
        data = {
            "argument": {}
        }
        
        if title:
            data["argument"]["title"] = title
        
        if subtitle:
            data["argument"]["sub_title"] = subtitle
        
        if content:
            data["argument"]["content"] = content
        
        response = self._make_request("feature", data)
        
        if response["result"] == 0:
            return response["return_object"]["result"]
        else:
            st.error("특성 추출에 실패했습니다.")
            return {"title": "", "sub_title": "", "content": ""}

class NewsAnalysisSystem:
    """뉴스 분석 시스템 클래스"""
    
    def __init__(self, api):
        """
        API 객체로 초기화
        
        Args:
            api (BigKindsAPI): BigKindsAPI 객체
        """
        self.api = api
    
    def analyze_issue(self, issue, start_date=None, end_date=None, days_to_analyze=14):
        """
        이슈를 분석합니다.
        
        Args:
            issue (dict): 분석할 이슈
            start_date (str): 분석 시작일
            end_date (str): 분석 종료일
            days_to_analyze (int): 과거 몇 일치를 분석할지 설정
            
        Returns:
            dict: 이슈 분석 결과
        """
        # 분석 결과를 저장할 딕셔너리
        analysis_result = {
            "issue": issue,
            "related_news": [],
            "keywords": [],
            "wordcloud": [],
            "timeline": [],
            "historical_comparison": []
        }
        
        # 분석 날짜 범위 설정
        if not start_date:
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(days=7)
            
            start_date = start_date_obj.strftime("%Y-%m-%d")
            end_date = end_date_obj.strftime("%Y-%m-%d")
        
        # 1. 관련 뉴스 검색
        topic_keywords = issue.get("topic_keyword", "").split(",")
        main_keywords = topic_keywords[:3]  # 상위 3개 키워드만 사용
        query = " AND ".join(main_keywords)
        
        news_result = self.api.search_news(
            query=query,
            start_date=start_date,
            end_date=end_date,
            return_size=20,
            fields=["title", "content", "published_at", "provider", "category", "byline", "hilight"]
        )
        
        analysis_result["related_news"] = news_result["documents"]
        
        # 2. 모든 관련 뉴스의 본문을 합쳐서 키워드 추출
        combined_content = ""
        for news in analysis_result["related_news"]:
            if "content" in news:
                combined_content += news["content"] + " "
        
        if combined_content:
            extracted_keywords = self.api.extract_keywords(content=combined_content)
            if extracted_keywords and "content" in extracted_keywords:
                analysis_result["keywords"] = [kw.strip() for kw in extracted_keywords["content"].split()]
        
        # 3. 연관어 분석
        wordcloud_result = self.api.get_word_cloud(
            query=query,
            start_date=start_date,
            end_date=end_date
        )
        
        analysis_result["wordcloud"] = wordcloud_result
        
        # 4. 시간별 키워드 트렌드 분석
        # 현재부터 지정된 일수만큼 이전까지의 데이터 분석
        timeline_end = datetime.now()
        timeline_start = timeline_end - timedelta(days=days_to_analyze)
        
        timeline_result = self.api.get_time_line(
            query=query,
            start_date=timeline_start.strftime("%Y-%m-%d"),
            end_date=timeline_end.strftime("%Y-%m-%d"),
            interval="day"
        )
        
        analysis_result["timeline"] = timeline_result
        
        # 5. 과거 데이터 비교 (1주일 전, 2주일 전)
        historical_comparison = []
        
        # 1주일 전 데이터
        week_ago_end = datetime.now() - timedelta(days=7)
        week_ago_start = week_ago_end - timedelta(days=7)
        
        week_ago_result = self.api.search_news(
            query=query,
            start_date=week_ago_start.strftime("%Y-%m-%d"),
            end_date=week_ago_end.strftime("%Y-%m-%d"),
            return_size=10,
            fields=["title", "published_at", "provider"]
        )
        
        historical_comparison.append({
            "period": "1주일 전",
            "news": week_ago_result["documents"]
        })
        
        # 2주일 전 데이터
        two_weeks_ago_end = datetime.now() - timedelta(days=14)
        two_weeks_ago_start = two_weeks_ago_end - timedelta(days=7)
        
        two_weeks_ago_result = self.api.search_news(
            query=query,
            start_date=two_weeks_ago_start.strftime("%Y-%m-%d"),
            end_date=two_weeks_ago_end.strftime("%Y-%m-%d"),
            return_size=10,
            fields=["title", "published_at", "provider"]
        )
        
        historical_comparison.append({
            "period": "2주일 전",
            "news": two_weeks_ago_result["documents"]
        })
        
        analysis_result["historical_comparison"] = historical_comparison
        
        return analysis_result
    
    def cluster_news(self, news_list, num_clusters=5):
        """
        뉴스 기사를 클러스터링합니다. (단순 키워드 기반)
        
        Args:
            news_list (list): 뉴스 기사 목록
            num_clusters (int): 클러스터 수
            
        Returns:
            dict: 클러스터링 결과
        """
        if not news_list:
            return {}
        
        # 간단한 키워드 기반 클러스터링
        clusters = {}
        
        # 각 기사의 키워드 추출
        for news in news_list:
            title = news.get("title", "")
            content = news.get("content", "")
            
            # 키워드 추출
            extracted = self.api.extract_keywords(title=title, content=content)
            
            # 가장 중요한 키워드 선택
            main_keyword = None
            if extracted and "content" in extracted:
                keywords = extracted["content"].split()
                if keywords:
                    main_keyword = keywords[0]
            
            if not main_keyword:
                main_keyword = "기타"
            
            # 클러스터에 기사 추가
            if main_keyword not in clusters:
                clusters[main_keyword] = []
            
            clusters[main_keyword].append(news)
        
        # 너무 많은 클러스터가 생기면 가장 기사가 많은 클러스터만 선택
        if len(clusters) > num_clusters:
            clusters = dict(sorted(clusters.items(), key=lambda x: len(x[1]), reverse=True)[:num_clusters])
        
        return clusters
    
    def create_wordcloud_image(self, words_with_weights):
        """
        워드클라우드 이미지를 생성합니다.
        
        Args:
            words_with_weights (list): (단어, 가중치) 튜플 목록
            
        Returns:
            Image: 워드클라우드 이미지
        """
        # 단어와 가중치를 딕셔너리로 변환
        word_freq = {}
        
        if isinstance(words_with_weights, list):
            for item in words_with_weights:
                if isinstance(item, dict) and "name" in item and "weight" in item:
                    word = item["name"]
                    weight = item["weight"]
                    word_freq[word] = weight
        
        # 기본값 설정
        if not word_freq:
            word_freq = {"데이터": 1, "없음": 1}
        
        # 워드 클라우드 생성
        wordcloud = WordCloud(
            width=800,
            height=400,
            background_color='white',
            font_path='malgun',  # 한글 폰트 경로 설정 필요
            max_words=100,
            max_font_size=200,
            random_state=42
        ).generate_from_frequencies(word_freq)
        
        return wordcloud
    
    def create_timeline_chart(self, timeline_data):
        """
        타임라인 차트를 생성합니다.
        
        Args:
            timeline_data (dict): 타임라인 데이터
            
        Returns:
            plt.Figure: 타임라인 차트
        """
        # 타임라인 데이터가 없으면 빈 차트 반환
        if not timeline_data or "time_line" not in timeline_data or not timeline_data["time_line"]:
            fig, ax = plt.subplots(figsize=(10, 5))
            ax.text(0.5, 0.5, "데이터가 없습니다.", ha='center', va='center')
            return fig
        
        # 데이터 프레임 생성
        df = pd.DataFrame(timeline_data["time_line"])
        
        # 날짜 포맷 변환 (YYYYMMDD 또는 YYYYMM 형식)
        df['date'] = df['label'].apply(self._format_date)
        
        # 정렬
        df = df.sort_values('date')
        
        # 차트 생성
        fig, ax = plt.subplots(figsize=(12, 6))
        sns.lineplot(data=df, x='date', y='hits', marker='o', ax=ax)
        
        # 차트 스타일 설정
        plt.xticks(rotation=45)
        plt.title('키워드 언급 추이')
        plt.xlabel('날짜')
        plt.ylabel('언급 횟수')
        plt.tight_layout()
        
        return fig
    
    def _format_date(self, date_str):
        """
        날짜 문자열을 포맷팅합니다.
        
        Args:
            date_str (str): 날짜 문자열 (YYYYMMDD 또는 YYYYMM)
            
        Returns:
            str: 포맷팅된 날짜 문자열
        """
        if len(date_str) == 8:  # YYYYMMDD
            return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
        elif len(date_str) == 6:  # YYYYMM
            return f"{date_str[:4]}-{date_str[4:]}"
        else:
            return date_str
    
    def summarize_article(self, content, max_length=200):
        """
        기사 내용을 요약합니다. (간단한 방식)
        
        Args:
            content (str): 기사 내용
            max_length (int): 최대 길이
            
        Returns:
            str: 요약된 내용
        """
        # 실제로는 AI 요약 API 등을 사용하는 것이 좋지만,
        # 간단한 방식으로 구현
        if not content:
            return ""
        
        # 문장 단위로 분리
        sentences = re.split(r'(?<=[.!?])\s+', content)
        
        # 첫 몇 문장만 선택
        summary = " ".join(sentences[:3])
        
        # 길이 제한
        if len(summary) > max_length:
            summary = summary[:max_length-3] + "..."
        
        return summary

# Streamlit 앱 생성
def main():
    st.set_page_config(page_title="뉴스 이슈 분석 시스템", layout="wide")
    
    # 타이틀 및 소개
    st.title("📰 뉴스 이슈 분석 시스템")
    st.write("빅카인즈 API를 활용한 뉴스 이슈 자동 분석 시스템")
    
    # API 키 입력
    with st.sidebar:
        st.header("⚙️ 설정")
        api_key = st.text_input("API 키", type="password")
        
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
        
        # 언론사 선택
        st.header("📰 언론사 필터")
        all_providers = ["경향신문", "국민일보", "내일신문", "동아일보", "문화일보", "서울신문", 
                        "세계일보", "조선일보", "중앙일보", "한겨레", "한국일보"]
        selected_providers = st.multiselect("언론사 선택", all_providers)
    
    # API 키가 입력되지 않았을 경우
    if not api_key:
        st.warning("사이드바에 API 키를 입력해주세요.")
        st.stop()
    
    # API 초기화
    try:
        api = BigKindsAPI(api_key)
        news_system = NewsAnalysisSystem(api)
    except Exception as e:
        st.error(f"API 초기화 중 오류가 발생했습니다: {str(e)}")
        st.stop()
    
    # 날짜 형식 변환
    date_str = selected_date.strftime("%Y-%m-%d")
    
    # 탭 생성
    tab1, tab2, tab3 = st.tabs(["📋 오늘의 이슈", "🔍 이슈 분석", "📊 과거 데이터 비교"])
    
    # 탭 1: 오늘의 이슈
    with tab1:
        st.header(f"📋 {date_str} 주요 이슈")
        
        with st.spinner("오늘의 이슈를 불러오는 중..."):
            issues = api.get_issues(date=date_str, providers=selected_providers)
        
        if not issues:
            st.warning(f"{date_str}에 해당하는 이슈를 찾을 수 없습니다.")
        else:
            # 이슈 목록 표시
            for i, issue in enumerate(issues[:10]):  # 상위 10개 이슈만 표시
                topic = issue.get("topic", "제목 없음")
                rank = issue.get("topic_rank", 0)
                
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
                    if news_cluster:
                        st.write("**관련 기사 미리보기:**")
                        
                        # 관련 기사 상세 정보 가져오기 (최대 5개만)
                        with st.spinner("관련 기사를 불러오는 중..."):
                            news_details = api.get_news_detail(
                                news_ids=news_cluster[:5],
                                fields=["title", "published_at", "provider", "hilight"]
                            )
                        
                        # 관련 기사 표시
                        for j, news in enumerate(news_details.get("documents", [])):
                            st.write(f"**{j+1}. {news.get('title', '제목 없음')}**")
                            st.write(f"*출처: {news.get('provider', '출처 미상')} | 발행: {news.get('published_at', '날짜 정보 없음')[:10]}*")
                            if "hilight" in news:
                                st.write(news.get("hilight", ""))
                            st.write("---")
                    
                    # 이슈 분석 버튼
                    if st.button(f"이슈 분석하기 #{i+1}", key=f"analyze_issue_{i}"):
                        # 세션 상태에 선택한 이슈 저장
                        st.session_state.selected_issue = issue
                        st.session_state.selected_issue_index = i
                        # 이슈 분석 탭으로 이동
                        st.experimental_set_query_params(tab="issue_analysis")
                        st.experimental_rerun()
    
    # 탭 2: 이슈 분석
    with tab2:
        st.header("🔍 이슈 상세 분석")
        
        # 세션 상태에서 선택한 이슈 가져오기 또는 사용자가 직접 선택
        if "selected_issue" in st.session_state:
            selected_issue = st.session_state.selected_issue
            selected_issue_index = st.session_state.selected_issue_index
        else:
            # 이슈 목록 가져오기
            with st.spinner("이슈 목록을 불러오는 중..."):
                issues = api.get_issues(date=date_str, providers=selected_providers)
            
            if not issues:
                st.warning(f"{date_str}에 해당하는 이슈를 찾을 수 없습니다.")
                st.stop()
            
            # 이슈 선택 박스
            issue_titles = [f"{i+1}. {issue.get('topic', '제목 없음')}" for i, issue in enumerate(issues)]
            selected_issue_title = st.selectbox("분석할 이슈 선택", issue_titles)
            
            # 선택한 이슈 인덱스 추출
            selected_issue_index = issue_titles.index(selected_issue_title)
            selected_issue = issues[selected_issue_index]
        
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
                analysis_result = news_system.analyze_issue(
                    issue=selected_issue,
                    start_date=start_date_str,
                    end_date=end_date_str,
                    days_to_analyze=days_to_analyze
                )
                
                # 분석 결과 세션 상태에 저장
                st.session_state.analysis_result = analysis_result
        
        # 분석 결과 표시
        if "analysis_result" in st.session_state:
            analysis_result = st.session_state.analysis_result
            
            # 분석 결과 탭 생성
            analysis_tab1, analysis_tab2, analysis_tab3, analysis_tab4 = st.tabs([
                "📰 관련 기사", "🔑 키워드 분석", "📈 시간별 추이", "🔍 클러스터 분석"
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
                                summary = news_system.summarize_article(news.get("content", ""))
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
                
                # 추출된 키워드 표시
                extracted_keywords = analysis_result.get("keywords", [])
                
                if extracted_keywords:
                    st.write("**추출된 키워드:**")
                    st.write(", ".join(extracted_keywords[:20]))
                
                # 연관어 분석 결과 표시
                wordcloud_data = analysis_result.get("wordcloud", [])
                
                if wordcloud_data:
                    st.write("**연관어 분석 결과:**")
                    
                    # 연관어 표 표시
                    wordcloud_df = pd.DataFrame([
                        {"키워드": item.get("name", ""), "중요도": round(item.get("weight", 0), 2)}
                        for item in wordcloud_data
                    ])
                    
                    st.dataframe(wordcloud_df, use_container_width=True)
                    
                    # 워드 클라우드 생성 및 표시
                    st.write("**워드 클라우드:**")
                    wordcloud = news_system.create_wordcloud_image(wordcloud_data)
                    
                    fig, ax = plt.subplots(figsize=(10, 6))
                    ax.imshow(wordcloud, interpolation='bilinear')
                    ax.axis("off")
                    st.pyplot(fig)
                else:
                    st.info("연관어 분석 결과가 없습니다.")
            
            # 탭 3: 시간별 추이
            with analysis_tab3:
                st.subheader("시간별 키워드 추이")
                
                timeline_data = analysis_result.get("timeline", {})
                
                if timeline_data and "time_line" in timeline_data and timeline_data["time_line"]:
                    # 타임라인 데이터 표시
                    st.write("**기간별 언급 횟수:**")
                    
                    # 데이터프레임 생성 및 표시
                    timeline_df = pd.DataFrame([
                        {"날짜": news_system._format_date(item.get("label", "")), "언급 횟수": item.get("hits", 0)}
                        for item in timeline_data["time_line"]
                    ])
                    
                    st.dataframe(timeline_df, use_container_width=True)
                    
                    # 타임라인 차트 생성 및 표시
                    st.write("**키워드 추이 차트:**")
                    timeline_chart = news_system.create_timeline_chart(timeline_data)
                    st.pyplot(timeline_chart)
                else:
                    st.info("시간별 추이 데이터가 없습니다.")
            
            # 탭 4: 클러스터 분석
            with analysis_tab4:
                st.subheader("뉴스 클러스터 분석")
                
                related_news = analysis_result.get("related_news", [])
                
                if related_news:
                    # 뉴스 클러스터링
                    news_clusters = news_system.cluster_news(related_news)
                    
                    if news_clusters:
                        # 클러스터 표시
                        for cluster_name, cluster_news in news_clusters.items():
                            with st.expander(f"클러스터: {cluster_name} ({len(cluster_news)}개 기사)"):
                                # 클러스터 내 기사 목록
                                for i, news in enumerate(cluster_news):
                                    st.write(f"**{i+1}. {news.get('title', '제목 없음')}**")
                                    st.write(f"*출처: {news.get('provider', '출처 미상')} | 발행: {news.get('published_at', '날짜 정보 없음')[:10]}*")
                                    
                                    # 하이라이트 또는 요약
                                    if "hilight" in news:
                                        st.write(news.get("hilight", ""))
                                    
                                    st.write("---")
                    else:
                        st.info("클러스터 분석 결과가 없습니다.")
                else:
                    st.info("클러스터 분석을 위한 관련 기사가 없습니다.")
    
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

if __name__ == "__main__":
    main()