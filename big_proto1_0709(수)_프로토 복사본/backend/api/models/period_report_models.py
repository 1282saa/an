"""
뉴스 인사이트 시스템 - 통합 코드
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# =========================================================
# 기본 열거형
# =========================================================

class PeriodReportType(str, Enum):
    """기간별 레포트 타입"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class InsightSeverity(str, Enum):
    """인사이트 중요도"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InsightType(str, Enum):
    """인사이트 유형"""
    TREND = "trend"                  # 시간에 따른 패턴
    ANOMALY = "anomaly"              # 이상 징후
    CORRELATION = "correlation"      # 상관관계
    PREDICTION = "prediction"        # 예측
    COMPARISON = "comparison"        # 비교
    OPPORTUNITY = "opportunity"      # 기회 요소
    RISK = "risk"                    # 위험 요소
    CONTEXT = "context"              # 맥락 정보

class TimeFrame(str, Enum):
    """시간 프레임"""
    IMMEDIATE = "immediate"          # 즉시
    SHORT_TERM = "short_term"        # 단기
    MEDIUM_TERM = "medium_term"      # 중기
    LONG_TERM = "long_term"          # 장기

class DetailLevel(str, Enum):
    """상세 수준"""
    BRIEF = "brief"                  # 간략함
    BALANCED = "balanced"            # 균형잡힘
    DETAILED = "detailed"            # 상세함

class Industry(str, Enum):
    """산업 분류"""
    FINANCE = "finance"
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    ENERGY = "energy"
    MEDIA = "media"
    GOVERNMENT = "government"

class DeliveryChannel(str, Enum):
    """전달 채널"""
    EMAIL = "email"
    DASHBOARD = "dashboard"
    MOBILE_APP = "mobile_app"
    SLACK = "slack"
    MS_TEAMS = "ms_teams"
    API = "api"

class SharingPermission(str, Enum):
    """공유 권한"""
    VIEW = "view"
    COMMENT = "comment"
    EDIT = "edit"
    SHARE = "share"

# =========================================================
# 요청 모델
# =========================================================

class AutoReportRequest(BaseModel):
    """자동 레포트 생성 요청"""
    report_type: PeriodReportType = Field(..., description="레포트 타입")
    company_name: Optional[str] = Field(None, description="특정 기업명 (종목별 레포트인 경우)")
    company_code: Optional[str] = Field(None, description="특정 기업 코드 (종목별 레포트인 경우)")
    target_date: Optional[str] = Field(None, description="기준일 (YYYY-MM-DD), 미지정시 어제/지난주/지난달 등")
    categories: List[str] = Field(default=["정치", "경제", "사회", "기술", "문화"], description="분석할 뉴스 카테고리")
    max_articles: int = Field(default=100, description="분석할 최대 기사 수", ge=10, le=2000)
    include_sentiment: bool = Field(default=True, description="감정 분석 포함 여부")
    include_keywords: bool = Field(default=True, description="키워드 분석 포함 여부")
    language: str = Field(default="ko", description="레포트 언어")
    detail_level: DetailLevel = Field(default=DetailLevel.BALANCED, description="상세 수준")
    
    @validator('target_date')
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Invalid date format. Please use YYYY-MM-DD')
        return v

class UserInterest(BaseModel):
    """사용자 관심사"""
    category: str = Field(..., description="관심 카테고리")
    priority: int = Field(..., description="우선순위 (1-10)", ge=1, le=10)
    specific_topics: List[str] = Field(default=[], description="특정 토픽")
    excluded_topics: List[str] = Field(default=[], description="제외할 토픽")
    keywords: List[str] = Field(default=[], description="키워드")

class UserPreferences(BaseModel):
    """사용자 선호도"""
    interests: List[UserInterest] = Field(default=[], description="관심사")
    preferred_insight_types: List[InsightType] = Field(default=[], description="선호하는 인사이트 유형")
    minimum_confidence: float = Field(default=0.6, description="최소 신뢰도", ge=0, le=1)
    preferred_visualization_types: List[str] = Field(default=[], description="선호하는 시각화 유형")
    language: str = Field(default="ko", description="선호 언어")
    detail_level: DetailLevel = Field(default=DetailLevel.BALANCED, description="상세 수준")
    delivery_preferences: Dict[DeliveryChannel, Dict[str, Any]] = Field(default_factory=dict, description="전달 선호도")

class PersonalizedReportRequest(AutoReportRequest):
    """개인화된 레포트 요청"""
    user_id: str = Field(..., description="사용자 ID")
    user_preferences: Optional[UserPreferences] = Field(None, description="사용자 선호도")
    custom_metrics: Optional[List[str]] = Field(None, description="커스텀 측정 지표")
    alert_thresholds: Optional[Dict[str, float]] = Field(None, description="알림 임계값")
    competitors: Optional[List[str]] = Field(None, description="경쟁사 목록")
    include_historical_comparison: bool = Field(default=True, description="과거 데이터 비교 포함 여부")
    include_actionable_insights: bool = Field(default=True, description="실행 가능한 인사이트 포함 여부")

# =========================================================
# 뉴스 및 클러스터 모델
# =========================================================

class NewsArticle(BaseModel):
    """뉴스 기사"""
    id: str = Field(..., description="기사 ID")
    title: str = Field(..., description="기사 제목")
    content: str = Field(..., description="기사 내용")
    url: str = Field(..., description="기사 URL")
    source: str = Field(..., description="출처")
    published_at: str = Field(..., description="발행 시간")
    categories: List[str] = Field(default=[], description="카테고리")
    keywords: List[str] = Field(default=[], description="키워드")
    sentiment_score: Optional[float] = Field(None, description="감정 점수 (-1 ~ 1)")
    entities: Dict[str, List[str]] = Field(default_factory=dict, description="추출된 개체명")

class NewsCluster(BaseModel):
    """뉴스 클러스터 (유사한 뉴스들의 그룹)"""
    id: str = Field(..., description="클러스터 ID")
    title: str = Field(..., description="클러스터 대표 제목")
    articles_count: int = Field(..., description="포함된 기사 수")
    representative_article_id: str = Field(..., description="대표 기사 ID")
    article_ids: List[str] = Field(..., description="포함된 기사 ID 목록")
    keywords: List[str] = Field(default=[], description="클러스터 키워드")
    categories: List[str] = Field(default=[], description="관련 카테고리")
    sentiment_score: Optional[float] = Field(None, description="감정 점수 (-1 ~ 1)")
    impact_score: Optional[float] = Field(None, description="사회적 영향도 점수", ge=0, le=1)
    trending_score: Optional[float] = Field(None, description="트렌딩 점수", ge=0, le=1)
    summary: str = Field(..., description="클러스터 요약")

# =========================================================
# 인사이트 모델
# =========================================================

class EnhancedPeriodInsight(BaseModel):
    """강화된 기간별 인사이트"""
    id: str = Field(..., description="인사이트 ID")
    type: InsightType = Field(..., description="인사이트 유형")
    title: str = Field(..., description="인사이트 제목")
    summary: str = Field(..., description="짧은 요약 (1-2 문장)")
    description: str = Field(..., description="상세 설명")
    
    # 인사이트 신뢰성과 중요도
    confidence: float = Field(..., description="신뢰도 (0-1)", ge=0, le=1)
    severity: InsightSeverity = Field(..., description="중요도")
    
    # 데이터 근거
    supporting_data: Dict[str, Any] = Field(default_factory=dict, description="인사이트를 뒷받침하는 데이터")
    supporting_clusters: List[str] = Field(default=[], description="관련 클러스터 ID들")
    
    # 시각적 요소 관련 정보
    visualization_type: Optional[str] = Field(None, description="권장 시각화 유형 (line_chart, bar_chart 등)")
    visualization_data: Optional[Dict[str, Any]] = Field(None, description="시각화용 데이터")
    
    # 실행 가능한 인사이트
    actionable_steps: List[str] = Field(default=[], description="실행 가능한 조치")
    related_insights: List[str] = Field(default=[], description="관련 인사이트 ID")
    
    # 시간적 정보
    temporal_relevance: Optional[TimeFrame] = Field(None, description="시간적 연관성")
    
    # 소스 추적성
    sources: List[Dict[str, Any]] = Field(default=[], description="출처 정보")

class InsightQualityMetrics(BaseModel):
    """인사이트 품질 지표"""
    uniqueness_score: float = Field(..., description="고유성 점수 (0-1)", ge=0, le=1)
    actionability_score: float = Field(..., description="실행 가능성 점수 (0-1)", ge=0, le=1)
    relevance_score: float = Field(..., description="관련성 점수 (0-1)", ge=0, le=1)
    depth_score: float = Field(..., description="심층성 점수 (0-1)", ge=0, le=1)
    timeliness_score: float = Field(..., description="적시성 점수 (0-1)", ge=0, le=1)
    overall_quality_score: float = Field(..., description="종합 품질 점수 (0-1)", ge=0, le=1)
    feedback_count: int = Field(default=0, description="사용자 피드백 수")
    positive_feedback_ratio: Optional[float] = Field(None, description="긍정적 피드백 비율", ge=0, le=1)

class CategorySummary(BaseModel):
    """카테고리별 요약"""
    category: str = Field(..., description="카테고리명")
    total_articles: int = Field(..., description="총 기사 수")
    top_clusters: List[NewsCluster] = Field(..., description="주요 클러스터들")
    key_developments: List[str] = Field(default=[], description="주요 발전사항")
    sentiment_trend: Optional[str] = Field(None, description="감정 트렌드 (positive/negative/neutral)")
    emerging_topics: List[str] = Field(default=[], description="새롭게 부상하는 토픽")
    key_entities: Dict[str, int] = Field(default_factory=dict, description="주요 개체명과 언급 횟수")
    insights: List[str] = Field(default=[], description="관련 인사이트 ID")

class TimelineEvent(BaseModel):
    """타임라인 이벤트"""
    id: str = Field(..., description="이벤트 ID")
    date: str = Field(..., description="날짜")
    title: str = Field(..., description="이벤트 제목")
    description: str = Field(..., description="이벤트 설명")
    importance: int = Field(..., description="중요도 (1-5)", ge=1, le=5)
    related_cluster_ids: List[str] = Field(default=[], description="관련 클러스터 ID들")
    category: str = Field(..., description="카테고리")
    impact_areas: List[str] = Field(default=[], description="영향 영역")

# =========================================================
# 컨텍스트 및 비교 모델
# =========================================================

class HistoricalContext(BaseModel):
    """과거 맥락 정보"""
    period: str = Field(..., description="관련 기간 (예: '2023년 2분기')")
    summary: str = Field(..., description="과거 상황 요약")
    key_metrics: Dict[str, Any] = Field(default_factory=dict, description="주요 지표")
    relevant_events: List[str] = Field(default=[], description="관련 이벤트")
    trend_data: Dict[str, List[Any]] = Field(default_factory=dict, description="추세 데이터")

class CompetitiveContext(BaseModel):
    """경쟁 환경 맥락"""
    competitors: List[str] = Field(default=[], description="주요 경쟁사")
    market_position: Optional[str] = Field(None, description="시장 포지션")
    competitive_advantages: List[str] = Field(default=[], description="경쟁 우위 요소")
    threats: List[str] = Field(default=[], description="위협 요소")
    competitor_activities: Dict[str, List[str]] = Field(default_factory=dict, description="경쟁사 활동")
    market_share_data: Optional[Dict[str, float]] = Field(None, description="시장 점유율 데이터")

class MetricChange(BaseModel):
    """지표 변화"""
    metric_name: str = Field(..., description="지표명")
    previous_value: Any = Field(..., description="이전 값")
    current_value: Any = Field(..., description="현재 값")
    percentage_change: Optional[float] = Field(None, description="변화율 (%)")
    trend_direction: str = Field(..., description="증가/감소/유지")
    significance: Optional[str] = Field(None, description="변화의 중요성 평가")

class CategoryComparison(BaseModel):
    """카테고리별 비교"""
    category: str = Field(..., description="카테고리")
    article_count_change: MetricChange = Field(..., description="기사 수 변화")
    sentiment_change: Optional[MetricChange] = Field(None, description="감정 점수 변화")
    key_metric_changes: List[MetricChange] = Field(default=[], description="주요 지표 변화")
    emerging_topics: List[str] = Field(default=[], description="새롭게 등장한 토픽")
    declining_topics: List[str] = Field(default=[], description="감소 중인 토픽")

class EnhancedComparison(BaseModel):
    """강화된 비교 분석"""
    previous_period: str = Field(..., description="이전 기간")
    current_period: str = Field(..., description="현재 기간")
    overall_trend: str = Field(..., description="전체 트렌드 요약")
    category_comparisons: List[CategoryComparison] = Field(..., description="카테고리별 비교")
    key_shifts: List[str] = Field(default=[], description="주요 변화")
    notable_developments: List[str] = Field(default=[], description="주목할 발전")

# =========================================================
# 실행 가능한 인사이트 모델
# =========================================================

class ActionItem(BaseModel):
    """실행 항목"""
    id: str = Field(..., description="실행 항목 ID")
    title: str = Field(..., description="제목")
    description: str = Field(..., description="설명")
    priority: int = Field(..., description="우선순위 (1-5)", ge=1, le=5)
    estimated_impact: str = Field(..., description="예상 영향")
    difficulty: int = Field(..., description="실행 난이도 (1-5)", ge=1, le=5)
    timeframe: TimeFrame = Field(..., description="실행 시간 프레임")
    prerequisites: List[str] = Field(default=[], description="선행 조건")
    next_steps: List[str] = Field(default=[], description="다음 단계")
    resources_needed: Optional[Dict[str, Any]] = Field(None, description="필요 자원")
    related_insights: List[str] = Field(default=[], description="관련 인사이트 ID")

class ActionableInsights(BaseModel):
    """실행 가능한 인사이트 모음"""
    strategic_actions: List[ActionItem] = Field(default=[], description="전략적 행동")
    tactical_actions: List[ActionItem] = Field(default=[], description="전술적 행동")
    monitoring_actions: List[ActionItem] = Field(default=[], description="모니터링 행동")
    response_actions: List[ActionItem] = Field(default=[], description="대응 행동")
    summary: str = Field(..., description="실행 요약")

# =========================================================
# 시각화 및 대시보드 모델
# =========================================================

class VisualizationData(BaseModel):
    """시각화 데이터"""
    type: str = Field(..., description="시각화 유형 (line_chart, bar_chart, heat_map 등)")
    title: str = Field(..., description="시각화 제목")
    description: str = Field(..., description="시각화 설명")
    data: Dict[str, Any] = Field(..., description="시각화 데이터")
    settings: Dict[str, Any] = Field(default_factory=dict, description="시각화 설정")
    interactive: bool = Field(default=True, description="상호작용 가능 여부")

class DashboardElement(BaseModel):
    """대시보드 요소"""
    id: str = Field(..., description="요소 ID")
    title: str = Field(..., description="요소 제목")
    type: str = Field(..., description="요소 유형 (chart, table, kpi, summary 등)")
    position: Dict[str, int] = Field(..., description="위치 정보 (x, y, width, height)")
    data_source: str = Field(..., description="데이터 소스 (인사이트 ID, 클러스터 ID 등)")
    visualization: Optional[VisualizationData] = Field(None, description="시각화 데이터")
    settings: Dict[str, Any] = Field(default_factory=dict, description="요소 설정")

# =========================================================
# 알림 및 모니터링 모델
# =========================================================

class AlertCondition(BaseModel):
    """알림 조건"""
    metric: str = Field(..., description="측정 지표")
    operator: str = Field(..., description="연산자 (>, <, =, !=)")
    threshold: Any = Field(..., description="임계값")
    description: str = Field(..., description="조건 설명")

class AlertConfig(BaseModel):
    """알림 설정"""
    id: str = Field(..., description="알림 ID")
    name: str = Field(..., description="알림 이름")
    description: str = Field(..., description="알림 설명")
    conditions: List[AlertCondition] = Field(..., description="알림 조건")
    severity: str = Field(..., description="심각도 (low, medium, high, critical)")
    channels: List[str] = Field(..., description="알림 채널 (email, sms, push 등)")
    cooldown_minutes: int = Field(default=60, description="재알림 대기 시간 (분)")

# =========================================================
# 산업별 특화 인사이트 모델
# =========================================================

class IndustrySpecificMetric(BaseModel):
    """산업별 특화 지표"""
    industry: Industry = Field(..., description="산업")
    metric_name: str = Field(..., description="지표명")
    metric_value: Any = Field(..., description="지표값")
    unit: Optional[str] = Field(None, description="단위")
    benchmark: Optional[Any] = Field(None, description="벤치마크")
    trend: Optional[str] = Field(None, description="추세")
    source: Optional[str] = Field(None, description="출처")

class IndustrySpecificInsight(BaseModel):
    """산업별 특화 인사이트"""
    insight_id: str = Field(..., description="인사이트 ID")
    industry: Industry = Field(..., description="산업")
    title: str = Field(..., description="제목")
    summary: str = Field(..., description="요약")
    description: str = Field(..., description="설명")
    industry_context: str = Field(..., description="산업 맥락")
    key_metrics: List[IndustrySpecificMetric] = Field(..., description="주요 지표")
    regulatory_impact: Optional[str] = Field(None, description="규제 영향")
    competitive_implications: Optional[str] = Field(None, description="경쟁 영향")
    strategic_recommendations: List[str] = Field(default=[], description="전략적 권장사항")

# =========================================================
# 관계 및 네트워크 모델
# =========================================================

class EntityRelationship(BaseModel):
    """개체 간 관계"""
    source_entity: str = Field(..., description="출발 개체")
    source_type: str = Field(..., description="출발 개체 유형")
    relationship_type: str = Field(..., description="관계 유형")
    target_entity: str = Field(..., description="도착 개체")
    target_type: str = Field(..., description="도착 개체 유형")
    confidence: float = Field(..., description="신뢰도 (0-1)", ge=0, le=1)
    supporting_articles: List[str] = Field(default=[], description="근거 기사 ID")
    first_mentioned: Optional[str] = Field(None, description="최초 언급 시간")
    last_mentioned: Optional[str] = Field(None, description="최근 언급 시간")

class SemanticNetwork(BaseModel):
    """시맨틱 네트워크"""
    network_id: str = Field(..., description="네트워크 ID")
    entities: Dict[str, Dict[str, Any]] = Field(..., description="개체 정보")
    relationships: List[EntityRelationship] = Field(..., description="관계 정보")
    clusters: Dict[str, List[str]] = Field(default_factory=dict, description="개체 클러스터")
    central_entities: List[str] = Field(default=[], description="중심 개체")
    network_metrics: Dict[str, Any] = Field(default_factory=dict, description="네트워크 지표")

# =========================================================
# 스토리텔링 및 내러티브 모델
# =========================================================

class InsightStoryElement(BaseModel):
    """인사이트 스토리 요소"""
    element_id: str = Field(..., description="요소 ID")
    element_type: str = Field(..., description="요소 유형 (headline, narrative, data_point, visualization, quote)")
    content: str = Field(..., description="내용")
    position: int = Field(..., description="위치 순서")
    emphasis: Optional[str] = Field(None, description="강조 수준 (normal, highlighted, critical)")

class InsightNarrative(BaseModel):
    """인사이트 내러티브"""
    narrative_id: str = Field(..., description="내러티브 ID")
    title: str = Field(..., description="제목")
    summary: str = Field(..., description="요약")
    elements: List[InsightStoryElement] = Field(..., description="스토리 요소")
    related_insights: List[str] = Field(default=[], description="관련 인사이트 ID")
    theme: Optional[str] = Field(None, description="주제")
    narrative_style: str = Field(default="analytical", description="서술 스타일 (analytical, descriptive, prescriptive)")

# =========================================================
# 예측 및 시나리오 모델
# =========================================================

class PredictionMethod(str, Enum):
    """예측 방법"""
    TIME_SERIES = "time_series"
    REGRESSION = "regression"
    CLASSIFICATION = "classification"
    ENSEMBLE = "ensemble"
    MACHINE_LEARNING = "machine_learning"
    EXPERT_BASED = "expert_based"

class PredictiveInsight(BaseModel):
    """예측 인사이트"""
    insight_id: str = Field(..., description="인사이트 ID")
    title: str = Field(..., description="제목")
    prediction_target: str = Field(..., description="예측 대상")
    prediction_horizon: str = Field(..., description="예측 기간")
    prediction_method: PredictionMethod = Field(..., description="예측 방법")
    confidence_level: float = Field(..., description="신뢰 수준 (0-1)", ge=0, le=1)
    prediction_result: Any = Field(..., description="예측 결과")
    supporting_data: Dict[str, Any] = Field(..., description="근거 데이터")
    assumptions: List[str] = Field(..., description="가정 사항")
    limitations: List[str] = Field(default=[], description="한계점")

class ScenarioAnalysis(BaseModel):
    """시나리오 분석"""
    analysis_id: str = Field(..., description="분석 ID")
    title: str = Field(..., description="제목")
    description: str = Field(..., description="설명")
    base_scenario: Dict[str, Any] = Field(..., description="기본 시나리오")
    alternative_scenarios: List[Dict[str, Any]] = Field(..., description="대안 시나리오")
    key_drivers: List[str] = Field(..., description="주요 동인")
    impact_dimensions: List[str] = Field(..., description="영향 차원")
    comparison_metrics: Dict[str, List[float]] = Field(..., description="비교 지표")
    most_likely_scenario: str = Field(..., description="가장 가능성 높은 시나리오")
    recommendations: Dict[str, List[str]] = Field(..., description="시나리오별 권장사항")

# =========================================================
# 협업 및 공유 모델
# =========================================================

class InsightComment(BaseModel):
    """인사이트 댓글"""
    comment_id: str = Field(..., description="댓글 ID")
    insight_id: str = Field(..., description="인사이트 ID")
    user_id: str = Field(..., description="사용자 ID")
    content: str = Field(..., description="내용")
    created_at: str = Field(..., description="생성 시간")
    parent_comment_id: Optional[str] = Field(None, description="부모 댓글 ID")
    attachments: List[Dict[str, Any]] = Field(default=[], description="첨부 파일")
    reactions: Dict[str, int] = Field(default_factory=dict, description="반응 (이모티콘: 개수)")

class CollaborativeInsightCollection(BaseModel):
    """협업 인사이트 컬렉션"""
    collection_id: str = Field(..., description="컬렉션 ID")
    name: str = Field(..., description="이름")
    description: str = Field(..., description="설명")
    created_by: str = Field(..., description="생성자 ID")
    created_at: str = Field(..., description="생성 시간")
    insights: List[str] = Field(..., description="포함된 인사이트 ID")
    collaborators: Dict[str, List[SharingPermission]] = Field(..., description="협업자 및 권한")
    tags: List[str] = Field(default=[], description="태그")
    is_public: bool = Field(default=False, description="공개 여부")
    views: int = Field(default=0, description="조회수")
    last_updated: str = Field(..., description="최근 업데이트")

# =========================================================
# 최종 레포트 모델
# =========================================================

class EnhancedPeriodReport(BaseModel):
    """강화된 기간별 레포트"""
    id: str = Field(..., description="레포트 ID")
    report_type: PeriodReportType = Field(..., description="레포트 타입")
    company_name: Optional[str] = Field(None, description="분석 대상 기업명")
    company_code: Optional[str] = Field(None, description="분석 대상 기업 코드")
    period_start: str = Field(..., description="분석 기간 시작")
    period_end: str = Field(..., description="분석 기간 종료")
    generated_at: str = Field(..., description="생성 시간")
    
    # 메타데이터
    total_articles_analyzed: int = Field(..., description="분석된 총 기사 수")
    categories_covered: List[str] = Field(..., description="다룬 카테고리들")
    analysis_duration_seconds: float = Field(..., description="분석 소요 시간")
    
    # 핵심 내용
    executive_summary: str = Field(..., description="경영진 요약")
    key_highlights: List[str] = Field(..., description="핵심 하이라이트")
    
    # 상세 분석
    category_summaries: List[CategorySummary] = Field(..., description="카테고리별 요약")
    timeline: List[TimelineEvent] = Field(..., description="주요 이벤트 타임라인")
    insights: List[EnhancedPeriodInsight] = Field(..., description="기간별 인사이트")
    
    # 통계 및 분석
    top_keywords: List[Dict[str, Any]] = Field(default=[], description="상위 키워드")
    sentiment_analysis: Dict[str, Any] = Field(default_factory=dict, description="전체 감정 분석")
    trend_analysis: Dict[str, Any] = Field(default_factory=dict, description="트렌드 분석")
    
    # 강화된 컨텍스트 및 비교
    historical_context: Optional[HistoricalContext] = Field(None, description="과거 맥락 정보")
    competitive_context: Optional[CompetitiveContext] = Field(None, description="경쟁 환경 맥락")
    industry_trends: Dict[str, Any] = Field(default_factory=dict, description="산업 트렌드")
    comparison: Optional[EnhancedComparison] = Field(None, description="이전 기간 대비 변화")
    
    # 실행 가능한 인사이트
    actionable_intelligence: Optional[ActionableInsights] = Field(None, description="실행 가능한 인사이트")
    
    # 미래 전망
    future_outlook: Dict[str, Any] = Field(default_factory=dict, description="향후 전망")
    
    # 시맨틱 네트워크 및 관계 분석
    entity_network: Optional[SemanticNetwork] = Field(None, description="개체 네트워크")
    
    # 스토리텔링 및 내러티브
    narratives: List[InsightNarrative] = Field(default=[], description="인사이트 내러티브")
    
    # 예측 및 시나리오
    predictive_insights: List[PredictiveInsight] = Field(default=[], description="예측 인사이트")
    scenario_analyses: List[ScenarioAnalysis] = Field(default=[], description="시나리오 분석")
    
    # 산업별 특화 인사이트
    industry_specific_insights: List[IndustrySpecificInsight] = Field(default=[], description="산업별 특화 인사이트")
    
    # 시각화 및 대시보드
    visualizations: List[VisualizationData] = Field(default=[], description="시각화")
    dashboard_config: List[DashboardElement] = Field(default=[], description="대시보드 구성")
    
    # 사용자 피드백 및 협업
    user_comments: List[InsightComment] = Field(default=[], description="사용자 댓글")
    collections: List[str] = Field(default=[], description="포함된 컬렉션 ID")
    
    # 개인화 정보
    user_id: Optional[str] = Field(None, description="사용자 ID (개인화된 레포트인 경우)")
    personalization_level: Optional[str] = Field(None, description="개인화 수준")

# =========================================================
# 레포트 템플릿 정의
# =========================================================

ENHANCED_PERIOD_REPORT_TEMPLATES = {
    PeriodReportType.DAILY: {
        "name": "일간 뉴스 브리핑",
        "description": "어제 하루 동안의 주요 뉴스를 분석한 일일 브리핑",
        "sections": [
            "오늘의 핵심 이슈",
            "정치 주요 동향", 
            "경제 핵심 뉴스",
            "사회 이슈 분석",
            "국제 뉴스 요약",
            "기술 및 혁신 소식",
            "실행 가능한 인사이트",
            "내일 주목할 이슈"
        ],
        "max_articles": 150,
        "focus": "즉시성과 중요도",
        "visualization_priority": ["timeline", "bar_chart", "word_cloud"],
        "insight_types_priority": [
            InsightType.ANOMALY,
            InsightType.OPPORTUNITY,
            InsightType.RISK
        ]
    },
    
    PeriodReportType.WEEKLY: {
        "name": "주간 뉴스 리뷰",
        "description": "지난 일주일간의 뉴스를 종합 분석한 주간 리포트", 
        "sections": [
            "주간 하이라이트",
            "정치 주요 이슈",
            "경제 동향 분석", 
            "사회 트렌드",
            "문화·IT 동향",
            "경쟁사 활동 요약",
            "주요 기회와 위험 요소",
            "실행 가능한 인사이트",
            "다음 주 전망"
        ],
        "max_articles": 300,
        "focus": "트렌드와 패턴 분석",
        "visualization_priority": ["trend_line", "heat_map", "comparison_chart"],
        "insight_types_priority": [
            InsightType.TREND,
            InsightType.CORRELATION,
            InsightType.OPPORTUNITY,
            InsightType.RISK
        ]
    },
    
    PeriodReportType.MONTHLY: {
        "name": "월간 뉴스 분석",
        "description": "지난 한 달간의 뉴스를 심층 분석한 월간 리포트",
        "sections": [
            "월간 핵심 이슈",
            "정치 환경 변화",
            "경제 지표 분석",
            "사회 변화 동향", 
            "정책 변화 영향",
            "기술 및 혁신 트렌드",
            "경쟁 환경 분석",
            "주요 기회 및 위험 요소",
            "전략적 시사점",
            "실행 가능한 인사이트",
            "다음 달 주요 이슈"
        ],
        "max_articles": 500,
        "focus": "깊이있는 분석과 인사이트",
        "visualization_priority": ["trend_analysis", "network_graph", "comparison_matrix"],
        "insight_types_priority": [
            InsightType.TREND,
            InsightType.CORRELATION,
            InsightType.COMPARISON,
            InsightType.PREDICTION,
            InsightType.CONTEXT
        ]
    },
    
    PeriodReportType.QUARTERLY: {
        "name": "분기별 종합 분석",
        "description": "지난 분기의 뉴스를 종합적으로 분석한 분기 리포트",
        "sections": [
            "분기 핵심 성과",
            "정치 환경 평가",
            "경제 성과 분석",
            "사회 변화 평가",
            "정책 효과 분석", 
            "기술 트렌드 심층 분석",
            "경쟁 환경 변화",
            "산업 동향 분석",
            "주요 기회 및 위험 요소",
            "전략적 시사점",
            "실행 우선순위 매트릭스",
            "다음 분기 전망"
        ],
        "max_articles": 1000,
        "focus": "전략적 분석과 평가",
        "visualization_priority": ["strategic_map", "trend_analysis", "correlation_matrix"],
        "insight_types_priority": [
            InsightType.TREND,
            InsightType.CORRELATION,
            InsightType.COMPARISON,
            InsightType.PREDICTION,
            InsightType.CONTEXT,
            InsightType.OPPORTUNITY,
            InsightType.RISK
        ]
    },
    
    PeriodReportType.YEARLY: {
        "name": "연간 종합 평가",
        "description": "지난 1년간의 뉴스를 총괄 분석한 연간 리포트",
        "sections": [
            "연간 주요 성과",
            "정치 환경 총평",
            "경제 성과 평가",
            "사회 변화 총결",
            "정책 성과 분석",
            "기술 혁신 및 변화",
            "산업 지형 변화",
            "경쟁 환경 총평",
            "주요 성공 및 실패 사례",
            "전략적 시사점",
            "장기 전략 추천",
            "실행 로드맵",
            "내년 전망과 과제"
        ],
        "max_articles": 2000,
        "focus": "총괄적 평가와 미래 전망",
        "visualization_priority": ["year_overview", "strategic_roadmap", "trend_projection"],
        "insight_types_priority": [
            InsightType.TREND,
            InsightType.CORRELATION,
            InsightType.COMPARISON,
            InsightType.PREDICTION,
            InsightType.CONTEXT,
            InsightType.OPPORTUNITY,
            InsightType.RISK
        ]
    }
}

# =========================================================
# 카테고리별 분석 정의
# =========================================================

CATEGORY_SPECIFIC_ANALYSIS = {
    "정치": {
        "additional_fields": ["정당", "정책", "법안", "국제관계"],
        "entity_types": ["정치인", "정당", "정부기관", "국제기구"],
        "insight_focus": ["정책변화", "지지율", "국제관계", "정치적 리스크"],
        "visualization_types": ["network_analysis", "support_trend", "policy_impact_matrix"]
    },
    "경제": {
        "additional_fields": ["시장동향", "기업실적", "경제지표", "투자정보"],
        "entity_types": ["기업", "산업", "경제지표", "통화"],
        "insight_focus": ["시장트렌드", "투자기회", "리스크요소", "성장전망"],
        "visualization_types": ["market_trend", "economic_indicators", "investment_matrix"]
    },
    "사회": {
        "additional_fields": ["사회이슈", "인구통계", "사회현상", "여론동향"],
        "entity_types": ["사회단체", "공공기관", "인구집단"],
        "insight_focus": ["사회변화", "여론동향", "인구변화", "사회적 영향"],
        "visualization_types": ["public_sentiment", "demographic_analysis", "social_impact_heatmap"]
    },
    "기술": {
        "additional_fields": ["기술동향", "혁신사례", "디지털전환", "기술투자"],
        "entity_types": ["기술기업", "기술서비스", "연구기관", "기술제품"],
        "insight_focus": ["기술트렌드", "혁신기회", "디지털전환", "기술위험"],
        "visualization_types": ["technology_radar", "innovation_matrix", "adoption_curve"]
    },
    "문화": {
        "additional_fields": ["문화트렌드", "엔터테인먼트", "미디어", "예술"],
        "entity_types": ["문화단체", "미디어기업", "창작자", "콘텐츠"],
        "insight_focus": ["문화변화", "콘텐츠트렌드", "소비자선호도", "미디어영향력"],
        "visualization_types": ["cultural_trend_map", "content_popularity", "media_influence_network"]
    }
}