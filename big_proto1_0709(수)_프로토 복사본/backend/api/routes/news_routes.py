"""
뉴스 관련 API 라우트

최신 뉴스, 인기 키워드, 이슈 등 뉴스 관련 API 엔드포인트를 정의합니다.
타임라인 형식의 뉴스 제공 및 상세 내용 조회 기능을 포함합니다.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Path
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
import asyncio
import json
import os
import time
# import openai  # AWS Bedrock으로 대체됨
import sys
from pathlib import Path as PathLib

# 프로젝트 루트 디렉토리 찾기
PROJECT_ROOT = PathLib(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.utils.logger import setup_logger
from backend.api.clients.bigkinds import BigKindsClient
# import openai  # AWS Bedrock으로 대체됨
from backend.constants.provider_map import PROVIDER_MAP

# 상수 정의
MAX_TOKENS_PER_CHUNK = 4000
DEFAULT_DATE_RANGE_DAYS = 30
MAX_ARTICLES_FOR_SUMMARY = 5
AI_MODEL = "gpt-4-turbo-preview"
AI_TEMPERATURE = 0.3
AI_MAX_TOKENS = 2000

# API 라우터 생성
router = APIRouter(prefix="/api/news", tags=["뉴스"])

# 의존성 함수들
def get_bigkinds_client() -> BigKindsClient:
    """BigKinds 클라이언트 인스턴스 가져오기"""
    from backend.api.dependencies import get_bigkinds_client as get_bigkinds
    return get_bigkinds()

# OpenAI 관련 함수는 삭제됨 (Bedrock으로 대체)

# 유틸리티 함수들
def get_default_date_range(days: int = DEFAULT_DATE_RANGE_DAYS) -> tuple[str, str]:
    """기본 날짜 범위 반환"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

def get_report_type_kr(report_type: str) -> str:
    """레포트 타입에 따른 한글 이름 반환"""
    report_type_map = {
        "daily": "일일",
        "weekly": "주간", 
        "monthly": "월간",
        "quarterly": "분기별",
        "yearly": "연간"
    }
    return report_type_map.get(report_type, "기본")

def validate_date_format(date_str: str) -> bool:
    """날짜 형식 검증"""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False

def chunk_articles_by_tokens(articles: List[Dict], max_tokens: int = MAX_TOKENS_PER_CHUNK) -> List[str]:
    """기사들을 토큰 수 기준으로 청킹"""
    chunks = []
    current_chunk = ""
    current_tokens = 0
    
    for i, article in enumerate(articles, 1):
        ref_id = article.get("ref_id", f"ref{i}")
        article_text = f"[기사 {ref_id}]\n"
        article_text += f"제목: {article.get('title', '')}\n"
        article_text += f"내용: {article.get('content', '') or article.get('summary', '')}\n\n"
        
        # 대략적 토큰 수 추정
        article_tokens = len(article_text) // 2
        
        if current_tokens + article_tokens > max_tokens:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = article_text
            current_tokens = article_tokens
        else:
            current_chunk += article_text
            current_tokens += article_tokens
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

# Pydantic 모델들
class LatestNewsResponse(BaseModel):
    """최신 뉴스 응답 모델"""
    today_issues: List[Dict[str, Any]] = Field(description="오늘의 이슈 (빅카인즈 이슈 랭킹)")
    popular_keywords: List[Dict[str, Any]] = Field(description="인기 키워드")
    timestamp: str = Field(description="응답 시간")

class CompanyNewsRequest(BaseModel):
    """기업 뉴스 요청 모델"""
    company_name: str = Field(..., description="기업명")
    date_from: Optional[str] = Field(None, description="시작일 (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="종료일 (YYYY-MM-DD)")
    limit: Optional[int] = Field(default=20, description="가져올 기사 수", ge=1, le=100)
    provider: Optional[List[str]] = Field(None, description="언론사 필터 (예: ['서울경제'])")

class KeywordNewsRequest(BaseModel):
    """키워드 뉴스 요청 모델"""
    keyword: str = Field(..., description="검색 키워드")
    date_from: Optional[str] = Field(None, description="시작일 (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="종료일 (YYYY-MM-DD)")
    limit: Optional[int] = Field(default=30, description="가져올 기사 수", ge=1, le=100)

class AISummaryRequest(BaseModel):
    """AI 요약 요청 모델"""
    news_ids: List[str] = Field(..., description="요약할 뉴스 ID 리스트 (최대 5개)", max_items=MAX_ARTICLES_FOR_SUMMARY)

class WatchlistAddRequest(BaseModel):
    """관심종목 추가 요청 모델"""
    name: str = Field(..., description="기업명")
    code: str = Field(..., description="종목코드")
    category: str = Field(..., description="카테고리")

class WatchlistResponse(BaseModel):
    """관심종목 응답 모델"""
    success: bool = Field(description="성공 여부")
    message: str = Field(description="응답 메시지")
    watchlist: Optional[List[Dict[str, Any]]] = Field(None, description="관심종목 목록")

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = Field(default=False)
    error: str = Field(description="오류 메시지")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class ConciergeRequest(BaseModel):
    """AI 뉴스 컨시어지 요청 모델"""
    question: str = Field(..., description="사용자 질문", min_length=2, max_length=500)
    date_from: Optional[str] = Field(None, description="검색 시작일 (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="검색 종료일 (YYYY-MM-DD)")
    max_articles: int = Field(default=10, description="최대 검색 기사 수", ge=5, le=50)
    include_related_keywords: bool = Field(default=True, description="연관어 포함 여부")
    include_today_issues: bool = Field(default=True, description="오늘의 이슈 포함 여부")
    detail_level: str = Field(default="detailed", description="답변 상세도 (brief/detailed/comprehensive)")

class ArticleReference(BaseModel):
    """기사 참조 정보"""
    ref_id: str = Field(description="참조 ID (ref1, ref2 등)")
    title: str = Field(description="기사 제목")
    provider: str = Field(description="언론사")
    published_at: str = Field(description="발행일시")
    url: Optional[str] = Field(None, description="기사 URL")
    relevance_score: float = Field(description="관련도 점수", ge=0, le=1)

class ConciergeResponse(BaseModel):
    """AI 뉴스 컨시어지 응답 모델"""
    question: str = Field(description="원본 질문")
    answer: str = Field(description="AI 답변 (각주 포함)")
    summary: str = Field(description="핵심 요약")
    key_points: List[str] = Field(description="주요 포인트")
    references: List[ArticleReference] = Field(description="참조 기사 목록")
    related_keywords: List[str] = Field(default=[], description="연관 키워드")
    today_issues: List[Dict[str, Any]] = Field(default=[], description="관련 오늘의 이슈")
    search_strategy: Dict[str, Any] = Field(description="사용된 검색 전략")
    analysis_metadata: Dict[str, Any] = Field(description="분석 메타데이터")
    generated_at: str = Field(description="생성 시간")

class ConciergeProgress(BaseModel):
    """컨시어지 진행 상황"""
    stage: str = Field(description="현재 단계")
    progress: int = Field(description="진행률 (0-100)", ge=0, le=100)
    message: str = Field(description="진행 메시지")
    current_task: Optional[str] = Field(None, description="현재 작업")
    extracted_keywords: Optional[List[str]] = Field(None, description="추출된 키워드")
    search_results_count: Optional[int] = Field(None, description="검색 결과 수")
    streaming_content: Optional[str] = Field(None, description="스트리밍 컨텐츠")
    result: Optional[ConciergeResponse] = Field(None, description="최종 결과")

# 에러 핸들러
async def handle_api_error(logger, operation: str, error: Exception) -> ErrorResponse:
    """API 에러 공통 처리"""
    logger.error(f"{operation} 오류: {error}", exc_info=True)
    return ErrorResponse(
        error=f"{operation} 중 오류 발생: {str(error)}"
    )

# 모델 정의 섹션에 관심종목 관련 모델 추가

# 비즈니스 로직 함수들
async def process_today_issues(bigkinds_client: BigKindsClient, logger) -> List[Dict[str, Any]]:
    """오늘의 이슈 처리"""
    try:
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        issue_response = bigkinds_client.get_issue_ranking(date=yesterday)
        logger.info(f"이슈 랭킹 API 응답: {issue_response}")
        
        if issue_response.get("result") != 0:
            logger.warning(f"이슈 랭킹 API 오류: {issue_response.get('error', '알 수 없는 오류')}")
            return get_dummy_issues()
        
        formatted_issues = bigkinds_client.format_issue_ranking_response(issue_response)
        if not formatted_issues.get("success"):
            logger.warning(f"이슈 랭킹 포맷팅 실패: {formatted_issues.get('error')}")
            return []
        
        topics = formatted_issues.get("topics", [])[:10]
        return await process_issue_topics(topics, bigkinds_client, logger)
        
    except Exception as e:
        logger.error(f"오늘의 이슈 조회 오류: {e}", exc_info=True)
        return get_dummy_issues()

async def process_issue_topics(topics: List[Dict], bigkinds_client: BigKindsClient, logger) -> List[Dict[str, Any]]:
    """이슈 토픽들 처리"""
    today_issues = []
    
    for idx, topic in enumerate(topics):
        cluster_ids = topic.get("news_cluster", [])
        provider_counts = {}
        actual_news_ids = []
        
        # 클러스터 ID에서 언론사 코드 추출
        if cluster_ids:
            try:
                provider_counts, actual_news_ids = extract_provider_info_from_clusters(
                    cluster_ids, bigkinds_client, logger
                )
            except Exception as e:
                logger.error(f"언론사 코드 추출 오류: {str(e)}", exc_info=True)
        
        # Fallback: 키워드 검색
        if not provider_counts:
            provider_counts, actual_news_ids = await fallback_keyword_search(
                topic, bigkinds_client, logger
            )
        
        issue_item = create_issue_item(topic, provider_counts, actual_news_ids, cluster_ids, idx)
        today_issues.append(issue_item)
        
    return today_issues

def extract_provider_info_from_clusters(cluster_ids: List[str], bigkinds_client: BigKindsClient, logger) -> tuple:
    """클러스터 ID에서 언론사 정보 추출"""
    provider_counts = {}
    actual_news_ids = []
    
    logger.info(f"클러스터 ID 직접 처리 시작: {len(cluster_ids)} 개")
    
    for cluster_id in cluster_ids:
        if cluster_id and "." in cluster_id:
            code = cluster_id.split(".")[0]
            actual_news_ids.append(cluster_id)
            provider_counts[code] = provider_counts.get(code, 0) + 1
    
    logger.info(f"클러스터 ID 직접 처리 완료: {len(provider_counts)} 개 언론사 코드 추출")
    
    # API 호출 fallback
    if not provider_counts:
        logger.info("언론사 코드 직접 추출 실패, API 호출 시도")
        search_res = bigkinds_client.get_news_by_cluster_ids(cluster_ids[:100])
        formatted = bigkinds_client.format_news_response(search_res)
        
        for doc in formatted.get("documents", []):
            code = doc.get("provider_code")
            if not code:
                nid = doc.get("id") or doc.get("news_id")
                if nid and "." in nid:
                    code = nid.split(".")[0]
            
            news_id = doc.get("id")
            if news_id:
                actual_news_ids.append(news_id)
                if code:
                    provider_counts[code] = provider_counts.get(code, 0) + 1
    
    return provider_counts, actual_news_ids

async def fallback_keyword_search(topic: Dict, bigkinds_client: BigKindsClient, logger) -> tuple:
    """키워드 기반 fallback 검색"""
    provider_counts = {}
    actual_news_ids = []
    
    try:
        keyword = topic.get("topic", "") or topic.get("topic_keyword", "").split(",")[0] if topic.get("topic_keyword") else ""
        if not keyword:
            return provider_counts, actual_news_ids
        
        date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")
        
        kw_res = bigkinds_client.search_news(
            query=keyword.strip(),
            date_from=date_from,
            date_to=date_to,
            return_size=100
        )
        
        kw_docs = bigkinds_client.format_news_response(kw_res).get("documents", [])
        for doc in kw_docs:
            code = doc.get("provider_code")
            if not code:
                nid = doc.get("id") or doc.get("news_id")
                if nid and "." in nid:
                    code = nid.split(".")[0]
            
            news_id = doc.get("id")
            if news_id:
                actual_news_ids.append(news_id)
                if code:
                    provider_counts[code] = provider_counts.get(code, 0) + 1
                    
    except Exception as e:
        logger.warning(f"키워드 검색 fallback 실패: {e}")
    
    return provider_counts, actual_news_ids

def create_issue_item(topic: Dict, provider_counts: Dict, actual_news_ids: List, cluster_ids: List, idx: int) -> Dict:
    """이슈 아이템 생성"""
    total_count = sum(provider_counts.values())
    if total_count == 0:
        total_count = len(actual_news_ids) if actual_news_ids else len(cluster_ids)
    
    breakdown = [
        {
            "provider": PROVIDER_MAP.get(code, code),
            "provider_code": code,
            "count": cnt
        }
        for code, cnt in sorted(provider_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return {
        "rank": topic.get("rank", idx + 1),
        "title": topic.get("topic", ""),
        "count": total_count,
        "provider_breakdown": breakdown,
        "related_news_ids": actual_news_ids[:50],
        "cluster_ids": cluster_ids,
        "topic": topic.get("topic", ""),
        "topic_rank": topic.get("rank", idx + 1),
        "topic_keyword": topic.get("topic_keyword", ""),
        "news_cluster": cluster_ids,
    }
#### -> 샘플데이터임
def get_dummy_issues() -> List[Dict[str, Any]]:
    """더미 이슈 데이터"""
    return [
        {
            "rank": 1,
            "title": "반도체 수출 증가세",
            "count": 145,
            "related_news_ids": ["news_001", "news_002"],
            "cluster_ids": ["cluster_001", "cluster_002"],
            "topic": "반도체 수출 증가세",
            "topic_rank": 1,
            "topic_keyword": "반도체",
            "news_cluster": ["cluster_001", "cluster_002"]
        },
        {
            "rank": 2,
            "title": "AI 기업 투자 확대",
            "count": 98,
            "related_news_ids": ["news_003", "news_004"],
            "cluster_ids": ["cluster_003", "cluster_004"],
            "topic": "AI 기업 투자 확대",
            "topic_rank": 2,
            "topic_keyword": "AI",
            "news_cluster": ["cluster_003", "cluster_004"]
        },
        {
            "rank": 3,
            "title": "부동산 시장 변화",
            "count": 87,
            "related_news_ids": ["news_005", "news_006"],
            "cluster_ids": ["cluster_005", "cluster_006"],
            "topic": "부동산 시장 변화",
            "topic_rank": 3,
            "topic_keyword": "부동산",
            "news_cluster": ["cluster_005", "cluster_006"]
        }
    ]

async def process_popular_keywords(bigkinds_client: BigKindsClient, logger) -> List[Dict[str, Any]]:
    """인기 키워드 처리"""
    try:
        logger.info("인기 키워드 요청 시작")
        keyword_response = bigkinds_client.get_popular_keywords(days=1, limit=30)
        
        if keyword_response.get("result") != 0:
            logger.warning(f"키워드 랭킹 API 오류: {keyword_response.get('error', '알 수 없는 오류')}")
            return [{"rank": 1, "keyword": "키워드 데이터를 불러오는 중입니다.", "count": 0, "trend": "stable"}]
        
        formatted_keywords = keyword_response.get("formatted_keywords", [])
        popular_keywords = [
            {
                "rank": kw.get("rank", idx + 1),
                "keyword": kw.get("keyword", ""),
                "count": kw.get("count", 0),
                "trend": kw.get("trend", "stable")
            }
            for idx, kw in enumerate(formatted_keywords[:30])
        ]
        
        logger.info(f"인기 키워드 {len(popular_keywords)}개 조회 성공")
        return popular_keywords
        
    except Exception as e:
        logger.error(f"인기 키워드 조회 오류: {e}", exc_info=True)
        return []

# 엔드포인트 정의
@router.get("/latest", response_model=LatestNewsResponse)
async def get_latest_news(
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """최신 뉴스 정보 조회 (수정된 API 구조 기반)
    
    - 오늘의 이슈 (빅카인즈 이슈 랭킹)
    - 인기 키워드 (전체 검색 순위)
    """
    logger = setup_logger("api.news.latest")
    logger.info("최신 뉴스 정보 요청")
    
    # 병렬로 처리
    today_issues_task = process_today_issues(bigkinds_client, logger)
    popular_keywords_task = process_popular_keywords(bigkinds_client, logger)
    
    today_issues, popular_keywords = await asyncio.gather(
        today_issues_task, popular_keywords_task, return_exceptions=True
    )
    
    # 예외 처리
    if isinstance(today_issues, Exception):
        logger.error(f"오늘의 이슈 처리 실패: {today_issues}")
        today_issues = get_dummy_issues()
    
    if isinstance(popular_keywords, Exception):
        logger.error(f"인기 키워드 처리 실패: {popular_keywords}")
        popular_keywords = []
    
    return LatestNewsResponse(
        today_issues=today_issues,
        popular_keywords=popular_keywords,
        timestamp=datetime.now().isoformat()
    )

@router.post("/company")
async def get_company_news(
    request: CompanyNewsRequest,
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """특정 기업의 뉴스 가져오기
    
    기업명으로 뉴스를 검색하고 타임라인 형식으로 반환합니다.
    """
    logger = setup_logger("api.news.company")
    logger.info(f"기업 뉴스 요청: {request.company_name}")
    
    try:
        # 날짜 기본값 설정 (최근 30일)
        if not request.date_from:
            request.date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not request.date_to:
            request.date_to = datetime.now().strftime("%Y-%m-%d")
        
        # BigKinds API로 기업 뉴스 타임라인 조회
        result = bigkinds_client.get_company_news_timeline(
            company_name=request.company_name,
            date_from=request.date_from,
            date_to=request.date_to,
            return_size=request.limit,
            provider=request.provider  # 언론사 필터 추가
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=404, detail="기업 뉴스를 찾을 수 없습니다")
        
        return {
            "company": request.company_name,
            "period": {
                "from": request.date_from,
                "to": request.date_to
            },
            "total_count": result.get("total_count", 0),
            "timeline": result.get("timeline", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기업 뉴스 조회 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"기업 뉴스 조회 중 오류 발생: {str(e)}")

@router.post("/keyword")
async def get_keyword_news(
    request: KeywordNewsRequest,
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """키워드 기반 뉴스 검색 및 타임라인 구성
    
    키워드로 뉴스를 검색하고 타임라인 형식으로 반환합니다.
    """
    logger = setup_logger("api.news.keyword")
    logger.info(f"키워드 뉴스 요청: {request.keyword}")
    
    try:
        # 날짜 기본값 설정 (최근 30일)
        if not request.date_from:
            request.date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not request.date_to:
            request.date_to = datetime.now().strftime("%Y-%m-%d")
        
        # BigKinds API로 키워드 뉴스 타임라인 조회
        result = bigkinds_client.get_keyword_news_timeline(
            keyword=request.keyword,
            date_from=request.date_from,
            date_to=request.date_to,
            return_size=request.limit
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=404, detail="키워드 관련 뉴스를 찾을 수 없습니다")
        
        return {
            "keyword": request.keyword,
            "period": {
                "from": request.date_from,
                "to": request.date_to
            },
            "total_count": result.get("total_count", 0),
            "timeline": result.get("timeline", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"키워드 뉴스 조회 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"키워드 뉴스 조회 중 오류 발생: {str(e)}")

@router.get("/detail/{news_id}")
async def get_news_detail(
    news_id: str = Path(..., description="뉴스 ID"),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """뉴스 상세 정보 조회
    
    뉴스 ID로 상세 정보를 조회합니다.
    """
    logger = setup_logger("api.news.detail")
    logger.info(f"뉴스 상세 정보 요청: {news_id}")
    
    try:
        # 뉴스 ID로 상세 정보 조회
        result = bigkinds_client.get_news_detail(news_id)
        
        if not result.get("success", False):
            raise HTTPException(status_code=404, detail="뉴스를 찾을 수 없습니다")
        
        return {
            "success": True,
            "news": result.get("news"),
            "has_original_link": result.get("has_original_link", False),
            "metadata": {
                "retrieved_at": datetime.now().isoformat(),
                "source": "BigKinds API"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 상세 정보 조회 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"뉴스 상세 정보 조회 중 오류 발생: {str(e)}")

# AI 요약 관련 함수들
async def prepare_articles_for_summary(news_ids: List[str], bigkinds_client: BigKindsClient) -> List[Dict]:
    """요약용 기사 데이터 준비"""
    # 클러스터 ID인지 일반 뉴스 ID인지 판단
    if news_ids and any("cluster" in news_id.lower() for news_id in news_ids):
        search_result = bigkinds_client.get_news_by_cluster_ids(news_ids)
    else:
        search_result = bigkinds_client.get_news_by_ids(news_ids)
    
    formatted_result = bigkinds_client.format_news_response(search_result)
    articles = formatted_result.get("documents", [])
    
    if not articles:
        raise HTTPException(status_code=404, detail="선택된 뉴스를 찾을 수 없습니다")
    
    # 각 기사에 참조 ID 부여
    for i, article in enumerate(articles):
        if not article.get("ref_id"):
            article["ref_id"] = f"ref{i+1}"
    
    return articles

def create_articles_text(articles: List[Dict]) -> str:
    """기사 텍스트 생성"""
    articles_text = ""
    for i, article in enumerate(articles, 1):
        title = article.get("title", "")
        content = article.get("content", "") or article.get("summary", "")
        provider = article.get("provider", "")
        published_at = article.get("published_at", "")
        byline = article.get("byline", "")
        
        articles_text += f"[기사 {i}]\n"
        articles_text += f"제목: {title}\n"
        articles_text += f"언론사: {provider}\n"
        if byline:
            articles_text += f"기자: {byline}\n"
        articles_text += f"발행일: {published_at}\n"
        articles_text += f"내용: {content}\n\n"
    
    return articles_text

def get_ai_summary_system_prompt() -> str:
    """AI 요약용 시스템 프롬프트"""
    return """당신은 뉴스 분석 전문가입니다. 주어진 뉴스 기사들을 분석하여 MZ세대를 위한 FAQ 형식으로 답변해주세요.

### 응답 형식:
기사 핵심요약 - [기사 제목 또는 핵심 주제]

[70~80자 내외의 간결한 요약]

서울경제 기사 FAQ - [기사 제목 또는 핵심 주제]

Q1. [기본 개념/정의 질문 - 50자 이내]

A. [70~80자 내외 답변]

Q2. [배경/원인 질문 - 50자 이내]

A. [70~80자 내외 답변]

Q3. [구체적 내용/현황 질문 - 50자 이내]

A. [70~80자 내외 답변]

Q4. [영향/전망 질문 - 50자 이내]

A. [70~80자 내외 답변]

Q5. [관련 정책/대응 질문 - 50자 이내] (필요시)

A. [70~80자 내외 답변]

Q6. [향후 과제/시사점 질문 - 50자 이내] (필요시)

A. [70~80자 내외 답변]

### [FAQ 작성 필수 지침]

**① MZ세대 최적화 원칙**:
- **짧고 임팩트**: 각 답변은 MZ세대가 카드를 넘기며 빠르게 읽을 수 있는 2~4줄 분량
- **핵심 정보 집중**: 궁금증 해소에 필요한 가장 중요한 정보만 포함
- **빠른 이해**: 복잡한 설명보다는 명확하고 간결한 핵심 전달

**② 구체적 정보 포함 의무 (매우 중요)**:
- **인명**: 관련된 모든 인물의 실명과 직책을 정확히 명시
- **지명**: 구체적인 지역명, 국가명, 도시명 등을 명확히 표기
- **날짜**: 구체적인 날짜, 기간, 시점을 정확히 기재
- **기관명**: 관련 기관, 회사, 조직의 정확한 명칭 포함
- **수치 정보**: 금액, 비율, 규모 등 구체적 수치 반드시 포함

**③ 기사 원칙 준수**:
- 5W1H 원칙에 따른 정확한 팩트 전달
- 객관적 사실만 포함, 추측이나 개인 의견 배제
- 기사 원문에 명시된 내용만 사용
- 정확한 인용과 출처 기반 정보 제공

**④ 답변 작성 규칙**:
- **글자 수**: 모든 답변 70~80자 내외 (공백 포함)
- **톤앤매너**: 구어체 사용 ("했어요", "해요", "한다고 해요", "라고 해요", "이에요", "예요")
- **친근한 표현**: MZ세대가 친근감을 느낄 수 있는 자연스러운 구어체
- **정보 밀도**: 제한된 글자 수 내에서 최대한 많은 핵심 정보 포함
- **가독성**: 문단 구분 없이 한 문단으로 구성, 읽기 쉬운 문장 구조

**⑤ 구어체 표현 가이드**:
- "했습니다" → "했어요"
- "입니다" → "이에요/예요"
- "됩니다" → "돼요"
- "합니다" → "해요"
- "라고 합니다" → "라고 해요"
- "다고 합니다" → "다고 해요"
- "라고 밝혔습니다" → "라고 밝혔어요"
- "예정입니다" → "예정이에요"
- "분석됩니다" → "분석돼요"

**⑥ 질문 작성 규칙**:
- 질문 길이: 50자 이내
- 독자가 궁금해할 만한 실용적 질문
- 기사의 핵심 내용을 다루는 질문
- 명확하고 구체적인 질문

**⑦ FAQ 문항 간격**:
- 질문과 답변 사이에 빈 줄 1줄 반드시 삽입
- 각 FAQ 문항(답변과 다음 질문) 사이에도 빈 줄 1줄 삽입
- 각 기사 섹션 사이에는 빈 줄 1줄 삽입

**금지 사항**:
- 문어체 표현 사용 금지 ("했습니다", "입니다", "됩니다" 등)
- 기사에 없는 내용이나 추측성 내용 추가 금지
- FAQ 내 이모지 사용 금지
- 개인적 견해나 의견 포함 금지
- 70~80자 글자 수 제한 위반 금지

반드시 다음 JSON 형식으로 응답해주세요:
{
    "summary": "기사 핵심요약 내용",
    "points": [
        {
            "question": "Q1. 질문 내용",
            "answer": "A1. 답변 내용",
            "citations": [1, 2]
        },
        {
            "question": "Q2. 질문 내용",
            "answer": "A2. 답변 내용",
            "citations": [1, 3]
        }
    ]
}"""

async def generate_ai_summary_with_openai(articles_text: str, articles_count: int) -> Dict:
    """OpenAI로 AI 요약 생성"""
    openai_client = get_openai_client()
    
    system_prompt = get_ai_summary_system_prompt()
    user_prompt = f"다음 {articles_count}개의 뉴스 기사를 분석하여 MZ세대를 위한 FAQ 형식으로 요약해주세요.\n\n{articles_text}\n\n위 형식과 지침에 맞게 JSON 형태로 응답해주세요."
    
    # 새 버전 API 방식
    response = openai_client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=AI_MAX_TOKENS,
        temperature=AI_TEMPERATURE
    )
    
    return response.choices[0].message.content

def parse_ai_response(ai_summary: str) -> Dict:
    """AI 응답 파싱"""
    try:
        # JSON 문자열 추출
        json_str = ai_summary
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
        
        # JSON 파싱
        try:
            summary_data = json.loads(json_str)
        except json.JSONDecodeError:
            # JSON 파싱 실패 시 정규식으로 FAQ 형식 파싱
            summary_data = parse_faq_format(ai_summary)
        
        # 응답 구조 검증 및 정규화
        return validate_and_normalize_summary(summary_data)
        
    except Exception as e:
        # 파싱 실패 시 기본 응답
        return {
            "title": "AI 요약",
            "summary": ai_summary,
            "points": []
        }

def parse_faq_format(ai_summary: str) -> Dict:
    """FAQ 형식 파싱"""
    # 요약 부분 추출
    summary_match = re.search(r'기사 핵심요약.*?\n\n(.*?)(?=\n\n서울경제 기사 FAQ|\Z)', ai_summary, re.DOTALL)
    summary = summary_match.group(1).strip() if summary_match else "요약 정보를 생성하지 못했습니다."
    
    # FAQ 질문-답변 쌍 추출
    qa_pairs = re.findall(r'Q\d+\.\s*(.*?)\s*\n\s*A\.\s*(.*?)(?=\n\s*Q\d+\.|\Z)', ai_summary, re.DOTALL)
    
    points = []
    for i, (q, a) in enumerate(qa_pairs):
        points.append({
            "question": f"Q{i+1}. {q.strip()}",
            "answer": a.strip(),
            "citations": []
        })
    
    return {
        "summary": summary,
        "points": points
    }

def validate_and_normalize_summary(summary_data: Dict) -> Dict:
    """요약 데이터 검증 및 정규화"""
    if not isinstance(summary_data, dict):
        raise ValueError("응답이 올바른 JSON 형식이 아닙니다.")
    
    # 필수 필드 확인
    if "summary" not in summary_data:
        summary_data["summary"] = "요약 정보를 생성하지 못했습니다."
    
    # points 필드 구조 확인 및 변환
    if "points" in summary_data and isinstance(summary_data["points"], list):
        for i, point in enumerate(summary_data["points"]):
            if not isinstance(point, dict):
                summary_data["points"][i] = {
                    "question": f"Q{i+1}. 질문",
                    "answer": str(point),
                    "citations": []
                }
            elif "question" not in point or "answer" not in point:
                if "question" not in point:
                    point["question"] = f"Q{i+1}. 질문"
                if "answer" not in point:
                    point["answer"] = "답변 정보가 없습니다."
                if "citations" not in point:
                    point["citations"] = []
    else:
        summary_data["points"] = []
    
    return summary_data

@router.post("/ai-summary")
async def generate_ai_summary(
    request: AISummaryRequest,
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """선택된 뉴스 기사들의 AI 요약 생성
    
    통합된 요약을 생성합니다. 핵심 이슈, 주요 인용문, 주요 수치 데이터를 모두 포함합니다.
    """
    logger = setup_logger("api.news.ai_summary")
    logger.info(f"AI 요약 요청: {len(request.news_ids)}개 기사")
    
    try:
        # 기사 데이터 준비
        articles = await prepare_articles_for_summary(request.news_ids, bigkinds_client)
        articles_text = create_articles_text(articles)
        
        # AI 요약 생성
        ai_summary = await generate_ai_summary_with_openai(articles_text, len(articles))
        
        # 응답 파싱
        summary_data = parse_ai_response(ai_summary)
        
        # 추가 메타데이터
        summary_data.update({
            "articles_analyzed": len(articles),
            "generated_at": datetime.now().isoformat(),
            "model_used": AI_MODEL
        })
        
        return summary_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 요약 생성 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 요약 생성 중 오류 발생: {str(e)}")

@router.post("/ai-summary-stream")
async def generate_ai_summary_stream(
    request: AISummaryRequest,
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """선택된 뉴스 기사들의 AI 요약 생성 (스트리밍 버전)
    
    통합된 요약을 스트리밍 방식으로 생성합니다.
    """
    logger = setup_logger("api.news.ai_summary_stream")
    logger.info(f"AI 요약 스트리밍 요청: {len(request.news_ids)}개 기사")
    
    async def generate():
        try:
            # 진행 상황 전송 - 시작
            start_data = {'step': 'start', 'progress': 0, 'type': 'progress'}
            yield f"data: {json.dumps(start_data)}\n\n"
            
            # 선택된 뉴스 기사들 가져오기
            if request.news_ids and any("cluster" in news_id.lower() for news_id in request.news_ids):
                search_result = bigkinds_client.get_news_by_cluster_ids(request.news_ids)
            else:
                search_result = bigkinds_client.get_news_by_ids(request.news_ids)
            
            formatted_result = bigkinds_client.format_news_response(search_result)
            articles = formatted_result.get("documents", [])
            
            if not articles:
                error_data = {'error': '선택된 뉴스를 찾을 수 없습니다'}
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                return
            
            # 2단계: 기사 분석 시작
            step2_data = {
                'step': f'✅ {len(articles)}개 기사를 수집했습니다. 내용을 분석하고 있습니다...', 
                'progress': 25, 
                'type': 'thinking'
            }
            yield f"data: {json.dumps(step2_data, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.8)
            
            # 기사 내용 준비
            articles_text = ""
            article_refs = []
            for i, article in enumerate(articles, 1):
                title = article.get("title", "")
                content = article.get("content", "") or article.get("summary", "")
                provider = article.get("provider", "")
                published_at = article.get("published_at", "")
                byline = article.get("byline", "")
                
                ref_id = f"ref{i}"
                article_refs.append({
                    "ref_id": ref_id,
                    "title": title,
                    "provider": provider,
                    "published_at": published_at,
                    "url": article.get("url", "")
                })
                
                articles_text += f"[기사 {ref_id}]\n"
                articles_text += f"제목: {title}\n"
                articles_text += f"언론사: {provider}\n"
                if byline:
                    articles_text += f"기자: {byline}\n"
                articles_text += f"발행일: {published_at}\n"
                articles_text += f"내용: {content}\n\n"
            
            # 3단계: 핵심 이슈 파악
            step3_data = {
                'step': '🔍 핵심 이슈와 주요 키워드를 파악하고 있습니다...', 
                'progress': 40, 
                'type': 'thinking'
            }
            yield f"data: {json.dumps(step3_data, ensure_ascii=False)}\n\n"
            await asyncio.sleep(1.0)
            
            # 4단계: 인용문 추출
            step4_data = {
                'step': '💬 중요한 인용문과 발언을 찾고 있습니다...', 
                'progress': 55, 
                'type': 'thinking'
            }
            yield f"data: {json.dumps(step4_data, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.7)
            
            # 5단계: 수치 데이터 분석
            step5_data = {
                'step': '📊 주요 수치와 통계 데이터를 분석하고 있습니다...', 
                'progress': 70, 
                'type': 'thinking'
            }
            yield f"data: {json.dumps(step5_data, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.8)
            
            # 6단계: AI 요약 생성 시작
            step6_data = {
                'step': '🤖 AI가 종합적인 요약을 생성하고 있습니다...', 
                'progress': 85, 
                'type': 'thinking'
            }
            yield f"data: {json.dumps(step6_data, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.5)
            
            # 통합된 요약 프롬프트 설정
            system_prompt = """당신은 뉴스 분석 전문가입니다. 주어진 뉴스 기사들을 분석하여 종합적인 요약을 제공해주세요.

요약에는 다음 세 가지 측면을 모두 포함해야 합니다:
1. 핵심 이슈: 주요 이슈와 동향을 파악하고 그 중요도와 영향을 분석
2. 주요 인용문: 중요한 인물의 발언과 그 맥락 및 의미 분석
3. 주요 수치 데이터: 핵심 통계와 수치 데이터 및 그 의미 분석

각 기사를 인용할 때는 반드시 [기사 ref번호] 형태로 출처를 표시해주세요.

JSON 형태로 응답해주세요:
{
  "title": "종합 뉴스 요약",
  "summary": "전체 요약 내용 (인용 시 [기사 ref번호] 포함)",
  "key_points": ["핵심 포인트1", "핵심 포인트2", ...],
  "key_quotes": [{"source": "발언자1", "quote": "인용문1", "ref": "ref1"}, ...],
  "key_data": [{"metric": "지표명1", "value": "수치1", "context": "맥락1", "ref": "ref1"}, ...]
}"""

            user_prompt = f"다음 {len(articles)}개의 뉴스 기사를 분석하여 종합적으로 요약해주세요. 각 기사의 중요한 내용을 인용할 때는 [기사 ref번호] 형태로 출처를 표시해주세요.\n\n{articles_text}\n\n요구사항:\n1. 핵심 이슈 3-5개를 명확히 파악\n2. 중요한 인용문과 발언자 식별\n3. 핵심 수치와 통계 데이터 추출\n4. JSON 형태로 응답"
            
            # OpenAI GPT-4 Turbo로 요약 생성
            try:
                # 새 버전 OpenAI 클라이언트 사용
                openai_client = get_openai_client()
                response = openai_client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.3,
                    stream=True  # 스트리밍 활성화
                )

                # 7단계: 실시간 요약 생성
                step7_data = {
                    'step': '✍️ 요약을 실시간으로 생성하고 있습니다...', 
                    'progress': 90, 
                    'type': 'generating'
                }
                yield f"data: {json.dumps(step7_data, ensure_ascii=False)}\n\n"
                
                collected_content = ""
                for chunk in response:
                    # 새 버전 OpenAI API의 스트리밍 응답 구조에 맞게 수정
                    if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                        content_chunk = chunk.choices[0].delta.content
                        collected_content += content_chunk
                        # 실시간으로 생성되는 내용 전송
                        chunk_data = {'chunk': content_chunk, 'type': 'content'}
                        yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"
                
                # JSON 파싱
                try:
                    json_str = collected_content
                    if "```json" in json_str:
                        json_str = json_str.split("```json")[1].split("```")[0].strip()
                    elif "```" in json_str:
                        json_str = json_str.split("```")[1].split("```")[0].strip()
                    
                    summary_data = json.loads(json_str)
                    
                    # 필수 필드 확인
                    if "summary" not in summary_data:
                        summary_data["summary"] = collected_content
                    if "key_points" not in summary_data:
                        summary_data["key_points"] = []
                    if "key_quotes" not in summary_data:
                        summary_data["key_quotes"] = []
                    if "key_data" not in summary_data:
                        summary_data["key_data"] = []
                    
                    # 최종 결과 구성
                    summary_result = {
                        "title": summary_data.get("title", "종합 뉴스 요약"),
                        "summary": summary_data["summary"],
                        "key_points": summary_data["key_points"],
                        "key_quotes": summary_data["key_quotes"],
                        "key_data": summary_data["key_data"],
                        "type": "integrated",
                        "articles_analyzed": len(articles),
                        "generated_at": datetime.now().isoformat(),
                        "model_used": "gpt-4-turbo-preview",
                        "article_references": article_refs
                    }
                    
                except json.JSONDecodeError:
                    # JSON 파싱 실패 시 텍스트 그대로 반환
                    summary_result = {
                        "title": "종합 뉴스 요약",
                        "summary": collected_content,
                        "type": "integrated",
                        "articles_analyzed": len(articles),
                        "generated_at": datetime.now().isoformat(),
                        "model_used": "gpt-4-turbo-preview",
                        "article_references": article_refs
                    }
                
                # 완료
                complete_data = {
                    'step': '✅ 요약 생성이 완료되었습니다!', 
                    'progress': 100, 
                    'result': summary_result, 
                    'type': 'complete'
                }
                yield f"data: {json.dumps(complete_data, ensure_ascii=False)}\n\n"
                
            except Exception as e:
                logger.error(f"OpenAI API 오류: {e}", exc_info=True)
                error_data = {'error': f'AI 요약 생성 중 오류 발생: {str(e)}'}
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                
        except Exception as e:
            logger.error(f"AI 요약 스트리밍 오류: {e}", exc_info=True)
            error_data = {'error': f'요약 생성 중 오류 발생: {str(e)}'}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/plain")

@router.get("/watchlist/suggestions")
async def get_watchlist_suggestions():
    """관심 종목 추천 목록
    
    인기 있는 기업들의 목록을 반환합니다.
    """
    # 하드코딩된 추천 목록 (실제로는 DB나 분석 결과 기반)
    suggestions = [
        {"name": "삼성전자", "code": "005930", "category": "반도체"},
        {"name": "SK하이닉스", "code": "000660", "category": "반도체"},
        {"name": "LG에너지솔루션", "code": "373220", "category": "배터리"},
        {"name": "현대자동차", "code": "005380", "category": "자동차"},
        {"name": "네이버", "code": "035420", "category": "인터넷"},
        {"name": "카카오", "code": "035720", "category": "인터넷"},
        {"name": "셀트리온", "code": "068270", "category": "바이오"},
        {"name": "삼성바이오로직스", "code": "207940", "category": "바이오"}
    ]
    
    return {"suggestions": suggestions}

@router.get("/search")
async def search_news(
    keyword: str = Query(..., description="검색 키워드"),
    date_from: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    limit: int = Query(30, description="결과 수", ge=1, le=100),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """뉴스 검색 API (GET 방식)
    
    키워드로 뉴스를 검색하고 타임라인 형식으로 반환합니다.
    """
    logger = setup_logger("api.news.search")
    logger.info(f"뉴스 검색 요청: {keyword}")
    
    try:
        # 날짜 기본값 설정 (최근 30일)
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        # BigKinds API로 키워드 뉴스 타임라인 조회
        result = bigkinds_client.get_keyword_news_timeline(
            keyword=keyword,
            date_from=date_from,
            date_to=date_to,
            return_size=limit
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=404, detail="키워드 관련 뉴스를 찾을 수 없습니다")
        
        return {
            "keyword": keyword,
            "period": {
                "from": date_from,
                "to": date_to
            },
            "total_count": result.get("total_count", 0),
            "timeline": result.get("timeline", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 검색 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"뉴스 검색 중 오류 발생: {str(e)}")

@router.get("/company/{company_name}/summary")
async def get_company_news_summary(
    company_name: str = Path(..., description="기업명"),
    days: int = Query(7, description="최근 며칠간의 뉴스", ge=1, le=30),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """관심 종목의 최근 뉴스 자동 요약
    
    기업의 최근 뉴스 5개를 자동으로 가져와서 GPT-4 Turbo로 요약합니다.
    """
    logger = setup_logger("api.news.company_summary")
    logger.info(f"기업 뉴스 자동 요약 요청: {company_name}")
    
    try:
        # OpenAI API 키 확인
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(status_code=500, detail="AI 요약 서비스를 사용할 수 없습니다")
        
        # 기업의 최근 뉴스 가져오기
        news_data = bigkinds_client.get_company_news_for_summary(
            company_name=company_name,
            days=days,
            limit=1  # 개수만 확인하므로 1개만
        )
        
        if not news_data.get("success") or not news_data.get("articles"):
            raise HTTPException(status_code=404, detail=f"{company_name}의 최근 뉴스를 찾을 수 없습니다")
        
        articles = news_data.get("articles", [])
        
        # 기사 내용 준비
        articles_text = ""
        for i, article in enumerate(articles, 1):
            title = article.get("title", "")
            content = article.get("content", "") or article.get("summary", "")
            provider = article.get("provider", "")
            published_at = article.get("published_at", "")
            
            articles_text += f"[기사 {i}]\n"
            articles_text += f"제목: {title}\n"
            articles_text += f"언론사: {provider}\n"
            articles_text += f"발행일: {published_at}\n"
            articles_text += f"내용: {content}\n\n"
        
        # OpenAI GPT-4 Turbo로 뉴스 요약 생성 (새 버전 방식)
        try:
            openai_client = get_openai_client()
            response = openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "당신은 경제 뉴스 전문 분석가입니다. 주어진 뉴스들을 종합하여 간결하고 통찰력 있는 요약을 제공해주세요."},
                    {"role": "user", "content": f"다음은 '{company_name}' 관련 최근 {days}일간의 뉴스입니다. 이를 바탕으로 해당 기업의 현재 상황과 주요 이슈를 300자 내외로 요약해주세요:\n\n{articles_text}"}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            ai_summary = response.choices[0].message.content
        except Exception as e:
            logger.error(f"AI 요약 생성 오류: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"AI 요약 생성 중 오류 발생: {str(e)}")
        
        # 메타데이터 추가
        summary_result = {
            "company": company_name,
            "summary": ai_summary,
            "key_points": [],
            "sentiment": "neutral",
            "investment_implications": "추가 분석이 필요합니다.",
            "articles_analyzed": len(articles),
            "period": news_data.get("period"),
            "generated_at": datetime.now().isoformat(),
            "model_used": "gpt-4-turbo-preview",
            "source_articles": [
                {
                    "id": article.get("id"),
                    "title": article.get("title"),
                    "published_at": article.get("published_at"),
                    "provider": article.get("provider")
                }
                for article in articles
            ]
        }
        
        return summary_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기업 뉴스 자동 요약 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"뉴스 요약 중 오류 발생: {str(e)}")

@router.get("/company/{company_name}/report/{report_type}")
async def get_company_report(
    company_name: str = Path(..., description="기업명"),
    report_type: str = Path(..., description="레포트 타입 (daily, weekly, monthly, quarterly, yearly)"),
    reference_date: Optional[str] = Query(None, description="기준 날짜 (YYYY-MM-DD), 없으면 오늘 날짜 사용"),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """기업 기간별 뉴스 레포트 생성
    
    기업명과 레포트 타입에 따라 기간별 뉴스 레포트를 생성합니다.
    """
    logger = setup_logger("api.news.company_report")
    logger.info(f"기업 레포트 요청: {company_name}, 타입: {report_type}, 기준일: {reference_date}")
    
    valid_report_types = ["daily", "weekly", "monthly", "quarterly", "yearly"]
    if report_type not in valid_report_types:
        logger.warning(f"잘못된 레포트 타입 요청: {report_type}")
        raise HTTPException(status_code=400, detail=f"지원하지 않는 레포트 타입입니다. 유효한 타입: {', '.join(valid_report_types)}")
    
    try:
        # OpenAI API 키 확인
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")
            return {
                "success": False,
                "error": "AI 요약 서비스에 필요한 API 키가 설정되지 않았습니다",
                "company": company_name,
                "report_type": report_type,
                "report_type_kr": get_report_type_kr(report_type),
                "message": "관리자에게 문의하세요."
            }
        
        # BigKinds API 키 확인
        if not os.getenv("BIGKINDS_KEY"):
            logger.error("BIGKINDS_KEY 환경 변수가 설정되지 않았습니다")
            return {
                "success": False,
                "error": "뉴스 검색 서비스에 필요한 API 키가 설정되지 않았습니다",
                "company": company_name,
                "report_type": report_type,
                "report_type_kr": get_report_type_kr(report_type),
                "message": "관리자에게 문의하세요."
            }
        
        # API 키 로깅 (마스킹 처리)
        openai_key_status = "설정됨" if os.getenv("OPENAI_API_KEY") else "설정되지 않음"
        bigkinds_key_status = "설정됨" if os.getenv("BIGKINDS_KEY") else "설정되지 않음"
        logger.info(f"API 키 상태 - OpenAI: {openai_key_status}, BigKinds: {bigkinds_key_status}")
        
        # BigKinds API로 기업 뉴스 레포트 데이터 조회
        logger.info(f"기업 뉴스 레포트 데이터 조회 시작: {company_name}")
        report_data = bigkinds_client.get_company_news_report(
            company_name=company_name,
            report_type=report_type,
            reference_date=reference_date
        )
        
        if not report_data.get("success", False):
            logger.warning(f"기업 뉴스 레포트 데이터 조회 실패: {report_data.get('error', '알 수 없는 오류')}")
            raise HTTPException(status_code=404, detail=f"기업 뉴스 레포트를 생성할 수 없습니다")
        
        articles = report_data.get("articles", [])
        logger.info(f"조회된 기사 수: {len(articles)}")
        
        if not articles:
            logger.warning(f"조회된 기사가 없습니다: {company_name}, {report_type}")
            return {
                **report_data,
                "summary": f"{company_name}에 대한 {report_data.get('report_type_kr')} 레포트 기간 내 뉴스가 없습니다."
            }
        
        # 각 기사에 고유 ID 부여 (인용 참조용)
        for i, article in enumerate(articles):
            if not article.get("ref_id"):
                article["ref_id"] = f"ref{i+1}"
        
        # 기사 내용 준비 (전체 content 사용)
        articles_text = ""
        for i, article in enumerate(articles, 1):
            ref_id = article.get("ref_id", f"ref{i}")
            title = article.get("title", "")
            content = article.get("content", "") or article.get("summary", "")
            provider = article.get("provider", "")
            published_at = article.get("published_at", "")
            
            articles_text += f"[기사 {ref_id}]\n"
            articles_text += f"제목: {title}\n"
            articles_text += f"언론사: {provider}\n"
            articles_text += f"발행일: {published_at}\n"
            articles_text += f"내용: {content}\n\n"
        
        # 토큰 한계를 초과하는 경우 청킹 및 요약 처리
        max_tokens = 4000  # 청크당 최대 토큰 수 (대략적인 추정)
        chunks = []
        current_chunk = ""
        current_tokens = 0
        
        for i, article in enumerate(articles, 1):
            ref_id = article.get("ref_id", f"ref{i}")
            article_text = f"[기사 {ref_id}]\n"
            article_text += f"제목: {article.get('title', '')}\n"
            article_text += f"내용: {article.get('content', '') or article.get('summary', '')}\n\n"
            
            # 대략적으로 토큰 수 추정 (영어 기준 4자당 1토큰, 한글은 더 적을 수 있음)
            article_tokens = len(article_text) // 2
            
            if current_tokens + article_tokens > max_tokens:
                chunks.append(current_chunk)
                current_chunk = article_text
                current_tokens = article_tokens
            else:
                current_chunk += article_text
                current_tokens += article_tokens
        
        if current_chunk:
            chunks.append(current_chunk)
        
        logger.info(f"청크 생성 완료: {len(chunks)}개 청크")
        
        # 기간에 따른 요약 프롬프트 설정
        period_from = report_data["period"]["from"]
        period_to = report_data["period"]["to"]
        
        prompts = {
            "daily": f"{period_to}일 하루 동안의 {company_name} 관련 주요 뉴스를 요약해주세요.",
            "weekly": f"{period_from}부터 {period_to}까지 일주일 간의 {company_name} 관련 주요 뉴스와 동향을 요약해주세요.",
            "monthly": f"{period_from}부터 {period_to}까지 한 달 간의 {company_name}의 주요 이슈, 동향 및 변화를 분석하여 요약해주세요.",
            "quarterly": f"{period_from}부터 {period_to}까지 3개월 간의 {company_name}의 분기별 성과, 주요 이슈 및 변화를 분석하여 요약해주세요.",
            "yearly": f"{period_from}부터 {period_to}까지 1년 간의 {company_name}의 주요 이슈, 성과, 시장 변화 및 전략적 방향을 종합적으로 분석하여 요약해주세요."
        }
        
        # 개선된 시스템 프롬프트 - 인용 정보 포함 요청
        system_prompt = """당신은 금융 및 경제 분야의 전문 애널리스트입니다. 주어진 뉴스 기사들을 분석하여 객관적이고 통찰력 있는 요약을 제공해주세요.

요약 시 다음 사항을 지켜주세요:
1. 중요한 사실이나 주장을 인용할 때 반드시 출처를 표시하세요. 예: [기사 ref1]
2. 직접 인용구는 큰따옴표로 표시하고 출처를 명시하세요. 예: "삼성전자는 신규 투자를 발표했다"[기사 ref2]
3. 요약은 주요 이슈, 동향, 영향으로 구분하여 작성하세요.
4. 요약 말미에 모든 참고 기사 목록을 포함하세요.

이 형식을 반드시 지켜 작성해주세요."""

        user_prompt = prompts.get(report_type, prompts["daily"]) + "\n\n각 기사의 중요한 내용을 인용할 때는 [기사 ref번호] 형태로 출처를 표시해주세요."
        
        logger.info("요약 생성 시작")
        
        # 청크가 여러 개인 경우 각각 요약 후 메타 요약
        final_summary = ""
        if len(chunks) > 1:
            chunk_summaries = []
            
            for i, chunk in enumerate(chunks, 1):
                try:
                    logger.info(f"청크 {i}/{len(chunks)} 요약 생성 중...")
                    openai_client = get_openai_client()
                    chunk_response = openai_client.chat.completions.create(
                        model="gpt-4-turbo-preview",
                        messages=[
                            {"role": "system", "content": "주어진 뉴스 기사들의 핵심 내용을 간결하게 요약해주세요. 중요한 내용을 인용할 때는 [기사 ref번호] 형태로 출처를 표시해주세요."},
                            {"role": "user", "content": f"다음은 {company_name} 관련 뉴스 기사입니다. 핵심 내용만 간결하게 요약해주세요. 중요한 내용을 인용할 때는 [기사 ref번호] 형태로 출처를 표시해주세요:\n\n{chunk}"}
                        ],
                        max_tokens=800,
                        temperature=0.3
                    )
                    
                    chunk_summary = chunk_response.choices[0].message.content
                    chunk_summaries.append(f"파트 {i} 요약: {chunk_summary}")
                    logger.info(f"청크 {i} 요약 완료 (길이: {len(chunk_summary)}자)")
                except Exception as e:
                    logger.error(f"청크 {i} 요약 생성 오류: {e}", exc_info=True)
                    chunk_summaries.append(f"파트 {i} 요약: 요약 생성 실패")
            
            # 메타 요약 생성
            meta_summaries_text = "\n\n".join(chunk_summaries)
            try:
                logger.info("메타 요약 생성 중...")
                openai_client = get_openai_client()
                meta_response = openai_client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"{user_prompt}\n\n다음은 여러 부분으로 나눠진 요약입니다. 이를 통합하여 최종 요약을 작성해주세요. 각 부분에 있는 인용 정보([기사 ref번호])는 그대로 유지해주세요:\n\n{meta_summaries_text}"}
                    ],
                    max_tokens=1500,
                    temperature=0.3
                )
                
                final_summary = meta_response.choices[0].message.content
                logger.info(f"메타 요약 완료 (길이: {len(final_summary)}자)")
            except Exception as e:
                logger.error(f"메타 요약 생성 오류: {e}", exc_info=True)
                final_summary = "요약 생성 중 오류가 발생했습니다."
        else:
            # 단일 청크일 경우 바로 요약
            try:
                logger.info("단일 청크 요약 생성 중...")
                openai_client = get_openai_client()
                response = openai_client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"{user_prompt}\n\n다음은 {company_name} 관련 뉴스 기사입니다. 각 기사의 중요한 내용을 인용할 때는 [기사 ref번호] 형태로 출처를 표시해주세요:\n\n{articles_text}"}
                    ],
                    max_tokens=1500,
                    temperature=0.3
                )
                
                final_summary = response.choices[0].message.content
                logger.info(f"요약 완료 (길이: {len(final_summary)}자)")
            except Exception as e:
                logger.error(f"요약 생성 오류: {e}", exc_info=True)
                final_summary = "요약 생성 중 오류가 발생했습니다."
        
        # 모든 기사 정보 포함 (content 필드를 제외하고 기본 정보만 포함)
        detailed_articles = []
        for article in articles:
            detailed_articles.append({
                "id": article.get("id", ""),
                "ref_id": article.get("ref_id", ""),
                "title": article.get("title", ""),
                "summary": article.get("summary", ""),
                "provider": article.get("provider", ""),
                "published_at": article.get("published_at", ""),
                "url": article.get("url", ""),
                "category": article.get("category", ""),
                "byline": article.get("byline", "")
            })
        
        # 최종 결과 반환
        logger.info(f"레포트 생성 완료: {company_name}, {report_type}")
        return {
            **report_data,
            "summary": final_summary,
            "detailed_articles": detailed_articles,  # 모든 기사의 상세 정보 포함
            "generated_at": datetime.now().isoformat(),
            "model_used": "gpt-4-turbo-preview"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기업 레포트 생성 오류: {e}", exc_info=True)
        # 상세 오류 정보를 포함한 응답
        return {
            "success": False,
            "error": f"기업 레포트 생성 중 오류 발생: {str(e)}",
            "company": company_name,
            "report_type": report_type,
            "report_type_kr": get_report_type_kr(report_type),
            "generated_at": datetime.now().isoformat()
        }

@router.get("/watchlist")
async def get_watchlist_data(
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """관심 종목 전체 데이터 (종목 목록 + 각 종목별 최신 뉴스 수)
    
    프론트엔드에서 관심 종목 섹션을 구성할 때 필요한 모든 데이터를 제공합니다.
    """
    logger = setup_logger("api.news.watchlist")
    logger.info("관심 종목 데이터 요청")
    
    try:
        # 추천 종목 목록 (하드코딩된 주요 기업들)
        watchlist_companies = [
            {"name": "삼성전자", "code": "005930", "category": "반도체"},
            {"name": "SK하이닉스", "code": "000660", "category": "반도체"},
            {"name": "LG에너지솔루션", "code": "373220", "category": "배터리"},
            {"name": "현대자동차", "code": "005380", "category": "자동차"},
            {"name": "네이버", "code": "035420", "category": "인터넷"},
            {"name": "카카오", "code": "035720", "category": "인터넷"},
            {"name": "셀트리온", "code": "068270", "category": "바이오"},
            {"name": "삼성바이오로직스", "code": "207940", "category": "바이오"}
        ]
        
        # 각 기업별 최근 뉴스 수 확인 (간단한 검색으로)
        enhanced_watchlist = []
        for company in watchlist_companies:
            try:
                # 최근 7일간 뉴스 수 확인
                news_data = bigkinds_client.get_company_news_for_summary(
                    company_name=company["name"],
                    days=7,
                    limit=1  # 개수만 확인하므로 1개만
                )
                
                company_data = {
                    **company,
                    "recent_news_count": news_data.get("total_found", 0),
                    "has_recent_news": news_data.get("total_found", 0) > 0,
                    "last_updated": datetime.now().isoformat()
                }
                enhanced_watchlist.append(company_data)
                
            except Exception as e:
                logger.warning(f"기업 {company['name']} 뉴스 수 조회 실패: {e}")
                # 오류 시 기본값 설정
                company_data = {
                    **company,
                    "recent_news_count": 0,
                    "has_recent_news": False,
                    "last_updated": datetime.now().isoformat()
                }
                enhanced_watchlist.append(company_data)
        
        return {
            "success": True,
            "watchlist": enhanced_watchlist,
            "total_companies": len(enhanced_watchlist),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"관심 종목 데이터 조회 오류: {e}", exc_info=True)
        # 오류 시 기본 데이터 반환
        return {
            "success": False,
            "watchlist": [
                {"name": "삼성전자", "code": "005930", "category": "반도체", "recent_news_count": 0, "has_recent_news": False},
                {"name": "SK하이닉스", "code": "000660", "category": "반도체", "recent_news_count": 0, "has_recent_news": False},
                {"name": "현대자동차", "code": "005380", "category": "자동차", "recent_news_count": 0, "has_recent_news": False}
            ],
            "total_companies": 3,
            "generated_at": datetime.now().isoformat(),
            "error": str(e)
        }

@router.get("/related-questions/{keyword}")
async def get_related_questions(
    keyword: str = Path(..., description="검색 키워드"),
    days: Optional[int] = Query(None, description="검색 기간(일)", ge=1, le=365),
    date_from: Optional[str] = Query(None, description="시작일(YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료일(YYYY-MM-DD)"),
    max_questions: int = Query(7, description="최대 질문 수", ge=1, le=20),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """키워드 기반 연관 질문 생성
    
    키워드를 바탕으로 연관 검색어와 TopN 키워드를 분석하여 연관 질문을 생성합니다.
    """
    from backend.api.utils.keywords_utils import (
        filter_keywords, score_keywords, create_boolean_queries, 
        keywords_to_questions, get_topic_sensitive_date_range
    )
    
    logger = setup_logger("api.news.related_questions")
    logger.info(f"연관 질문 요청: {keyword}")
    
    try:
        # 주제 기반 기간 설정
        topic_date_range = get_topic_sensitive_date_range(keyword)
        
        # 사용자 지정 기간 처리
        if date_from and date_to:
            period = {"date_from": date_from, "date_to": date_to}
        elif days:
            # 일수로 기간 지정
            date_to = datetime.now().strftime("%Y-%m-%d")
            date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            period = {"date_from": date_from, "date_to": date_to}
        else:
            # 주제 기반 기간 사용
            period = {
                "date_from": topic_date_range["date_from"],
                "date_to": topic_date_range["date_to"]
            }
        
        # 1단계: 연관어와 TopN 키워드 가져오기
        related_keywords = bigkinds_client.get_related_keywords(
            keyword=keyword, 
            max_count=20,
            date_from=period["date_from"],
            date_to=period["date_to"]
        )
        
        topn_keywords = bigkinds_client.get_keyword_topn(
            keyword=keyword,
            date_from=period["date_from"],
            date_to=period["date_to"]
        )
        
        # 2단계: 키워드 필터링 및 점수화
        filtered_related = filter_keywords(related_keywords)
        filtered_topn = filter_keywords(topn_keywords)
        
        # 키워드가 너무 적으면 기간 확장 시도
        if len(filtered_related) < 5 or len(filtered_topn) < 5:
            # 기간 확장 (60일)
            extended_date_from = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
            
            # 확장된 기간으로 다시 시도
            extended_related = bigkinds_client.get_related_keywords(
                keyword=keyword, 
                max_count=30,
                date_from=extended_date_from,
                date_to=period["date_to"]
            )
            
            extended_topn = bigkinds_client.get_keyword_topn(
                keyword=keyword,
                date_from=extended_date_from,
                date_to=period["date_to"],
                limit=30
            )
            
            # 확장된 결과로 업데이트 (기존 결과가 충분하면 유지)
            if len(filtered_related) < 5 and len(extended_related) > len(filtered_related):
                filtered_related = filter_keywords(extended_related)
                
            if len(filtered_topn) < 5 and len(extended_topn) > len(filtered_topn):
                filtered_topn = filter_keywords(extended_topn)
                
            # 기간 정보 업데이트
            period["date_from"] = extended_date_from
        
        # 키워드 점수 계산
        keyword_scores = score_keywords(keyword, filtered_related, filtered_topn)
        
        # 3단계: 점수 기반 상위 키워드 선택
        sorted_keywords = sorted(keyword_scores.keys(), key=lambda k: keyword_scores[k], reverse=True)
        top_keywords = sorted_keywords[:15]  # 상위 15개만 사용
        
        # 4단계: 쿼리 변형 생성
        query_variations = create_boolean_queries(keyword, top_keywords, max_variations=10)
        
        # 5단계: 질문 생성
        questions = keywords_to_questions(keyword, query_variations)
        
        # 최대 질문 수로 제한
        limited_questions = questions[:max_questions]
        
        return {
            "success": True,
            "keyword": keyword,
            "period": {
                "from": period["date_from"],
                "to": period["date_to"]
            },
            "detected_topic": topic_date_range.get("detected_topic"),
            "questions": limited_questions,
            "total_questions": len(limited_questions),
            "keywords": {
                "related": filtered_related[:10],
                "topn": filtered_topn[:10],
                "top_scored": top_keywords[:10]
            },
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"연관 질문 생성 오류: {e}", exc_info=True)
        return {
            "success": False,
            "keyword": keyword,
            "error": str(e),
            "questions": [],
            "generated_at": datetime.now().isoformat()
        }

@router.post("/search/news")
async def search_news_content(
    keyword: str = Query(..., description="검색 키워드"),
    date_from: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    limit: int = Query(30, description="결과 수", ge=1, le=100),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """뉴스 전체 내용 검색 API
    
    키워드로 뉴스를 검색하고 전체 내용(content)를 포함하여 반환합니다.
    """
    logger = setup_logger("api.news.search_content")
    logger.info(f"뉴스 내용 검색 요청: {keyword}")
    
    try:
        # 날짜 기본값 설정 (최근 30일)
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            # until은 오늘 날짜 +1일로 설정 (오늘 데이터 포함 위해)
            date_to = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # 필수 필드 설정 (content 포함)
        fields = [
            "news_id",
            "title",
            "content",  # 전체 내용 포함
            "published_at",
            "provider_name",
            "provider_code",
            "provider_link_page",
            "byline",
            "category",
            "images"
        ]
        
        # BigKinds API로 직접 뉴스 검색 (타임라인 아닌 원본 데이터)
        result = bigkinds_client.search_news(
            query=keyword,
            date_from=date_from,
            date_to=date_to,
            return_size=limit,
            fields=fields
        )
        
        # 응답 포맷팅
        formatted_result = bigkinds_client.format_news_response(result)
        
        if not formatted_result.get("success", False):
            raise HTTPException(status_code=404, detail="키워드 관련 뉴스를 찾을 수 없습니다")
        
        return {
            "keyword": keyword,
            "period": {
                "from": date_from,
                "to": date_to
            },
            "total_count": formatted_result.get("total_hits", 0),
            "articles": formatted_result.get("documents", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 내용 검색 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"뉴스 내용 검색 중 오류 발생: {str(e)}")

@router.get("/search/news")
async def search_news_content_get(
    keyword: str = Query(..., description="검색 키워드"),
    date_from: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    limit: int = Query(30, description="결과 수", ge=1, le=100),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """뉴스 전체 내용 검색 API (GET 방식)
    
    키워드로 뉴스를 검색하고 전체 내용(content)를 포함하여 반환합니다.
    """
    logger = setup_logger("api.news.search_content_get")
    logger.info(f"뉴스 내용 검색 요청(GET): {keyword}")
    
    try:
        # 날짜 기본값 설정 (최근 30일)
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            # until은 오늘 날짜 +1일로 설정 (오늘 데이터 포함 위해)
            date_to = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # 필수 필드 설정 (content 포함)
        fields = [
            "news_id",
            "title",
            "content",  # 전체 내용 포함
            "published_at",
            "provider_name",
            "provider_code",
            "provider_link_page",
            "byline",
            "category",
            "images"
        ]
        
        # BigKinds API로 직접 뉴스 검색 (타임라인 아닌 원본 데이터)
        result = bigkinds_client.search_news(
            query=keyword,
            date_from=date_from,
            date_to=date_to,
            return_size=limit,
            fields=fields
        )
        
        # 응답 포맷팅
        formatted_result = bigkinds_client.format_news_response(result)
        
        if not formatted_result.get("success", False):
            raise HTTPException(status_code=404, detail="키워드 관련 뉴스를 찾을 수 없습니다")
        
        return {
            "keyword": keyword,
            "period": {
                "from": date_from,
                "to": date_to
            },
            "total_count": formatted_result.get("total_hits", 0),
            "articles": formatted_result.get("documents", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 내용 검색 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"뉴스 내용 검색 중 오류 발생: {str(e)}")

@router.get("/search-by-question")
async def search_by_question(
    query: str = Query(..., description="검색 쿼리 (불리언 연산자 지원)"),
    question: Optional[str] = Query(None, description="원래 질문 (표시용)"),
    date_from: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    limit: int = Query(10, description="결과 수", ge=1, le=100),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """질문 기반 뉴스 검색
    
    연관 질문에서 생성된 불리언 쿼리로 뉴스를 검색합니다.
    """
    logger = setup_logger("api.news.search_by_question")
    logger.info(f"질문 검색 요청: '{query}', 질문: '{question}'")
    
    try:
        # 날짜 기본값 설정 (최근 30일)
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        # 필수 필드 설정 (content 포함)
        fields = [
            "news_id",
            "title",
            "content",  # 전체 내용 포함
            "summary",
            "published_at",
            "provider_name",
            "provider_code",
            "provider_link_page",
            "byline",
            "category",
            "images"
        ]
        
        # BigKinds API로 뉴스 검색
        result = bigkinds_client.search_news(
            query=query,
            date_from=date_from,
            date_to=date_to,
            return_size=limit,
            fields=fields
        )
        
        # 응답 포맷팅
        formatted_result = bigkinds_client.format_news_response(result)
        
        if not formatted_result.get("success", False):
            raise HTTPException(status_code=404, detail="검색 결과를 찾을 수 없습니다")
        
        return {
            "success": True,
            "original_query": query,
            "question": question or "질문 정보 없음",
            "period": {
                "from": date_from,
                "to": date_to
            },
            "total_count": formatted_result.get("total_hits", 0),
            "articles": formatted_result.get("documents", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"질문 검색 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"질문 검색 중 오류 발생: {str(e)}")

@router.post("/watchlist", response_model=WatchlistResponse)
async def add_to_watchlist(
    request: WatchlistAddRequest,
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """관심종목에 기업 추가
    
    사용자의 관심종목 목록에 새로운 기업을 추가합니다.
    """
    logger = setup_logger("api.news.watchlist_add")
    logger.info(f"관심종목 추가 요청: {request.name} ({request.code})")
    
    try:
        # TODO: 실제 구현에서는 데이터베이스에 저장
        # 현재는 메모리 기반 임시 구현
        
        # 기업 정보 검증 (BigKinds API로 실제 존재하는 기업인지 확인)
        try:
            # 최근 7일간 뉴스가 있는지 확인하여 유효한 기업인지 검증
            news_data = bigkinds_client.get_company_news_for_summary(
                company_name=request.name,
                days=30,  # 30일로 확장하여 검증
                limit=1
            )
            
            # 뉴스가 전혀 없으면 잘못된 기업명일 가능성
            if news_data.get("total_found", 0) == 0:
                logger.warning(f"기업 '{request.name}'에 대한 뉴스를 찾을 수 없습니다")
                return WatchlistResponse(
                    success=False,
                    message=f"'{request.name}' 기업에 대한 뉴스를 찾을 수 없습니다. 기업명을 확인해주세요."
                )
                
        except Exception as e:
            logger.warning(f"기업 검증 중 오류: {e}")
            # 검증 실패해도 추가는 허용 (API 오류일 수 있음)
        
        # 관심종목 목록 로드 (실제로는 DB에서 사용자별로 관리)
        # 현재는 세션 기반 임시 구현
        watchlist_key = "user_watchlist"  # 실제로는 사용자 ID 기반
        
        # 임시 저장소 (실제로는 Redis나 DB 사용)
        if not hasattr(add_to_watchlist, '_watchlist_storage'):
            add_to_watchlist._watchlist_storage = {}
        
        user_watchlist = add_to_watchlist._watchlist_storage.get(watchlist_key, [])
        
        # 중복 확인
        existing_item = next((item for item in user_watchlist if item["code"] == request.code), None)
        if existing_item:
            return WatchlistResponse(
                success=False,
                message=f"'{request.name}' 기업이 이미 관심종목에 등록되어 있습니다."
            )
        
        # 새 항목 추가
        new_item = {
            "name": request.name,
            "code": request.code,
            "category": request.category,
            "added_at": datetime.now().isoformat(),
            "recent_news_count": 0,
            "has_recent_news": False
        }
        
        user_watchlist.append(new_item)
        add_to_watchlist._watchlist_storage[watchlist_key] = user_watchlist
        
        logger.info(f"관심종목 추가 완료: {request.name} ({request.code})")
        
        return WatchlistResponse(
            success=True,
            message=f"'{request.name}' 기업이 관심종목에 추가되었습니다.",
            watchlist=user_watchlist
        )
        
    except Exception as e:
        logger.error(f"관심종목 추가 오류: {e}", exc_info=True)
        return WatchlistResponse(
            success=False,
            message=f"관심종목 추가 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/watchlist/{stock_code}", response_model=WatchlistResponse)
async def remove_from_watchlist(
    stock_code: str = Path(..., description="삭제할 종목코드"),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """관심종목에서 제거
    
    특정 종목을 관심종목 목록에서 제거합니다.
    """
    logger = setup_logger("api.news.remove_watchlist")
    logger.info(f"관심종목 제거 요청: {stock_code}")
    
    try:
        # 실제로는 데이터베이스에서 제거하는 로직이 필요합니다
        # 현재는 더미 응답을 반환합니다
        
        return WatchlistResponse(
            success=True,
            message=f"종목코드 {stock_code}이(가) 관심종목에서 제거되었습니다.",
            watchlist=[]  # 업데이트된 관심종목 목록을 반환해야 합니다
        )
        
    except Exception as e:
        logger.error(f"관심종목 제거 오류: {e}", exc_info=True)
        return WatchlistResponse(
            success=False,
            message=f"관심종목 제거 중 오류 발생: {str(e)}"
        )

@router.post("/search-by-hours")
async def search_news_by_hours(
    keyword: str = Query(..., description="검색 키워드"),
    hours: int = Query(default=24, description="검색할 시간 범위 (시간)", ge=1, le=168),
    limit: int = Query(default=20, description="결과 수", ge=1, le=100),
    bigkinds_client: BigKindsClient = Depends(get_bigkinds_client)
):
    """시간대별 뉴스 검색
    
    지정된 시간 범위 내의 키워드 관련 뉴스를 검색합니다.
    """
    logger = setup_logger("api.news.search_by_hours")
    logger.info(f"시간대별 뉴스 검색 요청: {keyword}, {hours}시간")
    
    try:
        # 시간 범위 계산
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        date_from = start_time.strftime("%Y-%m-%d")
        date_to = end_time.strftime("%Y-%m-%d")
        
        # BigKinds API로 키워드 뉴스 검색
        result = bigkinds_client.get_keyword_news_timeline(
            keyword=keyword,
            date_from=date_from,
            date_to=date_to,
            return_size=limit
        )
        
        if not result.get("success", False):
            return {
                "success": False,
                "keyword": keyword,
                "hours": hours,
                "total_count": 0,
                "articles": [],
                "message": "검색 결과가 없습니다."
            }
        
        return {
            "success": True,
            "keyword": keyword,
            "hours": hours,
            "period": {
                "from": date_from,
                "to": date_to
            },
            "total_count": result.get("total_count", 0),
            "timeline": result.get("timeline", []),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"시간대별 뉴스 검색 오류: {e}", exc_info=True)
        return {
            "success": False,
            "keyword": keyword,
            "hours": hours,
            "total_count": 0,
            "articles": [],
            "error": f"검색 중 오류 발생: {str(e)}"
        }

@router.get("/categories")
async def get_news_categories():
    """뉴스 카테고리 목록 조회
    
    사용 가능한 뉴스 카테고리 목록을 반환합니다.
    """
    logger = setup_logger("api.news.categories")
    logger.info("뉴스 카테고리 목록 요청")
    
    try:
        # 빅카인즈에서 지원하는 주요 카테고리들
        categories = [
            {
                "id": "politics",
                "name": "정치",
                "description": "정치 관련 뉴스",
                "count": 0
            },
            {
                "id": "economy",
                "name": "경제",
                "description": "경제 관련 뉴스",
                "count": 0
            },
            {
                "id": "society",
                "name": "사회",
                "description": "사회 관련 뉴스",
                "count": 0
            },
            {
                "id": "culture",
                "name": "문화",
                "description": "문화 관련 뉴스",
                "count": 0
            },
            {
                "id": "international",
                "name": "국제",
                "description": "국제 관련 뉴스",
                "count": 0
            },
            {
                "id": "sports",
                "name": "스포츠",
                "description": "스포츠 관련 뉴스",
                "count": 0
            },
            {
                "id": "it_science",
                "name": "IT/과학",
                "description": "IT 및 과학 관련 뉴스",
                "count": 0
            }
        ]
        
        return {
            "success": True,
            "categories": categories,
            "total_categories": len(categories),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"뉴스 카테고리 조회 오류: {e}", exc_info=True)
        return {
            "success": False,
            "categories": [],
            "total_categories": 0,
            "error": f"카테고리 조회 중 오류 발생: {str(e)}"
        }

@router.get("/stats")
async def get_news_stats():
    """뉴스 통계 정보 조회
    
    전체 뉴스 통계 및 트렌드 정보를 반환합니다.
    """
    logger = setup_logger("api.news.stats")
    logger.info("뉴스 통계 정보 요청")
    
    try:
        # 현재 날짜 기준 통계 정보 (더미 데이터)
        today = datetime.now()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        stats = {
            "daily_stats": {
                "today": {
                    "date": today.strftime("%Y-%m-%d"),
                    "total_articles": 0,  # 실제로는 API 호출로 가져와야 함
                    "categories": {
                        "politics": 0,
                        "economy": 0,
                        "society": 0,
                        "culture": 0,
                        "international": 0,
                        "sports": 0,
                        "it_science": 0
                    }
                },
                "yesterday": {
                    "date": yesterday.strftime("%Y-%m-%d"),
                    "total_articles": 0,
                    "categories": {
                        "politics": 0,
                        "economy": 0,
                        "society": 0,
                        "culture": 0,
                        "international": 0,
                        "sports": 0,
                        "it_science": 0
                    }
                }
            },
            "weekly_stats": {
                "period": {
                    "from": week_ago.strftime("%Y-%m-%d"),
                    "to": today.strftime("%Y-%m-%d")
                },
                "total_articles": 0,
                "daily_breakdown": [],
                "top_keywords": [],
                "trending_topics": []
            },
            "system_stats": {
                "total_indexed_articles": 0,
                "last_updated": datetime.now().isoformat(),
                "api_status": "active",
                "data_sources": ["BigKinds"]
            }
        }
        
        return {
            "success": True,
            "stats": stats,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"뉴스 통계 조회 오류: {e}", exc_info=True)
        return {
            "success": False,
            "stats": {},
            "error": f"통계 조회 중 오류 발생: {str(e)}"
        }

# AI 뉴스 컨시어지 임포트 추가
from backend.services.news_concierge import (
    NewsConciergeService, ConciergeRequest, ConciergeResponse, ConciergeProgress
)

# 컨시어지 서비스 의존성
def get_concierge_service() -> NewsConciergeService:
    """AI 뉴스 컨시어지 서비스 의존성"""
    from backend.api.dependencies import get_news_concierge_service
    return get_news_concierge_service()

@router.post("/concierge", response_model=ConciergeResponse)
async def get_concierge_response(
    request: ConciergeRequest,
    concierge_service: NewsConciergeService = Depends(get_concierge_service)
):
    """AI 뉴스 컨시어지 응답 생성
    
    사용자의 질문을 분석하고 관련 뉴스를 검색하여 AI가 생성한 상세한 답변을 제공합니다.
    각주 시스템과 연관어, 오늘의 이슈를 포함한 종합적인 분석을 제공합니다.
    """
    logger = setup_logger("api.news.concierge")
    logger.info(f"AI 뉴스 컨시어지 요청: {request.question}")
    
    try:
        # 스트리밍 생성기에서 최종 결과만 추출
        final_result = None
        async for progress in concierge_service.generate_concierge_response_stream(request):
            if progress.stage == "completed" and progress.result:
                final_result = progress.result
                break
        
        if not final_result:
            raise HTTPException(status_code=500, detail="컨시어지 응답 생성에 실패했습니다")
        
        return final_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 뉴스 컨시어지 응답 생성 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"컨시어지 응답 생성 중 오류 발생: {str(e)}")

@router.post("/concierge-stream")
async def get_concierge_stream(
    request: ConciergeRequest,
    concierge_service: NewsConciergeService = Depends(get_concierge_service)
):
    """AI 뉴스 컨시어지 스트리밍 응답
    
    사용자의 질문을 분석하고 관련 뉴스를 검색하여 AI가 생성한 답변을 실시간으로 스트리밍합니다.
    진행 상황과 GPT-4의 실시간 텍스트 생성을 확인할 수 있습니다.
    """
    logger = setup_logger("api.news.concierge_stream")
    logger.info(f"AI 뉴스 컨시어지 스트리밍 요청: {request.question}")
    
    async def generate():
        try:
            async for progress in concierge_service.generate_concierge_response_stream_with_ai_streaming(request):
                # SSE 형식으로 데이터 전송
                data = progress.model_dump_json()
                yield f"data: {data}\n\n"
                
                # 완료 시 연결 종료
                if progress.stage == "completed" or progress.stage == "error":
                    break
                    
        except Exception as e:
            logger.error(f"스트리밍 중 오류 발생: {e}", exc_info=True)
            error_progress = ConciergeProgress(
                stage="error",
                progress=0,
                message=f"스트리밍 중 오류가 발생했습니다: {str(e)}",
                current_task="오류 처리"
            )
            yield f"data: {error_progress.model_dump_json()}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )
    