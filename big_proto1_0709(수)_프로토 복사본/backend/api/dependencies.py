"""
API 라우터에서 사용될 의존성 주입(Dependency Injection)을 정의합니다.
"""
from backend.api.clients.bigkinds.client import BigKindsClient
from backend.services.aws_bedrock_client import get_bedrock_client, BedrockConfig
from backend.services.news_concierge import NewsConciergeService
from backend.services.report_generator import ReportGenerator
from backend.services.period_report_generator import PeriodReportGenerator
from backend.services.news.briefing_service import BriefingService

# 싱글턴 인스턴스들을 관리하기 위한 변수들
_bigkinds_client_instance = None
_bedrock_config = None
_news_concierge_service = None
_report_generator = None
_period_report_generator = None
_briefing_service = None

def get_bigkinds_client() -> BigKindsClient:
    """
    BigKindsClient의 싱글턴 인스턴스를 반환하는 의존성 함수.
    이 함수를 통해 모든 API 요청이 동일한 클라이언트 인스턴스를 공유하게 됩니다.
    """
    global _bigkinds_client_instance
    if _bigkinds_client_instance is None:
        # 첫 호출 시 인스턴스 생성
        _bigkinds_client_instance = BigKindsClient()
    return _bigkinds_client_instance

def get_bedrock_config() -> BedrockConfig:
    """
    Bedrock 설정을 반환하는 의존성 함수.
    """
    global _bedrock_config
    if _bedrock_config is None:
        import os
        _bedrock_config = BedrockConfig(
            region_name=os.getenv('BEDROCK_REGION', 'us-east-1'),
            model_id=os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
        )
    return _bedrock_config

def get_news_concierge_service() -> NewsConciergeService:
    """
    NewsConciergeService의 싱글턴 인스턴스를 반환하는 의존성 함수.
    """
    global _news_concierge_service
    if _news_concierge_service is None:
        _news_concierge_service = NewsConciergeService(
            bigkinds_client=get_bigkinds_client(),
            bedrock_config=get_bedrock_config()
        )
    return _news_concierge_service

def get_report_generator() -> ReportGenerator:
    """
    ReportGenerator의 싱글턴 인스턴스를 반환하는 의존성 함수.
    """
    global _report_generator
    if _report_generator is None:
        _report_generator = ReportGenerator(
            bigkinds_client=get_bigkinds_client(),
            bedrock_config=get_bedrock_config()
        )
    return _report_generator

def get_period_report_generator() -> PeriodReportGenerator:
    """
    PeriodReportGenerator의 싱글턴 인스턴스를 반환하는 의존성 함수.
    """
    global _period_report_generator
    if _period_report_generator is None:
        _period_report_generator = PeriodReportGenerator(
            bigkinds_client=get_bigkinds_client(),
            bedrock_config=get_bedrock_config()
        )
    return _period_report_generator

def get_briefing_service() -> BriefingService:
    """
    BriefingService의 싱글턴 인스턴스를 반환하는 의존성 함수.
    """
    global _briefing_service
    if _briefing_service is None:
        _briefing_service = BriefingService(
            bigkinds_client=get_bigkinds_client(),
            bedrock_config=get_bedrock_config()
        )
    return _briefing_service 