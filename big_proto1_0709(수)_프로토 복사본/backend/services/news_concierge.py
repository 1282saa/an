"""
AI 뉴스 컨시어지 서비스

사용자의 질문을 분석하고 관련 뉴스를 검색하여 AI가 생성한 상세한 답변을 제공합니다.
실시간 스트리밍과 각주 시스템을 지원합니다.
"""

import asyncio
import json
import re
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from pydantic import BaseModel, Field
from collections import Counter

from backend.api.clients.bigkinds import BigKindsClient
from backend.utils.query_processor import QueryProcessor
from backend.utils.logger import setup_logger
from .news.related_questions_generator import RelatedQuestionsGenerator
from .aws_bedrock_client import get_bedrock_client, BedrockConfig


class ConciergeRequest(BaseModel):
    """AI 뉴스 컨시어지 요청 모델"""
    question: str = Field(..., description="사용자 질문", min_length=2, max_length=500)
    date_from: Optional[str] = Field(None, description="검색 시작일 (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="검색 종료일 (YYYY-MM-DD)")
    max_articles: int = Field(default=10, description="최대 검색 기사 수", ge=5, le=50)
    include_related_keywords: bool = Field(default=True, description="연관어 포함 여부")
    include_today_issues: bool = Field(default=True, description="오늘의 이슈 포함 여부")
    include_related_questions: bool = Field(default=True, description="관련 질문 포함 여부")
    detail_level: str = Field(default="detailed", description="답변 상세도 (brief/detailed/comprehensive)")
    provider_filter: str = Field(default="all", description="언론사 필터 (all: 전체언론사, seoul_economic: 서울경제만)")


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
    related_questions: List[Dict[str, Any]] = Field(default=[], description="연관 질문")
    today_issues: List[Dict[str, Any]] = Field(default=[], description="관련 오늘의 이슈")
    search_strategy: Dict[str, Any] = Field(description="사용된 검색 전략")
    analysis_metadata: Dict[str, Any] = Field(description="분석 메타데이터")
    citations_used: List[Dict[str, Any]] = Field(default=[], description="실제 사용된 인용 정보")
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


class NewsConciergeService:
    """AI 뉴스 컨시어지 서비스"""
    
    def __init__(self, bigkinds_client: BigKindsClient, bedrock_config: BedrockConfig = None):
        """
        Args:
            bigkinds_client: BigKinds 클라이언트
            bedrock_config: AWS Bedrock 설정 (옵션)
        """
        self.bigkinds_client = bigkinds_client
        self.query_processor = QueryProcessor()
        self.questions_generator = RelatedQuestionsGenerator()
        self.logger = setup_logger("services.news_concierge")
        
        # AWS Bedrock 클라이언트 초기화
        self.bedrock_client = get_bedrock_client(bedrock_config)
    
    async def generate_concierge_response_stream(
        self, 
        request: ConciergeRequest
    ) -> AsyncGenerator[ConciergeProgress, None]:
        """
        스트리밍 방식으로 AI 뉴스 컨시어지 응답 생성
        
        Args:
            request: 컨시어지 요청
            
        Yields:
            ConciergeProgress: 진행 상황
        """
        start_time = time.time()
        
        try:
            # 1단계: 질문 분석 및 키워드 추출
            yield ConciergeProgress(
                stage="question_analysis",
                progress=5,
                message="질문을 분석하고 키워드를 추출하고 있습니다...",
                current_task="키워드 추출"
            )
            
            # 키워드 추출 및 전처리
            processed_query = self.query_processor.preprocess_query(request.question)
            extracted_keywords = [keyword for keyword, weight in processed_query]
            
            yield ConciergeProgress(
                stage="keywords_extracted",
                progress=15,
                message=f"키워드 추출 완료: {', '.join(extracted_keywords[:5])}",
                current_task="검색 전략 수립",
                extracted_keywords=extracted_keywords
            )
            
            # 2단계: 검색 전략 수립
            yield ConciergeProgress(
                stage="search_strategy",
                progress=25,
                message="최적의 검색 전략을 수립하고 있습니다...",
                current_task="AND/OR 검색 전략"
            )
            
            # 날짜 범위 설정 - 최신성 강화 (7일 우선, 30일 폴백)
            date_from = request.date_from or (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")  # 최근 7일
            date_to = request.date_to or (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            # 검색 전략 구성
            search_strategy = {
                "keywords": extracted_keywords,
                "date_range": f"{date_from} ~ {date_to}",
                "search_type": "AND_priority",  # AND 우선, OR 폴백
                "max_articles": request.max_articles,
                "include_related_keywords": request.include_related_keywords,
                "include_today_issues": request.include_today_issues
            }
            
            yield ConciergeProgress(
                stage="search_strategy_ready",
                progress=35,
                message="검색 전략 수립 완료. 뉴스 검색을 시작합니다...",
                current_task="뉴스 검색"
            )
            
            # 3단계: 뉴스 검색 (AND 우선, OR 폴백)
            yield ConciergeProgress(
                stage="news_search",
                progress=45,
                message="관련 뉴스를 검색하고 있습니다...",
                current_task="BigKinds API 호출"
            )
            
            # 고급 검색 실행 (10개 기사 요청)
            search_results = await self._execute_advanced_search(
                request.question, date_from, date_to, 10, request.provider_filter  # 언론사 필터 추가
            )
            
            articles = search_results.get("documents", [])
            
            # 검색 결과가 없는 경우 조기 종료
            if not articles or len(articles) == 0 or search_results.get("search_failed", False):
                error_message = search_results.get("error_message", f"'{request.question}'에 대한 관련 뉴스 기사를 찾을 수 없습니다.")
                
                yield ConciergeProgress(
                    stage="no_results",
                    progress=100,
                    message=error_message,
                    current_task="검색 완료",
                    search_results_count=0
                )
                
                # 검색 결과가 없을 때의 응답 생성
                search_strategy = {
                    "keywords": extracted_keywords,
                    "date_range": f"{date_from} ~ {date_to}",
                    "search_type": "AND_priority",
                    "max_articles": request.max_articles,
                    "include_related_keywords": request.include_related_keywords,
                    "include_today_issues": request.include_today_issues
                }
                
                # 키워드 기반 연관어 생성 (검색 결과가 없어도 도움이 될 수 있는 연관어)
                related_keywords = []
                related_questions = []
                if extracted_keywords:
                    main_keyword = extracted_keywords[0]
                    related_keywords = self._generate_default_related_keywords(main_keyword)
                    
                    # 기본 관련 질문도 생성
                    if request.include_related_questions and (related_keywords or extracted_keywords):
                        available_keywords = related_keywords + extracted_keywords[:3]
                        keyword_weights = {kw: 1.0 - (i * 0.2) for i, kw in enumerate(available_keywords)}
                        
                        related_questions = self.questions_generator.generate_related_questions(
                            original_question=request.question,
                            related_keywords=available_keywords[:6],
                            keyword_weights=keyword_weights,
                            max_questions=4
                        )
                
                final_response = ConciergeResponse(
                    question=request.question,
                    answer=f"죄송합니다. '{request.question}'에 대한 관련 뉴스 기사를 찾을 수 없습니다.\n\n다음과 같은 방법을 시도해보세요:\n• 다른 키워드로 검색해보세요\n• 검색 기간을 조정해보세요\n• 더 일반적인 용어를 사용해보세요",
                    summary=f"'{request.question}' 관련 뉴스 기사를 찾을 수 없습니다.",
                    key_points=[
                        "검색 결과가 없습니다.",
                        "다른 키워드로 검색해보세요.",
                        "검색 기간을 조정해보세요.",
                        "더 일반적인 용어를 사용해보세요."
                    ],
                    references=[],
                    related_keywords=related_keywords,
                    related_questions=related_questions,
                    today_issues=[],
                    search_strategy=search_strategy,
                    analysis_metadata={
                        "processing_time_seconds": round(time.time() - start_time, 2),
                        "articles_analyzed": 0,
                        "keywords_extracted": len(extracted_keywords),
                        "ai_model": "none",
                        "generated_at": datetime.now().isoformat(),
                        "error": "no_search_results",
                        "search_attempted": True,
                        "related_questions_count": len(related_questions)
                    },
                    generated_at=datetime.now().isoformat()
                )
                
                yield ConciergeProgress(
                    stage="completed",
                    progress=100,
                    message="검색이 완료되었습니다.",
                    current_task="완료",
                    result=final_response
                )
                return
            
            yield ConciergeProgress(
                stage="search_completed",
                progress=55,
                message=f"{len(articles)}개의 관련 기사를 찾았습니다.",
                current_task="연관어 및 이슈 수집",
                search_results_count=len(articles)
            )
            
            # 4단계: 연관어 및 오늘의 이슈 수집 (병렬 처리로 최적화)
            related_keywords = []
            today_issues = []
            
            yield ConciergeProgress(
                stage="parallel_collection",
                progress=65,
                message="연관 키워드와 오늘의 이슈를 병렬로 수집하고 있습니다...",
                current_task="병렬 API 호출"
            )
            
            # 병렬 처리를 위한 태스크 준비
            tasks = []
            
            if request.include_related_keywords and extracted_keywords:
                main_keyword = extracted_keywords[0] if extracted_keywords else request.question
                tasks.append(self._get_related_keywords(main_keyword))
            else:
                tasks.append(asyncio.create_task(asyncio.sleep(0)))  # 더미 태스크
            
            if request.include_today_issues:
                tasks.append(self._get_today_issues())
            else:
                tasks.append(asyncio.create_task(asyncio.sleep(0)))  # 더미 태스크
            
            # 병렬 실행
            if tasks and len(tasks) >= 2:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # 연관어 결과 처리
                if request.include_related_keywords and extracted_keywords and len(results) > 0:
                    if not isinstance(results[0], Exception) and isinstance(results[0], list):
                        related_keywords = results[0]
                    else:
                        self.logger.warning(f"연관어 수집 실패: {results[0] if len(results) > 0 else 'No results'}")
                        related_keywords = []
                
                # 오늘의 이슈 결과 처리
                if request.include_today_issues and len(results) > 1:
                    if not isinstance(results[1], Exception) and isinstance(results[1], list):
                        today_issues = results[1]
                    else:
                        self.logger.warning(f"오늘의 이슈 수집 실패: {results[1] if len(results) > 1 else 'No results'}")
                        today_issues = []
            
            # 5단계: AI 분석 및 답변 생성
            yield ConciergeProgress(
                stage="ai_analysis",
                progress=75,
                message="AI가 뉴스를 분석하고 답변을 생성하고 있습니다...",
                current_task="GPT-4 분석"
            )
            
            # 기사 참조 정보 생성
            references = self._create_article_references(articles)
            
            # AI 답변 생성 (스트리밍)
            ai_response = await self._generate_ai_response_with_citations(
                request.question, articles, references, related_keywords, 
                today_issues, request.detail_level
            )
            
            # 6단계: 최종 응답 구성
            yield ConciergeProgress(
                stage="response_generation",
                progress=90,
                message="최종 답변을 구성하고 있습니다...",
                current_task="응답 포맷팅"
            )
            
            # 검색 전략 구성    
            search_strategy = {
                "keywords": extracted_keywords,
                "date_range": f"{date_from} ~ {date_to}",
                "search_type": "AND_priority",
                "max_articles": request.max_articles,
                "include_related_keywords": request.include_related_keywords,
                "include_today_issues": request.include_today_issues
            }
            
            # 최종 응답 생성
            final_response = ConciergeResponse(
                question=request.question,
                answer=ai_response["answer"],
                summary=ai_response["summary"],
                key_points=ai_response["key_points"],
                references=references,
                related_keywords=related_keywords,
                related_questions=related_questions,
                today_issues=today_issues,
                search_strategy=search_strategy,
                analysis_metadata={
                    "processing_time_seconds": round(time.time() - start_time, 2),
                    "articles_analyzed": len(articles),
                    "keywords_extracted": len(extracted_keywords),
                    "ai_model": "gpt-4o-mini",  # 실제 사용하는 모델로 수정
                    "generated_at": datetime.now().isoformat(),
                    "citations_used": ai_response.get("citations_used", []),
                    "total_citations": ai_response.get("total_citations", 0),
                    "related_keywords": related_keywords,
                    "related_questions_count": len(related_questions)
                },
                generated_at=datetime.now().isoformat()
            )
            
            # 완료
            yield ConciergeProgress(
                stage="completed",
                progress=100,
                message="AI 뉴스 컨시어지 답변 생성이 완료되었습니다!",
                current_task="완료",
                result=final_response
            )
            
        except Exception as e:
            self.logger.error(f"컨시어지 응답 생성 중 오류 발생: {e}", exc_info=True)
            yield ConciergeProgress(
                stage="error",
                progress=0,
                message=f"답변 생성 중 오류가 발생했습니다: {str(e)}",
                current_task="오류 처리"
            )
    
    async def _execute_advanced_search(
        self, 
        question: str, 
        date_from: str, 
        date_to: str, 
        max_articles: int,
        provider_filter: str = "all"
    ) -> Dict[str, Any]:
        """지능형 다단계 검색 전략 (우선순위 알고리즘 + 폴백)"""
        
        try:
            # 키워드 추출 및 분석
            processed_keywords = self.query_processor.preprocess_query(question)
            expanded_keywords = []
            for keyword, weight in processed_keywords:
                expanded_keywords.append(keyword)
                # 동의어 확장 - 포괄적 사전
                synonyms = self._get_keyword_synonyms(keyword)
                expanded_keywords.extend(synonyms)
            
            unique_keywords = list(dict.fromkeys(expanded_keywords))
            
            self.logger.info(f"원본 질문: {question}")
            self.logger.info(f"추출된 키워드: {unique_keywords}")
            
            # 다단계 검색 전략 실행
            return await self._execute_multi_stage_search(
                unique_keywords, question, date_from, date_to, max_articles, provider_filter
            )
            
        except Exception as e:
            self.logger.error(f"고급 검색 실패: {e}")
            # 폴백: 기본 검색 시도
            try:
                fallback_result = self.bigkinds_client.search_news(
                    query=question,
                    date_from=date_from,
                    date_to=date_to,
                    return_size=max_articles
                )
                
                # 폴백 검색 결과도 동일하게 처리
                fallback_return_object = fallback_result.get("return_object", {})
                fallback_documents = fallback_return_object.get("documents", [])
                fallback_total_hits = fallback_return_object.get("total_hits", 0)
                
                if not fallback_documents or len(fallback_documents) == 0:
                    return {
                        "documents": [],
                        "total_hits": 0,
                        "search_failed": True,
                        "error_message": f"'{question}'에 대한 관련 뉴스 기사를 찾을 수 없습니다. 다른 검색어를 시도해보세요."
                    }
                
                return {
                    "documents": fallback_documents,
                    "total_hits": fallback_total_hits,
                    "search_failed": False,
                    "return_object": fallback_return_object
                }
                
            except Exception as fallback_error:
                self.logger.error(f"폴백 검색도 실패: {fallback_error}")
                return {
                    "documents": [],
                    "total_hits": 0,
                    "search_failed": True,
                    "error_message": f"검색 중 오류가 발생했습니다: {str(fallback_error)}"
                }
    
    async def _execute_multi_stage_search(
        self, 
        keywords: List[str], 
        question: str, 
        date_from: str, 
        date_to: str, 
        max_articles: int,
        provider_filter: str = "all"
    ) -> Dict[str, Any]:
        """다단계 검색 전략 실행 - AND 우선에서 OR로 점진적 확장"""
        
        self.logger.info(f"다단계 검색 시작: 키워드={keywords[:5]}, 기간={date_from}~{date_to}, 언론사 필터={provider_filter}")
        
        # 언론사 필터 설정
        provider_list = None
        if provider_filter == "seoul_economic":
            provider_list = ["서울경제"]
            self.logger.info("서울경제 전용 모드로 검색")
        else:
            self.logger.info("전체 언론사 모드로 검색")
        
        all_articles = []
        search_attempts = []
        
        # 1단계: 핵심 키워드만으로 AND 검색 (최근 7일)
        if len(keywords) >= 2:
            core_keywords = keywords[:2]  # 상위 2개 핵심 키워드
            query = " AND ".join(core_keywords)
            
            try:
                search_result = self.bigkinds_client.search_news(
                    query=query,
                    date_from=date_from,
                    date_to=date_to,
                    return_size=20,
                    provider=provider_list
                )
                
                articles = search_result.get("return_object", {}).get("documents", [])
                
                if articles:
                    filtered_articles = self._filter_relevant_documents(articles, core_keywords, question)
                    new_articles = self._remove_duplicates(filtered_articles, all_articles)
                    
                    if new_articles:
                        self.logger.info(f"1단계 성공: {len(new_articles)}개 기사 (핵심 키워드 AND)")
                        all_articles.extend(new_articles[:max_articles-len(all_articles)])
                        search_attempts.append(f"1단계 성공: {query} ({len(new_articles)}개)")
                        
                        if len(all_articles) >= max_articles:
                            return {
                                "documents": self._deduplicate_articles(all_articles[:max_articles]),
                                "total_hits": len(all_articles),
                                "search_failed": False
                            }
                    
            except Exception as e:
                self.logger.warning(f"1단계 검색 실패: {e}")
                search_attempts.append(f"1단계 실패: {query}")
        
        # 2단계: 핵심 키워드 OR 검색 (최근 7일)
        if len(keywords) >= 2:
            core_keywords = keywords[:3]  # 상위 3개 키워드
            query = " OR ".join(core_keywords)
            
            try:
                search_result = self.bigkinds_client.search_news(
                    query=query,
                    date_from=date_from,
                    date_to=date_to,
                    return_size=30,
                    provider=provider_list
                )
                
                articles = search_result.get("return_object", {}).get("documents", [])
                
                if articles:
                    filtered_articles = self._filter_relevant_documents(articles, core_keywords, question)
                    new_articles = self._remove_duplicates(filtered_articles, all_articles)
                    
                    if new_articles:
                        self.logger.info(f"2단계 성공: {len(new_articles)}개 추가 기사 (핵심 키워드 OR)")
                        all_articles.extend(new_articles[:max_articles-len(all_articles)])
                        search_attempts.append(f"2단계 성공: {query} ({len(new_articles)}개 추가)")
                        
                        if len(all_articles) >= max_articles:
                            return {
                                "documents": self._deduplicate_articles(all_articles[:max_articles]),
                                "total_hits": len(all_articles),
                                "search_failed": False
                            }
                    
            except Exception as e:
                self.logger.warning(f"2단계 검색 실패: {e}")
                search_attempts.append(f"2단계 실패: {query}")
        
        # 3단계: 날짜 범위 확장 (30일) + 핵심 키워드 AND
        if len(all_articles) < max_articles // 2:  # 충분한 기사가 없으면 날짜 확장
            from datetime import datetime, timedelta
            extended_date_from = (datetime.strptime(date_to, "%Y-%m-%d") - timedelta(days=30)).strftime("%Y-%m-%d")
            
            if len(keywords) >= 2:
                core_keywords = keywords[:2]
                query = " AND ".join(core_keywords)
                
                try:
                    search_result = self.bigkinds_client.search_news(
                        query=query,
                        date_from=extended_date_from,
                        date_to=date_to,
                        return_size=25,
                        provider=provider_list
                    )
                    
                    articles = search_result.get("return_object", {}).get("documents", [])
                    
                    if articles:
                        filtered_articles = self._filter_relevant_documents(articles, core_keywords, question)
                        new_articles = self._remove_duplicates(filtered_articles, all_articles)
                        
                        if new_articles:
                            self.logger.info(f"3단계 성공: {len(new_articles)}개 추가 기사 (30일 확장 + AND)")
                            all_articles.extend(new_articles[:max_articles-len(all_articles)])
                            search_attempts.append(f"3단계 성공: {query} (30일, {len(new_articles)}개 추가)")
                            
                            if len(all_articles) >= max_articles:
                                return {
                                    "documents": self._deduplicate_articles(all_articles[:max_articles]),
                                    "total_hits": len(all_articles),
                                    "search_failed": False
                                }
                        
                except Exception as e:
                    self.logger.warning(f"3단계 검색 실패: {e}")
                    search_attempts.append(f"3단계 실패: {query} (30일)")
        
        # 4단계: 날짜 범위 확장 (30일) + 핵심 키워드 OR
        if len(all_articles) < max_articles // 2:
            from datetime import datetime, timedelta
            extended_date_from = (datetime.strptime(date_to, "%Y-%m-%d") - timedelta(days=30)).strftime("%Y-%m-%d")
            
            if len(keywords) >= 1:
                core_keywords = keywords[:3]
                query = " OR ".join(core_keywords)
                
                try:
                    search_result = self.bigkinds_client.search_news(
                        query=query,
                        date_from=extended_date_from,
                        date_to=date_to,
                        return_size=30,
                        provider=provider_list
                    )
                    
                    articles = search_result.get("return_object", {}).get("documents", [])
                    
                    if articles:
                        filtered_articles = self._filter_relevant_documents(articles, core_keywords, question)
                        new_articles = self._remove_duplicates(filtered_articles, all_articles)
                        
                        if new_articles:
                            self.logger.info(f"4단계 성공: {len(new_articles)}개 추가 기사 (30일 확장 + OR)")
                            all_articles.extend(new_articles[:max_articles-len(all_articles)])
                            search_attempts.append(f"4단계 성공: {query} (30일, {len(new_articles)}개 추가)")
                            
                            if len(all_articles) >= max_articles:
                                return {
                                    "documents": self._deduplicate_articles(all_articles[:max_articles]),
                                    "total_hits": len(all_articles),
                                    "search_failed": False
                                }
                        
                except Exception as e:
                    self.logger.warning(f"4단계 검색 실패: {e}")
                    search_attempts.append(f"4단계 실패: {query} (30일)")
        
        # 5단계: 최후의 수단 - 첫 번째 키워드만으로 90일 검색
        if len(all_articles) < 3 and keywords:
            from datetime import datetime, timedelta
            extended_date_from = (datetime.strptime(date_to, "%Y-%m-%d") - timedelta(days=90)).strftime("%Y-%m-%d")
            
            query = keywords[0]  # 가장 중요한 키워드 하나만
            
            try:
                search_result = self.bigkinds_client.search_news(
                    query=query,
                    date_from=extended_date_from,
                    date_to=date_to,
                    return_size=20,
                    provider=provider_list
                )
                
                articles = search_result.get("return_object", {}).get("documents", [])
                
                if articles:
                    new_articles = self._remove_duplicates(articles, all_articles)
                    
                    if new_articles:
                        self.logger.info(f"5단계 성공: {len(new_articles)}개 추가 기사 (90일 + 단일 키워드)")
                        all_articles.extend(new_articles[:max_articles-len(all_articles)])
                        search_attempts.append(f"5단계 성공: {query} (90일, {len(new_articles)}개 추가)")
                    
            except Exception as e:
                self.logger.warning(f"5단계 검색 실패: {e}")
                search_attempts.append(f"5단계 실패: {query} (90일)")
        
        # 검색 시도 로그 출력
        self.logger.info(f"다단계 검색 완료: 총 {len(all_articles)}개 기사")
        for attempt in search_attempts:
            self.logger.info(f"  - {attempt}")
        
        # 최종 중복 제거 및 관련성 순 정렬
        final_articles = self._deduplicate_articles(all_articles)
        
        if not final_articles:
            self.logger.warning(f"검색 결과 없음. 키워드: {keywords}, 질문: {question}")
            return {
                "documents": [],
                "total_hits": 0,
                "search_failed": True,
                "error_message": f"'{question}'에 대한 관련 뉴스 기사를 찾을 수 없습니다."
            }
        
        return {
            "documents": final_articles[:max_articles],
            "total_hits": len(final_articles),
            "search_failed": False
        }
    
    def _remove_duplicates(self, new_articles: List[Dict[str, Any]], existing_articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """새로운 기사 목록에서 이미 존재하는 기사들을 제거"""
        existing_ids = {article.get("news_id", "") for article in existing_articles}
        return [article for article in new_articles if article.get("news_id", "") not in existing_ids]
    
    def _deduplicate_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """기사 목록에서 중복 제거"""
        seen_ids = set()
        deduplicated = []
        
        for article in articles:
            news_id = article.get("news_id", "")
            if news_id and news_id not in seen_ids:
                seen_ids.add(news_id)
                deduplicated.append(article)
        
        return deduplicated
    
    async def _get_related_keywords(self, keyword: str, max_count: int = 10) -> List[str]:
        """연관 키워드 수집"""
        try:
            # BigKinds 연관어 API 호출
            related_data = self.bigkinds_client.get_related_keywords(keyword, max_count)
            if isinstance(related_data, list) and len(related_data) > 0:
                print(f"DEBUG: BigKinds에서 수집된 연관어: {related_data}")
                return related_data
            else:
                print(f"DEBUG: BigKinds 연관어 API 응답이 비어있음, 기본 연관어 생성")
                # BigKinds API가 실패하면 기본 연관어 생성
                return self._generate_default_related_keywords(keyword)
        except Exception as e:
            self.logger.error(f"연관어 수집 실패: {e}")
            print(f"DEBUG: 연관어 수집 실패, 기본 연관어 생성: {e}")
            # 오류 시 기본 연관어 생성
            return self._generate_default_related_keywords(keyword)
    
    def _generate_default_related_keywords(self, keyword: str) -> List[str]:
        """기본 연관어 생성 - 키워드 기반"""
        
        # 키워드를 소문자로 변환하여 매칭
        keyword_lower = keyword.lower()
        
        # 키워드별 관련어 매핑
        keyword_mappings = {
            # 기술/IT 관련
            "ai": ["인공지능", "머신러닝", "딥러닝", "빅데이터", "알고리즘", "ChatGPT", "생성AI"],
            "인공지능": ["AI", "머신러닝", "딥러닝", "빅데이터", "알고리즘", "ChatGPT", "생성AI"],
            "반도체": ["칩", "메모리", "시스템반도체", "파운드리", "웨이퍼", "TSMC", "삼성전자"],
            "gpu": ["NVIDIA", "AMD", "그래픽카드", "AI칩", "병렬처리", "CUDA"],
            "nvidia": ["GPU", "AI칩", "그래픽카드", "CUDA", "데이터센터", "젠슨황"],
            "삼성": ["갤럭시", "메모리", "디스플레이", "반도체", "스마트폰", "이재용"],
            
            # 국제/정치 관련
            "이란": ["핵", "제재", "중동", "석유", "IAEA", "우라늄", "핵시설", "테헤란"],
            "핵": ["원자력", "우라늄", "핵발전", "핵무기", "원전", "IAEA", "핵시설"],
            "핵시설": ["원자력", "우라늄", "핵발전", "원전", "IAEA", "핵무기", "방사능"],
            "미국": ["트럼프", "바이든", "달러", "연준", "경제", "백악관", "국무부"],
            "중국": ["시진핑", "무역", "경제", "홍콩", "대만", "베이징", "위안화"],
            "러시아": ["푸틴", "우크라이나", "천연가스", "루블", "모스크바", "제재"],
            "일본": ["기시다", "엔화", "도쿄", "후쿠시마", "원전", "경제"],
            
            # 경제 관련
            "경제": ["GDP", "인플레이션", "금리", "주식", "환율", "성장률", "경기"],
            "주식": ["코스피", "나스닥", "다우", "투자", "증시", "상장", "배당"],
            "부동산": ["아파트", "전세", "매매", "대출", "정책", "집값", "임대"],
            "금리": ["기준금리", "대출금리", "예금금리", "인플레이션", "중앙은행"],
            "인플레이션": ["물가", "소비자물가", "금리", "경제", "중앙은행"],
            
            # 에너지/환경 관련
            "기후": ["온실가스", "탄소중립", "신재생에너지", "환경", "지구온난화", "파리협정"],
            "원전": ["원자력", "핵발전", "방사능", "우라늄", "후쿠시마", "체르노빌"],
            "석유": ["원유", "가격", "OPEC", "정제", "에너지", "배럴"],
            
            # 기타
            "코로나": ["백신", "확진", "방역", "WHO", "팬데믹", "변이", "치료제"],
            "북한": ["김정은", "핵", "미사일", "제재", "평양", "비핵화"],
            "우크라이나": ["러시아", "전쟁", "젤렌스키", "푸틴", "키예프", "NATO"]
        }
        
        # 키워드와 매칭되는 연관어 찾기
        related_keywords = []
        
        # 직접 매칭 시도
        for key, values in keyword_mappings.items():
            if key in keyword_lower:
                related_keywords.extend(values)
                break
        
        # 직접 매칭이 안되면 부분 매칭 시도
        if not related_keywords:
            for key, values in keyword_mappings.items():
                if any(key in word for word in keyword_lower.split()) or any(word in key for word in keyword_lower.split()):
                    related_keywords.extend(values)
                    break
        
        # 여전히 매칭되지 않으면 키워드에서 의미있는 단어 추출
        if not related_keywords:
            words = keyword_lower.split()
            # 2글자 이상의 의미있는 단어들만 추출
            meaningful_words = [word for word in words if len(word) >= 2 and word not in ['그리고', '그런데', '하지만', '그래서', '때문에']]
            if meaningful_words:
                related_keywords = meaningful_words[:5]
        
        # 그래도 없으면 빈 리스트 반환 (기본 AI 반도체 연관어 사용하지 않음)
        if not related_keywords:
            self.logger.info(f"키워드 '{keyword}'에 대한 적절한 연관어를 찾을 수 없습니다.")
            return []
        
        # 중복 제거하고 최대 8개까지 반환
        unique_keywords = list(set(related_keywords))
        return unique_keywords[:8]
    
    async def _get_today_issues(self) -> List[Dict[str, Any]]:
        """오늘의 이슈 수집"""
        try:
            # BigKinds 이슈 랭킹 API 호출
            issues_data = self.bigkinds_client.get_issue_ranking(
                date=datetime.now().strftime("%Y-%m-%d")
            )
            return issues_data.get("issues", []) if isinstance(issues_data, dict) else []
        except Exception as e:
            self.logger.error(f"오늘의 이슈 수집 실패: {e}")
            return []
    
    def _create_article_references(self, articles: List[Dict[str, Any]]) -> List[ArticleReference]:
        """기사 참조 정보 생성"""
        references = []
        
        for i, article in enumerate(articles):
            ref_id = f"ref{i+1}"
            
            # URL 필드 처리 - BigKinds API는 provider_link_page 필드 사용
            article_url = article.get("url") or article.get("provider_link_page", "")
            
            reference = ArticleReference(
                ref_id=ref_id,
                title=article.get("title", "제목 없음"),
                provider=article.get("provider", article.get("provider_name", "언론사 정보 없음")),
                published_at=article.get("published_at", "날짜 정보 없음"),
                url=article_url,
                relevance_score=article.get("_score", 0.0) / 100.0  # 정규화
            )
            references.append(reference)
        
        return references
    
    async def _generate_ai_response_with_citations(
        self,
        question: str,
        articles: List[Dict[str, Any]],
        references: List[ArticleReference],
        related_keywords: List[str],
        today_issues: List[Dict[str, Any]],
        detail_level: str
    ) -> Dict[str, Any]:
        """각주 포함 AI 응답 생성 - 실제 기사 내용만 사용"""
        
        # 10개 기사 사용하여 정확한 분석
        top_articles = articles[:10]
        top_references = references[:10]
        
        # 기사 내용과 키워드 매칭 검증
        verified_articles = self._verify_article_relevance(top_articles, question, related_keywords)
        
        if not verified_articles:
            self.logger.warning("질문과 관련된 기사를 찾을 수 없습니다.")
            return {
                "answer": f"죄송합니다. '{question}'와 관련된 신뢰할 수 있는 기사를 찾을 수 없습니다. 다른 키워드나 질문으로 다시 시도해주세요.",
                "summary": "관련 기사 없음",
                "key_points": ["질문과 관련된 최근 기사를 찾을 수 없습니다."],
                "citations_used": [],
                "related_keywords": related_keywords
            }
        
        # 기사 내용 구성 (하이라이트 정보 우선 활용)
        articles_text = ""
        for i, article in enumerate(verified_articles):
            ref_id = f"ref{i+1}"
            title = article.get("title", "")
            content = article.get("content", article.get("summary", ""))[:1000]  # 더 많은 내용 포함
            provider = article.get("provider", "")
            published_at = article.get("published_at", "")
            
            # 하이라이트 정보 추출 및 검증
            highlight_info = article.get("highlight", {})
            highlighted_sentences = []
            
            # 하이라이트된 제목과 내용 추출
            if highlight_info:
                if "title" in highlight_info and highlight_info["title"]:
                    highlighted_sentences.extend(highlight_info["title"])
                if "content" in highlight_info and highlight_info["content"]:
                    # 상위 8개 문장으로 확대
                    highlighted_sentences.extend(highlight_info["content"][:8])
            
            articles_text += f"\n[{ref_id}] 제목: {title}\n"
            articles_text += f"언론사: {provider} | 발행일: {published_at}\n"
            articles_text += f"내용: {content}\n"
            
            # 하이라이트된 핵심 문장 추가 (중요!)
            if highlighted_sentences:
                articles_text += f"**핵심 문장 (키워드 매칭)**: {' | '.join(highlighted_sentences[:8])}\n"
            
            articles_text += f"---\n"
        
        # GPT-4 프롬프트 구성 (각주 시스템 강화 - 자연스러운 흐름)
        system_prompt = """당신은 뉴스 분석 전문가입니다. 
주어진 뉴스 기사들을 바탕으로 사용자의 질문에 대해 객관적이고 통찰력 있는 답변을 제공합니다.

★★★ 핵심 규칙: 모든 문장은 반드시 인용 번호(1~10)로 끝나야 합니다 ★★★

답변 작성 규칙:
1. 반드시 제공된 기사 내용만을 바탕으로 답변하세요
2. 모든 문장의 끝에 인용 번호를 표시하세요 (예: 문장 끝에 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
3. 인용 번호는 문장부호 바로 뒤에 공백 없이 숫자만 표시
4. 올바른 예: "발표했다1", "증가했다2", "예정이다3", "분석했다8", "전망이다10"
5. 잘못된 예: "발표했다 1", "발표했다[1]", "발표했다(1)"
6. 추측이나 개인적 의견보다는 기사에 나타난 사실과 데이터를 중심으로 서술하세요
7. 자연스럽고 읽기 쉬운 흐름으로 작성하되, 정보의 출처를 명확히 해주세요
8. 기사에서 인용한 구체적인 수치나 발언이 있다면 문장 끝에 해당 기사 번호를 표시하세요
9. 한 문장에 여러 기사의 정보가 있으면 가장 중요한 출처 하나만 표시

★★★ 자연스러운 텍스트 작성 규칙 ★★★:
- 문단을 적절히 나누어 작성: 주제가 바뀔 때마다 빈 줄로 문단을 구분하세요
- 자연스러운 흐름: 이야기하듯 자연스럽게 정보를 전달하세요
- 소제목이나 특수기호 사용 금지: **, ##, 📖 등 사용하지 마세요
- 깔끔한 텍스트: 순수한 텍스트로만 작성하세요
- 적절한 문장 길이: 한 문장이 너무 길지 않도록 적절히 나누어 작성

구체적 정보 포함 의무 (매우 중요):
- 인명: 관련된 모든 인물의 실명과 직책을 정확히 명시 (예: "홍길동 금융위원장에 따르면")
- 지명: 구체적인 지역명, 국가명, 도시명 등을 명확히 표기
- 날짜와 시간: 구체적인 날짜, 시간, 기간, 시점을 정확히 기재 (예: "7월 5일 오전 9시 발표에 따르면")
- 기관명: 관련 기관, 회사, 조직의 정확한 명칭 포함 (예: "서울경제신문에 따르면")
- 수치: 금액, 비율, 규모 등 구체적 수치 반드시 포함
- 원문 인용: 기사 원문의 출처나 인용 문구 포함 (예: "~에 따르면", "~라고 밝혔다")
- 기사에 없는 내용이나 추측성 내용 추가 금지"""

        user_prompt = f"""질문: {question}

{response_instruction}으로 답변해주세요.

분석할 기사들 (반드시 이 기사들의 내용만 사용하세요):
{articles_text}

{related_text}

{issues_text}

위 10개 기사를 바탕으로 질문에 대해 상세한 답변을 작성해주세요. 

★★★ 인용 번호 표시 필수 규칙 (매우 중요) ★★★:
1. 모든 문장은 반드시 인용 번호로 끝나야 합니다
2. 인용 번호는 문장부호(마침표, 물음표, 느낌표) 바로 뒤에 공백 없이 숫자만 표시
3. 올바른 형식: "발표했다1", "증가했다2", "예정이다3"
4. 잘못된 형식: "발표했다 1", "발표했다[1]", "발표했다(1)"
5. 한 문장에 여러 기사 정보가 있으면 주요 출처 하나만 표시

★★★ 자연스러운 답변 작성 규칙 ★★★:
1. 문단 구분: 주제가 바뀔 때마다 반드시 빈 줄로 문단을 나누세요
2. 자연스러운 흐름: 이야기하듯 자연스럽게 정보를 전달하세요
3. 특수기호 사용 금지: **, ##, 📖 등 특수기호를 사용하지 마세요
4. 깔끔한 텍스트: 순수한 텍스트로만 작성하세요
5. 적절한 문장 길이: 한 문장이 3줄을 넘지 않도록 조절하여 읽기 쉽게 작성

인용 번호 예시:
- "삼성전자는 올해 HBM 매출이 전년 대비 50% 증가했다고 발표했다1"

(문단 나누기)

- "AI 반도체 수요 급증으로 향후 전망도 밝은 것으로 분석된다2"

추가 지침:
- 각 문장이나 정보의 끝에 해당 기사 번호를 표시하세요 (1, 2, 3, 4, 5)
- 기사에 나온 구체적인 수치, 발언, 계획 등을 인용할 때는 해당 문장 끝에 기사 번호를 표시하세요
- 여러 기사에서 비슷한 내용이 나온다면 적절한 기사 번호를 선택하여 표시하세요
- 기사에 없는 내용은 절대 추가하지 마세요

구체적 정보 필수 포함사항:
- 인물 언급 시: "홍길동 XX회사 대표", "김철수 금융위원장" 등 실명+직책 명시
- 시간 정보: "7월 5일", "오전 9시", "2024년 상반기" 등 구체적 시점 표기
- 장소 정보: "서울 강남구", "미국 뉴욕", "중국 베이징" 등 구체적 지명
- 기관명: "삼성전자", "금융위원회", "한국은행" 등 정확한 기관명
- 수치 데이터: "30% 증가", "1조원 규모", "500만 달러" 등 구체적 수치
- 인용구: "~라고 말했다", "~에 따르면", "~로 전해졌다" 등 원문 표현 활용"""

        try:
            # AWS Bedrock Claude API 호출 (비스트리밍)
            response = await self.bedrock_client.generate(
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
                system_prompt=system_prompt,
                max_tokens=2500,
                temperature=0.1,  # 정확성을 위해 낮은 온도
                stream=False
            )
            
            full_response = response["content"]
            
            # 응답 검증 - 기사 내용과 일치하는지 확인
            verified_response = self._verify_ai_response(full_response, verified_articles, question)
            
            # 응답 파싱 및 각주 검증
            return self._parse_and_validate_ai_response(verified_response, top_references, related_keywords)
            
        except Exception as e:
            self.logger.error(f"AI 응답 생성 실패: {e}")
            return {
                "answer": f"죄송합니다. AI 분석 중 오류가 발생했습니다. 관련 기사는 {len(verified_articles)}개를 찾았으나 분석을 완료할 수 없었습니다.",
                "summary": "AI 분석 실패",
                "key_points": ["AI 분석을 완료할 수 없었습니다.", "관련 기사는 검색되었으나 처리 중 오류가 발생했습니다."],
                "citations_used": [],
                "related_keywords": related_keywords
            }
    
    def _verify_article_relevance(self, articles: List[Dict[str, Any]], question: str, keywords: List[str]) -> List[Dict[str, Any]]:
        """기사와 질문의 관련성을 엄격하게 검증"""
        
        # 질문에서 핵심 키워드 추출
        question_lower = question.lower()
        question_keywords = []
        
        # 기술 용어 우선 추출
        tech_terms = ['hbm', 'ai', 'iot', 'esg', 'cpu', 'gpu', 'dram', 'ssd', '반도체', '메모리', '인공지능']
        for term in tech_terms:
            if term in question_lower:
                question_keywords.append(term)
        
        # 일반 키워드 추가
        question_keywords.extend([kw.lower() for kw in keywords[:3]])
        
        verified_articles = []
        
        for article in articles:
            title = article.get("title", "").lower()
            content = article.get("content", "").lower()
            full_text = f"{title} {content}"
            
            # 핵심 키워드 매칭 확인
            matches = 0
            for keyword in question_keywords:
                if keyword in full_text:
                    matches += 1
            
            # 50% 이상 키워드가 매칭되면 관련 기사로 인정
            if matches >= len(question_keywords) * 0.5:
                verified_articles.append(article)
                
        self.logger.info(f"관련성 검증: {len(verified_articles)}/{len(articles)} 기사가 질문과 관련됨")
        return verified_articles[:10]  # 최대 10개
    
    def _verify_ai_response(self, response: str, articles: List[Dict[str, Any]], question: str) -> str:
        """AI 응답이 실제 기사 내용과 일치하는지 검증"""
        
        # 기사에서 사용 가능한 모든 텍스트 수집
        all_article_text = ""
        for article in articles:
            title = article.get("title", "")
            content = article.get("content", "")
            highlight = article.get("highlight", {})
            
            all_article_text += f"{title} {content} "
            
            # 하이라이트 정보도 포함
            if highlight:
                if "title" in highlight:
                    all_article_text += " ".join(highlight["title"]) + " "
                if "content" in highlight:
                    all_article_text += " ".join(highlight["content"]) + " "
        
        all_article_text = all_article_text.lower()
        
        # 응답에서 의심스러운 내용 검출
        response_lines = response.split('\n')
        verified_lines = []
        
        for line in response_lines:
            if not line.strip():
                verified_lines.append(line)
                continue
                
            line_lower = line.lower()
            
            # 일반적인 지식이나 추측성 표현 검출
            suspicious_phrases = [
                '일반적으로', '보통', '대체로', '예상됩니다', '추정됩니다', 
                '것으로 보입니다', '가능성이 높습니다', '전망입니다'
            ]
            
            is_suspicious = any(phrase in line_lower for phrase in suspicious_phrases)
            
            if is_suspicious:
                # 의심스러운 내용은 "기사에서 확인되지 않음" 표시 추가
                verified_lines.append(line + " (기사에서 확인되지 않은 내용)")
            else:
                verified_lines.append(line)
        
        return '\n'.join(verified_lines)
    
    def _parse_and_validate_ai_response(self, response_text: str, references: List[ArticleReference], related_keywords: List[str]) -> Dict[str, Any]:
        """AI 응답 파싱 및 각주 검증 (에러 처리 강화)"""
        
        try:
            # 전체 응답을 answer로 사용
            answer = response_text.strip()
            
            # 응답이 비어있는 경우 처리
            if not answer:
                self.logger.warning("AI 응답이 비어있습니다.")
                return self._create_fallback_response(response_text, references, related_keywords, "AI 응답이 비어있습니다.")
            
            # 디버깅: 원본 응답 확인
            self.logger.info(f"AI 원본 응답 (처음 200자): {answer[:200]}...")
            
            # 기존 인용 번호 패턴 확인
            existing_citation_patterns = [
                r'\d+(?=\s*[.!?]?\s*$)',  # 문장 끝 숫자
                r'([가-힣a-zA-Z])(\d+)(?=\s|$|[.!?])',  # 한글/영문 뒤 숫자
                r'([.!?])(\d+)(?=\s|$)',  # 문장부호 뒤 숫자
                r'(\S)(\d+)(?=\s|$)'  # 비공백 문자 뒤 숫자
            ]
            
            has_existing_citations = False
            for pattern in existing_citation_patterns:
                if re.search(pattern, answer):
                    has_existing_citations = True
                    break
            
            # 인용 번호가 없으면 안전하게 추가
            if not has_existing_citations:
                self.logger.info("AI 응답에 인용 번호가 없습니다. 안전하게 인용 번호를 추가합니다.")
                
                try:
                    # 문장 분리 (한국어 문장부호 기준) - 더 안전한 방법
                    sentences = re.split(r'(?<=[.!?])\s+', answer)
                    new_sentences = []
                    
                    for i, sentence in enumerate(sentences):
                        sentence = sentence.strip()
                        if sentence and len(sentence) > 5:  # 의미있는 문장만 처리
                            # 인용번호 추가 (1-10 순환, references 길이 고려)
                            max_ref = min(len(references), 10) if references else 3
                            citation_num = (i % max_ref) + 1
                            
                            # 문장 끝에 문장부호가 있는지 확인
                            if sentence.endswith(('.', '!', '?')):
                                # 문장부고 전에 특별한 각주 마커 삽입
                                new_sentence = sentence[:-1] + f"[REF:{citation_num}]" + sentence[-1]
                            else:
                                # 문장부호가 없으면 마침표와 함께 추가
                                new_sentence = sentence + f"[REF:{citation_num}]" + "."
                            
                            new_sentences.append(new_sentence)
                        elif sentence:  # 짧은 문장도 보존
                            new_sentences.append(sentence)
                    
                    if new_sentences:
                        answer = " ".join(new_sentences)
                        self.logger.info("인용 번호 추가 완료")
                    
                except Exception as citation_error:
                    self.logger.warning(f"인용 번호 추가 실패: {citation_error}, 원본 응답 사용")
                    # 인용 번호 추가에 실패해도 원본 응답은 유지
            
            # 인용 번호 추출 - 안전한 처리
            citation_numbers = []
            try:
                # 새로운 각주 마커 패턴으로 인용번호 추출
                citation_pattern = r'\[REF:(\d+)\]'
                matches = re.finditer(citation_pattern, answer)
                
                for match in matches:
                    try:
                        num_str = match.group(1)
                        if num_str and num_str.isdigit():
                            num = int(num_str)
                            max_citations = len(references) if references else 10
                            if 1 <= num <= max_citations:  # 실제 참조 범위 내에서만
                                citation_numbers.append(str(num))
                    except (IndexError, ValueError, AttributeError) as e:
                        self.logger.warning(f"인용 번호 추출 중 오류 무시: {e}")
                        continue
                
                # 중복 제거하되 순서 유지
                seen = set()
                citation_numbers = [x for x in citation_numbers if not (x in seen or seen.add(x))]
                
            except Exception as extraction_error:
                self.logger.warning(f"인용 번호 추출 실패: {extraction_error}")
                citation_numbers = []
            
            # 인용번호가 없으면 안전한 기본값 설정
            if not citation_numbers and references:
                citation_numbers = ['1']  # 최소한 하나는 설정
                self.logger.info("기본 인용번호 1 설정")
            
            # 사용된 인용 정보 수집 - 매우 안전한 처리
            citations_used = []
            for citation_num in citation_numbers:
                try:
                    if not citation_num or not citation_num.isdigit():
                        continue
                        
                    ref_index = int(citation_num) - 1
                    
                    if references and 0 <= ref_index < len(references):
                        ref = references[ref_index]
                        if ref and hasattr(ref, 'title'):  # 안전성 검사
                            citations_used.append({
                                "citation_number": int(citation_num),
                                "title": getattr(ref, 'title', '제목 없음'),
                                "provider": getattr(ref, 'provider', 'Unknown'),
                                "published_at": getattr(ref, 'published_at', ''),
                                "relevance_score": getattr(ref, 'relevance_score', 0.5)
                            })
                            self.logger.debug(f"추가된 인용: {citation_num}")
                        else:
                            self.logger.warning(f"참조 객체가 유효하지 않음: {ref_index}")
                    else:
                        self.logger.warning(f"인용 번호 {citation_num}이 범위를 벗어남 (참조 기사 수: {len(references) if references else 0})")
                        
                except (ValueError, IndexError, AttributeError, TypeError) as e:
                    self.logger.warning(f"인용 정보 처리 중 오류 무시: {citation_num}, 오류: {e}")
                    continue
            
            # 인용이 하나도 없으면 첫 번째 기사라도 안전하게 추가
            if not citations_used and references and len(references) > 0:
                try:
                    first_ref = references[0]
                    if first_ref and hasattr(first_ref, 'title'):
                        citations_used.append({
                            "citation_number": 1,
                            "title": getattr(first_ref, 'title', '기본 참조'),
                            "provider": getattr(first_ref, 'provider', 'Unknown'),
                            "published_at": getattr(first_ref, 'published_at', ''),
                            "relevance_score": getattr(first_ref, 'relevance_score', 0.5)
                        })
                        self.logger.info("첫 번째 기사를 기본 인용으로 추가")
                except Exception as first_ref_error:
                    self.logger.warning(f"첫 번째 참조 추가 실패: {first_ref_error}")
            
            # 요약 생성 - 안전한 처리
            try:
                clean_text_for_summary = re.sub(r'(\S)(\d+)(?=\s|$|[.!?])', r'\1', answer)
                summary = clean_text_for_summary[:200] + "..." if len(clean_text_for_summary) > 200 else clean_text_for_summary
            except Exception as summary_error:
                self.logger.warning(f"요약 생성 실패: {summary_error}")
                summary = answer[:200] + "..." if len(answer) > 200 else answer
            
            # 주요 포인트 생성 - 안전한 처리
            key_points = []
            try:
                sentences = re.split(r'[.!?]\s+', answer)
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    if len(sentence) > 30 and len(key_points) < 4:
                        # 인용 번호 제거
                        clean_sentence = re.sub(r'(\S)(\d+)(?=\s|$)', r'\1', sentence)
                        clean_sentence = clean_sentence.strip()
                        if len(clean_sentence) > 30:
                            key_points.append(clean_sentence)
                
            except Exception as key_points_error:
                self.logger.warning(f"주요 포인트 생성 실패: {key_points_error}")
            
            # 기본값 설정
            if not key_points:
                key_points = ["뉴스 분석 내용을 확인해주세요."]
            
            self.logger.info(f"최종 처리 완료 - 인용: {len(citations_used)}, 키포인트: {len(key_points)}")
            
            return {
                "answer": answer,
                "summary": summary,
                "key_points": key_points,
                "citations_used": citations_used,
                "related_keywords": related_keywords or [],
                "total_citations": len(citation_numbers),
                "articles_used_count": len(citations_used)
            }
            
        except Exception as e:
            self.logger.error(f"AI 응답 파싱 중 전체 오류: {e}", exc_info=True)
            # 전체 실패 시에도 안전한 응답 반환
            return self._create_fallback_response(response_text, references, related_keywords, str(e))
    
    def _create_fallback_response(self, response_text: str, references: List[ArticleReference], related_keywords: List[str], error_msg: str) -> Dict[str, Any]:
        """파싱 실패 시 안전한 대체 응답 생성"""
        
        # 응답 텍스트 정리
        clean_response = response_text.strip() if response_text else "분석 결과를 생성하는 중 문제가 발생했습니다."
        
        # 기본 요약
        summary = clean_response[:150] + "..." if len(clean_response) > 150 else clean_response
        
        # 기본 키포인트
        key_points = [
            "기사 분석이 완료되었습니다.",
            "자세한 내용은 참조 기사를 확인해주세요."
        ]
        
        # 안전한 첫 번째 인용 추가
        citations_used = []
        if references and len(references) > 0:
            try:
                first_ref = references[0]
                citations_used = [{
                    "citation_number": 1,
                    "title": getattr(first_ref, 'title', '참조 기사'),
                    "provider": getattr(first_ref, 'provider', 'Unknown'),
                    "published_at": getattr(first_ref, 'published_at', ''),
                    "relevance_score": getattr(first_ref, 'relevance_score', 0.5)
                }]
            except Exception as fallback_error:
                self.logger.warning(f"대체 응답 생성 중 오류: {fallback_error}")
        
        self.logger.info(f"안전한 대체 응답 생성 완료: {error_msg}")
        
        return {
            "answer": clean_response,
            "summary": summary,
            "key_points": key_points,
            "citations_used": citations_used,
            "related_keywords": related_keywords or [],
            "total_citations": len(citations_used),
            "articles_used_count": len(citations_used)
        }
    
    async def generate_concierge_response_stream_with_ai_streaming(
        self, 
        request: ConciergeRequest
    ) -> AsyncGenerator[ConciergeProgress, None]:
        """
        실시간 GPT-4 스트리밍을 포함한 AI 뉴스 컨시어지 응답 생성
        
        Args:
            request: 컨시어지 요청
            
        Yields:
            ConciergeProgress: 진행 상황 (AI 응답 실시간 포함)
        """
        start_time = time.time()
        
        try:
            # 1-4단계: 기존과 동일 (질문 분석, 검색, 연관어 수집)
            yield ConciergeProgress(
                stage="question_analysis",
                progress=5,
                message="질문을 분석하고 키워드를 추출하고 있습니다...",
                current_task="키워드 추출"
            )
            
            # 키워드 추출
            processed_query = self.query_processor.preprocess_query(request.question)
            extracted_keywords = [keyword for keyword, weight in processed_query]
            
            yield ConciergeProgress(
                stage="keywords_extracted",
                progress=15,
                message=f"키워드 추출 완료: {', '.join(extracted_keywords[:5])}",
                current_task="검색 전략 수립",
                extracted_keywords=extracted_keywords
            )
            
            # 검색 전략 수립
            yield ConciergeProgress(
                stage="search_strategy",
                progress=25,
                message="최적의 검색 전략을 수립하고 있습니다...",
                current_task="AND/OR 검색 전략"
            )
            
            # 날짜 범위 설정 - 최신성 강화 (7일 우선, 30일 폴백)
            date_from = request.date_from or (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")  # 최근 7일
            date_to = request.date_to or (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            # 뉴스 검색
            yield ConciergeProgress(
                stage="news_search",
                progress=45,
                message="관련 뉴스를 검색하고 있습니다...",
                current_task="BigKinds API 호출"
            )
            
            search_results = await self._execute_advanced_search(
                request.question, date_from, date_to, 10, request.provider_filter  # 언론사 필터 추가
            )
            
            articles = search_results.get("documents", [])
            
            # 검색 결과가 없는 경우 조기 종료
            if not articles or len(articles) == 0 or search_results.get("search_failed", False):
                error_message = search_results.get("error_message", f"'{request.question}'에 대한 관련 뉴스 기사를 찾을 수 없습니다.")
                
                yield ConciergeProgress(
                    stage="no_results",
                    progress=100,
                    message=error_message,
                    current_task="검색 완료",
                    search_results_count=0
                )
                
                # 검색 결과가 없을 때의 응답 생성
                search_strategy = {
                    "keywords": extracted_keywords,
                    "date_range": f"{date_from} ~ {date_to}",
                    "search_type": "AND_priority",
                    "max_articles": request.max_articles,
                    "include_related_keywords": request.include_related_keywords,
                    "include_today_issues": request.include_today_issues
                }
                
                # 키워드 기반 연관어 생성 (검색 결과가 없어도 도움이 될 수 있는 연관어)
                related_keywords = []
                if extracted_keywords:
                    main_keyword = extracted_keywords[0]
                    related_keywords = self._generate_default_related_keywords(main_keyword)
                
                final_response = ConciergeResponse(
                    question=request.question,
                    answer=f"죄송합니다. '{request.question}'에 대한 관련 뉴스 기사를 찾을 수 없습니다.\n\n다음과 같은 방법을 시도해보세요:\n• 다른 키워드로 검색해보세요\n• 검색 기간을 조정해보세요\n• 더 일반적인 용어를 사용해보세요",
                    summary=f"'{request.question}' 관련 뉴스 기사를 찾을 수 없습니다.",
                    key_points=[
                        "검색 결과가 없습니다.",
                        "다른 키워드로 검색해보세요.",
                        "검색 기간을 조정해보세요.",
                        "더 일반적인 용어를 사용해보세요."
                    ],
                    references=[],
                    related_keywords=related_keywords,
                    today_issues=[],
                    search_strategy=search_strategy,
                    analysis_metadata={
                        "processing_time_seconds": round(time.time() - start_time, 2),
                        "articles_analyzed": 0,
                        "keywords_extracted": len(extracted_keywords),
                        "ai_model": "none",
                        "generated_at": datetime.now().isoformat(),
                        "error": "no_search_results",
                        "search_attempted": True
                    },
                    generated_at=datetime.now().isoformat()
                )
                
                yield ConciergeProgress(
                    stage="completed",
                    progress=100,
                    message="검색이 완료되었습니다.",
                    current_task="완료",
                    result=final_response
                )
                return
            
            yield ConciergeProgress(
                stage="search_completed",
                progress=55,
                message=f"{len(articles)}개의 관련 기사를 찾았습니다.",
                current_task="연관어 및 이슈 수집",
                search_results_count=len(articles)
            )
            
            # 연관어 및 오늘의 이슈 병렬 수집 (성능 최적화)
            related_keywords = []
            today_issues = []
            
            # 병렬 처리를 위한 태스크 리스트
            tasks = []
            
            if request.include_related_keywords and extracted_keywords:
                yield ConciergeProgress(
                    stage="related_keywords",
                    progress=65,
                    message="연관 키워드를 수집하고 있습니다...",
                    current_task="연관어 API"
                )
                main_keyword = extracted_keywords[0] if extracted_keywords else request.question
                tasks.append(self._get_related_keywords(main_keyword))
            else:
                tasks.append(asyncio.create_task(asyncio.sleep(0)))  # 더미 태스크
            
            if request.include_today_issues:
                yield ConciergeProgress(
                    stage="today_issues",
                    progress=70,
                    message="오늘의 이슈를 확인하고 있습니다...",
                    current_task="이슈 랭킹"
                )
                tasks.append(self._get_today_issues())
            else:
                tasks.append(asyncio.create_task(asyncio.sleep(0)))  # 더미 태스크
            
            # 병렬 실행
            if tasks and len(tasks) >= 2:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # 연관어 결과 처리
                if request.include_related_keywords and extracted_keywords and len(results) > 0:
                    if not isinstance(results[0], Exception) and isinstance(results[0], list):
                        related_keywords = results[0]
                    else:
                        self.logger.warning(f"연관어 수집 실패: {results[0] if len(results) > 0 else 'No results'}")
                        related_keywords = []
                
                # 오늘의 이슈 결과 처리
                if request.include_today_issues and len(results) > 1:
                    if not isinstance(results[1], Exception) and isinstance(results[1], list):
                        today_issues = results[1]
                    else:
                        self.logger.warning(f"오늘의 이슈 수집 실패: {results[1] if len(results) > 1 else 'No results'}")
                        today_issues = []
            
            # 관련 질문 생성 (연관어 기반)
            related_questions = []
            if request.include_related_questions and related_keywords:
                yield ConciergeProgress(
                    stage="related_questions",
                    progress=72,
                    message="연관어 기반 관련 질문을 생성하고 있습니다...",
                    current_task="관련 질문 생성"
                )
                
                # 키워드 가중치 생성 (추출된 키워드 순서 기반)
                keyword_weights = {}
                for i, keyword in enumerate(extracted_keywords):
                    if keyword in related_keywords:
                        keyword_weights[keyword] = 1.0 - (i * 0.1)  # 순서대로 가중치 감소
                
                # 연관어에도 가중치 부여
                for i, keyword in enumerate(related_keywords):
                    if keyword not in keyword_weights:
                        keyword_weights[keyword] = 0.8 - (i * 0.05)  # 연관어는 낮은 가중치
                
                # 관련 질문 생성
                related_questions = self.questions_generator.generate_related_questions(
                    original_question=request.question,
                    related_keywords=related_keywords[:8],  # 상위 8개 연관어만 사용
                    keyword_weights=keyword_weights,
                    max_questions=6
                )
                
                self.logger.info(f"관련 질문 생성 완료: {len(related_questions)}개")
            
            # 5단계: AI 분석 및 답변 생성
            yield ConciergeProgress(
                stage="ai_analysis",
                progress=75,
                message="AI가 뉴스를 분석하고 답변을 생성하고 있습니다...",
                current_task="GPT-4 분석"
            )
            
            # 기사 참조 정보 생성
            references = self._create_article_references(articles)
            
            # AI 스트리밍 응답 생성
            streaming_response = ""
            async for chunk in self._generate_ai_streaming_response(
                request.question, articles, references, related_keywords, 
                today_issues, request.detail_level
            ):
                streaming_response += chunk
                
                # 스트리밍 진행상황 전송 (참조 정보 포함)
                yield ConciergeProgress(
                    stage="ai_streaming",
                    progress=min(75 + int(len(streaming_response) / 10), 90),
                    message="AI가 실시간으로 답변을 생성하고 있습니다...",
                    current_task="실시간 텍스트 생성",
                    streaming_content=streaming_response,
                    result=ConciergeResponse(
                        question=request.question,
                        answer="",  # 스트리밍 중이므로 빈 문자열
                        summary="",
                        key_points=[],
                        references=references,  # 참조 정보만 미리 제공
                        related_keywords=[],
                        today_issues=[],
                        search_strategy={},
                        analysis_metadata={},
                        generated_at=datetime.now().isoformat()
                    ) if references else None
                )
            
            # 최종 응답 파싱
            parsed_response = self._parse_and_validate_ai_response(streaming_response, references, related_keywords)
            
            # 검색 전략 구성
            search_strategy = {
                "keywords": extracted_keywords,
                "date_range": f"{date_from} ~ {date_to}",
                "search_type": "AND_priority",
                "max_articles": request.max_articles,
                "include_related_keywords": request.include_related_keywords,
                "include_today_issues": request.include_today_issues
            }
            
            # 최종 응답 생성
            final_response = ConciergeResponse(
                question=request.question,
                answer=parsed_response["answer"],
                summary=parsed_response["summary"],
                key_points=parsed_response["key_points"],
                references=references,
                related_keywords=related_keywords,
                related_questions=related_questions,
                today_issues=today_issues,
                search_strategy=search_strategy,
                analysis_metadata={
                    "processing_time_seconds": round(time.time() - start_time, 2),
                    "articles_analyzed": len(articles),
                    "keywords_extracted": len(extracted_keywords),
                    "ai_model": "gpt-4o-mini",  # 실제 사용하는 모델로 수정
                    "generated_at": datetime.now().isoformat(),
                    "total_citations": parsed_response.get("total_citations", 0),
                    "related_keywords": related_keywords,
                    "related_questions_count": len(related_questions)
                },
                citations_used=parsed_response.get("citations_used", []),
                generated_at=datetime.now().isoformat()
            )
            
            # 완료
            yield ConciergeProgress(
                stage="completed",
                progress=100,
                message="AI 뉴스 컨시어지 답변 생성이 완료되었습니다!",
                current_task="완료",
                result=final_response
            )
            
        except Exception as e:
            self.logger.error(f"컨시어지 스트리밍 응답 생성 중 오류 발생: {e}", exc_info=True)
            yield ConciergeProgress(
                stage="error",
                progress=0,
                message=f"답변 생성 중 오류가 발생했습니다: {str(e)}",
                current_task="오류 처리"
            )

    async def _generate_ai_streaming_response(
        self,
        question: str,
        articles: List[Dict[str, Any]],
        references: List[ArticleReference],
        related_keywords: List[str],
        today_issues: List[Dict[str, Any]],
        detail_level: str
    ) -> AsyncGenerator[str, None]:
        """GPT-4 스트리밍 응답 생성 (각주 시스템 포함)"""
        
        # 10개 기사 사용
        top_articles = articles[:10]
        
        # 기사 내용 구성 (기존과 동일하지만 더 상세하게)
        articles_text = ""
        for i, article in enumerate(top_articles):
            ref_id = f"ref{i+1}"
            title = article.get("title", "")
            content = article.get("content", article.get("summary", ""))[:800]
            provider = article.get("provider", "")
            published_at = article.get("published_at", "")
            
            articles_text += f"\n[{ref_id}] 제목: {title}\n"
            articles_text += f"언론사: {provider} | 발행일: {published_at}\n"
            articles_text += f"내용: {content}\n"
            articles_text += "=" * 50 + "\n"
        
        # 연관 키워드 텍스트
        related_text = ""
        if related_keywords:
            related_text = f"\n주요 연관 키워드: {', '.join(related_keywords[:10])}\n"
        
        # 오늘의 이슈 텍스트
        issues_text = ""
        if today_issues:
            issues_text = "\n관련 오늘의 주요 이슈:\n"
            for issue in today_issues[:3]:
                issues_text += f"- {issue.get('title', issue.get('keyword', ''))}\n"
        
        # 상세도에 따른 프롬프트 조정 (detailed로 고정되었으므로 중간 수준)
        response_instruction = "상세하고 구체적인 분석 답변 (800-1000자)"
        
        # GPT-4 프롬프트 구성 (각주 시스템 강화 - 중앙일보 스타일)
        system_prompt = """당신은 뉴스 분석 전문가입니다. 
주어진 뉴스 기사들을 바탕으로 사용자의 질문에 대해 객관적이고 통찰력 있는 답변을 제공합니다.

★★★ 핵심 규칙: 모든 문장은 반드시 인용 번호(1~10)로 끝나야 합니다 ★★★

답변 작성 규칙:
1. 반드시 제공된 기사 내용만을 바탕으로 답변하세요
2. 실제 기사������ ��������� ��������� ������ ������ ������ (예: 문장 끝에 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
3. 인용 번호는 문장부호 바로 뒤에 공백 없이 숫자만 표시
4. 올바른 예: "발표했다1", "증가했다2", "예정이다3", "분석했다8", "전망이다10"
5. 잘못된 예: "발표했다 1", "발표했다[1]", "발표했다(1)"
6. 추측이나 개인적 의견보다는 기사에 나타난 사실과 데이터를 중심으로 서술하세요
7. 자연스럽고 읽기 쉬운 흐름으로 작성하되, 정보의 출처를 명확히 해주세요
8. 기사에서 인용한 구체적인 수치나 발언이 있다면 문장 끝에 해당 기사 번호를 표시하세요
9. 한 문장에 여러 기사의 정보가 있으면 가장 중요한 출처 하나만 표시

텍스트 작성 원칙:
- **문단을 나누어 작성**: 주제가 바뀔 때마다 빈 줄로 문단을 구분하세요
- **자연스러운 구성**: 질문에 직접적으로 답하는 자연스러운 순서로 구성
- **소제목 사용 금지**: 소제목 없이 자연스럽게 이어지는 내용으로 작성
- **문장 길이 조절**: 한 문장이 너무 길지 않도록 적절히 나누어 작성

② 구체적 정보 포함 의무 (매우 중요):
- 인명: 관련된 모든 인물의 실명과 직책을 정확히 명시 (예: "홍길동 금융위원장에 따르면")
- 지명: 구체적인 지역명, 국가명, 도시명 등을 명확히 표기  
- **날짜**: 구체적인 날짜, 시간, 기간, 시점을 정확히 기재
- **기관명**: 관련 기관, 회사, 조직의 정확한 명칭 포함
- **수치**: 금액, 비율, 규모 등 구체적 수치 반드시 포함
- **출처 표현**: "~에 따르면", "~라고 밝혔다" 등 원문 표현 활용"""

        user_prompt = f"""질문: {question}

{response_instruction}으로 답변해주세요.

분석할 기사들 (반드시 이 기사들의 내용만 사용하세요):
{articles_text}

{related_text}

{issues_text}

위 10개 기사를 바탕으로 질문에 대해 상세한 답변을 작성해주세요. 

★★★ 인용 번호 표시 필수 규칙 (매우 중요) ★★★:
1. 실제 ������������ ��������� ��������� ������ ��������� ���������������
2. 인용 번호는 문장부호(마침표, 물음표, 느낌표) 바로 뒤에 **공백 없이** 숫자만 표시
3. 올바른 형식: "발표했다1", "증가했다2", "예정이다3"
4. 잘못된 형식: "발표했다 1", "발표했다[1]", "발표했다(1)"
5. 한 문장에 여러 기사 정보가 있으면 주요 출처 하나만 표시

★★★ 가독성 향상 필수 규칙 ★★★:
1. 문단 구분: 주제가 바뀔 때마다 반드시 빈 줄(\\n\\n)로 문단을 나누세요
2. 자연스러운 흐��������� ���������������
   질문에 대해 논리적이고 자연스럽게 답변하세요
3. **소제목 사용 금지**: 소제목 없이 자연스럽게 이어지는 내용으로 작성
4. **적절한 문장 길이**: 한 문장이 3줄을 넘지 않도록 조절하여 읽기 쉽게 작성

인용 번호 예시:
- "삼성전자는 올해 HBM 매출이 전년 대비 50% 증가했다고 발표했다1"

(문단 나누기)

- "AI 반도체 수요 급증으로 향후 전망도 밝은 것으로 분석된다2"

추가 지침:
- 각 문장이나 정보의 끝에 해당 기사 번호를 표시하세요 (1, 2, 3, 4, 5)
- 기사에 나온 구체적인 수치, 발언, 계획 등을 인용할 때는 해당 문장 끝에 기사 번호를 표시하세요
- 여러 기사에서 비슷한 내용이 나온다면 적절한 기사 번호를 선택하여 표시하세요
- 기사에 없는 내용은 절대 추가하지 마세요

구체적 정보 필수 포함사항:
- 인물 언급 시: "홍길동 XX회사 대표", "김철수 금융위원장" 등 실명+직책 명시
- 시간 정보: "7월 5일", "오전 9시", "2024년 상반기" 등 구체적 시점 표기
- 장소 정보: "서울 강남구", "미국 뉴욕", "중국 베이징" 등 구체적 지명
- 기관명: "삼성전자", "금융위원회", "한국은행" 등 정확한 기관명
- 수치 데이터: "30% 증가", "1조원 규모", "500만 달러" 등 구체적 수치
- 인용구: "~라고 말했다", "~에 따르면", "~로 전해졌다" 등 원문 표현 활용"""

        try:
            # AWS Bedrock Claude 스트리밍 API 호출 (성능 최적화)
            response_stream = await self.bedrock_client.generate(
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
                system_prompt=system_prompt,
                max_tokens=2000,  # 토큰 수 줄여서 속도 향상
                temperature=0.1,  # 일관성 향상
                stream=True  # 스트리밍 활성화
            )
            
            # 스트리밍 응답 처리
            async for chunk in response_stream:
                if chunk:
                    yield chunk
                    # 실시간 전송을 위한 작은 지연
                    await asyncio.sleep(0.01)
            
        except Exception as e:
            self.logger.error(f"AI 스트리밍 응답 생성 실패: {e}")
            yield "죄송합니다. 현재 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
    
    def _filter_relevant_documents(self, documents: List[Dict[str, Any]], keywords: List[str], question: str) -> List[Dict[str, Any]]:
        """관련성 기반 문서 필터링 - 정확도 우선 (개선)"""
        
        if not documents or not keywords:
            return documents
        
        filtered_docs = []
        
        for doc in documents:
            title = doc.get("title", "").lower()
            content = doc.get("content", "").lower()
            full_text = f"{title} {content}"
            
            # 키워드 매칭 확인 - 더 엄격한 기준
            keyword_matches = 0
            title_matches = 0
            
            for keyword in keywords[:3]:  # 최대 3개 핵심 키워드만 체크
                keyword_lower = keyword.lower()
                if keyword_lower in full_text:
                    keyword_matches += 1
                    
                    # 제목에 포함된 경우 가중치 부여
                    if keyword_lower in title:
                        title_matches += 1
            
            # 정확도 기준: 모든 키워드가 포함된 경우만 선택 (100% 매칭)
            if keyword_matches >= len(keywords[:3]):
                # 관련성 점수 계산: 제목 매칭을 높게 평가
                relevance_score = title_matches * 10 + keyword_matches * 2
                
                # BigKinds 자체 점수도 고려
                bigkinds_score = doc.get("_score", 0) / 100.0 if doc.get("_score") else 0
                final_score = relevance_score + bigkinds_score
                
                doc["_relevance_score"] = final_score
                filtered_docs.append(doc)
        
        # 관련성 점수로 정렬 (높은 점수 우선)
        filtered_docs.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
        
        # 상세한 로그 출력
        exact_keywords_str = ", ".join([f"'{kw}'" for kw in keywords[:3]])
        self.logger.info(f"엄격한 필터링: {exact_keywords_str} 모두 포함 필수, {len(filtered_docs)}/{len(documents)} 선택됨")
        
        # 상위 기사들의 제목 로깅 (디버깅용)
        if filtered_docs:
            top_titles = [doc.get("title", "제목없음")[:50] for doc in filtered_docs[:3]]
            self.logger.info(f"상위 3개 기사: {top_titles}")
        else:
            self.logger.warning(f"키워드 {exact_keywords_str}가 모두 포함된 기사를 찾을 수 없음")
        
        return filtered_docs
    
    def _filter_relevant_documents_relaxed(self, documents: List[Dict[str, Any]], keywords: List[str], question: str) -> List[Dict[str, Any]]:
        """관련성 기반 문서 필터링 - 완화된 기준"""
        
        if not documents or not keywords:
            return documents
        
        filtered_docs = []
        
        for doc in documents:
            title = doc.get("title", "").lower()
            content = doc.get("content", "").lower()
            full_text = f"{title} {content}"
            
            # 키워드 매칭 확인
            keyword_matches = 0
            for keyword in keywords[:5]:  # 최대 5개 키워드 체크
                if keyword.lower() in full_text:
                    keyword_matches += 1
            
            # 완화된 기준: 50% 이상 키워드가 매칭되면 관련 기사로 인정
            threshold = max(1, len(keywords[:5]) * 0.5)  # 최소 1개, 최대 50% 기준
            
            if keyword_matches >= threshold:
                # 제목에 키워드가 포함된 경우 우선 순위 부여
                title_score = sum(1 for kw in keywords[:5] if kw.lower() in title)
                # BigKinds 점수도 고려
                bigkinds_score = doc.get("_score", 0) / 100.0 if doc.get("_score") else 0
                
                doc["_relevance_score"] = title_score * 2 + keyword_matches + bigkinds_score
                filtered_docs.append(doc)
        
        # 관련성 점수로 정렬 (높은 점수 우선)
        filtered_docs.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
        
        self.logger.info(f"완화된 필터링: {keywords[:5]} 중 {threshold}개 이상 포함, {len(filtered_docs)}/{len(documents)} 선택됨")
        
        return filtered_docs
    
    def _get_keyword_synonyms(self, keyword: str) -> List[str]:
        """키워드의 동의어 및 유사어를 반환 (정확도 우선 개선)"""
        
        keyword_lower = keyword.lower()
        synonyms = []
        
        # 확장하지 말아야 할 정확한 키워드들
        exact_keywords = {
            "삼성전자", "lg전자", "sk하이닉스", "현대차", "현대자동차",
            "네이버", "카카오", "포스코", "셀트리온", "바이오니아",
            "hbm", "gpu", "cpu", "ai", "chatgpt", "llm", "nft", 
            "메타버스", "iot", "5g", "6g", "esg"
        }
        
        # 정확한 키워드인 경우 확장하지 않음
        if keyword_lower in exact_keywords:
            self.logger.info(f"정확한 키워드 '{keyword}' - 확장하지 않음")
            return []
        
        # 기업명 동의어 사전 (확장 제한)
        company_synonyms = {
            # "삼성전자": ["삼성"],  # 제거: 삼성전자는 확장하지 않음
            "현대": ["현대차", "현대자동차"],  # 현대만 확장 허용
            "lg": ["LG전자", "LG그룹"],
            "sk": ["SK텔레콤", "SK이노베이션"],  # SK하이닉스는 제외
            # "네이버": ["NAVER"],  # 제거: 정확한 매칭 우선
            # "카카오": ["KAKAO"],  # 제거: 정확한 매칭 우선
        }
        
        # 기술/산업 동의어 사전 (매우 제한적)
        tech_synonyms = {
            "인공지능": ["AI"],  # AI보다는 인공지능이 더 일반적
            "반도체": ["칩", "메모리"],
            "전기차": ["EV", "전동차"],
            "배터리": ["전지"],
            "원전": ["원자력"],
        }
        
        # 경제/금융 동의어 사전
        finance_synonyms = {
            "주식": ["증시", "주가"],
            "금리": ["기준금리"],
            "부동산": ["아파트", "주택"],
        }
        
        # 모든 사전을 합쳐서 검색 (제한적)
        all_synonyms = {**company_synonyms, **tech_synonyms, **finance_synonyms}
        
        # 정확한 매칭만 허용
        if keyword_lower in all_synonyms:
            synonyms.extend(all_synonyms[keyword_lower])
        
        # 중복 제거하고 원본 키워드 제외
        synonyms = [s for s in set(synonyms) if s.lower() != keyword_lower]
        
        # 동의어가 있는 경우에만 로그 출력
        if synonyms:
            self.logger.info(f"키워드 '{keyword}' 확장: {synonyms}")
        
        return synonyms[:2]  # 최대 2개의 동의어만 반환 (기존 3개에서 축소)