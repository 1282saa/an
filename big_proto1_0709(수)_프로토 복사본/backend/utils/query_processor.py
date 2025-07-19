"""
빅카인즈 API에 최적화된 쿼리 처리 모듈 - 향상된 버전

빅카인즈 API 특성:
- 공백 기준으로 키워드 분리하여 검색
- AND 연산자로 정확도 향상 가능
- 구체적인 키워드일수록 정확한 결과
- tf-idf 기반 _score 정렬 제공
- 연관어 및 클러스터링 기능 지원
"""

import re
import json
import logging
from typing import List, Tuple, Dict, Set, Optional, Union, Any
from enum import Enum
from datetime import datetime, timedelta
import os.path

# 로깅 설정
logger = logging.getLogger("bigkinds_query_processor")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class QueryStrategy(str, Enum):
    """쿼리 전략 유형"""
    AND = "and"  # 정확도 우선 (모든 키워드 포함)
    OR = "or"    # 범위 우선 (어느 하나라도 포함)
    PROXIMITY = "proximity"  # 근접 검색 (키워드들이 가까이 있는 경우)
    EXACT = "exact"  # 정확한 구문 검색

class QueryIntent(str, Enum):
    """쿼리 의도 유형"""
    GENERAL = "general"  # 일반 정보 검색
    COMPANY = "company"  # 특정 기업 관련
    MARKET = "market"    # 시장 동향 관련
    TECH = "tech"        # 기술 관련
    FINANCE = "finance"  # 금융 관련
    POLICY = "policy"    # 정책 관련
    SOCIAL = "social"    # 사회 이슈 관련

class AnalysisDepth(str, Enum):
    """분석 깊이 수준"""
    BASIC = "basic"  # 기본 정보
    DETAILED = "detailed"  # 상세 정보
    COMPREHENSIVE = "comprehensive"  # 종합적 분석

class QueryConfig:
    """쿼리 처리 설정"""
    # 기본 불용어 파일 경로
    DEFAULT_STOPWORDS_PATH = "resources/korean_stopwords.txt"
    # 기본 회사명 정규화 파일 경로
    DEFAULT_COMPANY_NORM_PATH = "resources/company_normalization.json"
    # 기본 도메인 키워드 파일 경로
    DEFAULT_DOMAIN_KEYWORDS_PATH = "resources/domain_keywords.json"
    
    # 최소 키워드 길이
    MIN_KEYWORD_LENGTH = 2
    # 최대 키워드 수
    MAX_KEYWORDS = 8
    # 폴백 쿼리 최대 수
    MAX_FALLBACK_QUERIES = 5
    
    # 가중치 설정
    WEIGHTS = {
        "company_name": 2.0,    # 회사명 가중치
        "industry_term": 1.5,   # 산업 용어 가중치
        "first_position": 1.2,  # 첫 번째 위치 가중치
    }

class StopwordsManager:
    """불용어 관리 클래스"""
    _instance = None
    
    def __new__(cls):
        """싱글톤 패턴 구현"""
        if cls._instance is None:
            cls._instance = super(StopwordsManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """초기화 - 불용어 로드"""
        if self._initialized:
            return
            
        self._stopwords: Set[str] = set()
        self._category_stopwords: Dict[str, Set[str]] = {
            "general": set(),
            "company": set(),
            "market": set(),
            "tech": set(),
            "finance": set(),
            "policy": set(),
            "social": set()
        }
        
        # 기본 불용어 로드
        self._load_default_stopwords()
        self._initialized = True
    
    def _load_default_stopwords(self):
        """기본 불용어 파일 로드"""
        # 내장 기본 불용어 세트
        default_stopwords = {
            # 조사
            '과', '와', '의', '은', '는', '이', '가', '을', '를', '에', '에서', '에게', '께', '으로', '로', '와', '과',
            '도', '만', '까지', '부터', '처럼', '같이', '보다', '마다', '조차', '마저', '뿐', '밖에',
            
            # 어미/연결어
            '그리고', '하지만', '그러나', '그런데', '따라서', '그래서', '또한', '또는', '혹은', '그러면',
            
            # 질문/요청 표현 (확장)
            '어떤', '어떻게', '무엇', '언제', '어디', '왜', '누구', '얼마', '몇', '어떤가요',
            '알려줘', '알려주세요', '궁금해', '궁금합니다', '궁금해요', '설명해', '설명해주세요',
            '요약해', '요약해주세요', '정리해', '정리해주세요', '분석해', '분석해주세요',
            '어떤가', '어떤지', '무엇인지', '무엇이', '언제인지', '언제가', '어디인지', '어디가',
            '왜인지', '왜가', '어떻게인지', '어떻게가', '누구인지', '누구가',
            
            # 시간 표현 (확장)
            '오늘', '어제', '내일', '지난', '다음', '올해', '내년', '작년', '최근', '향후', '앞으로',
            '이번', '다음번', '저번', '언제부터', '언제까지', '현재', '지금', '요즘', '근래', '최신',
            
            # 일반적인 수식어
            '매우', '정말', '너무', '조금', '많이', '적게', '크게', '작게', '빠르게', '느리게',
            '좋은', '나쁜', '큰', '작은', '높은', '낮은', '빠른', '느린',
            
            # 뉴스/분석 관련 불용어 (확장)
            '관련', '현황', '동향', '이슈', '정보', '소식', '뉴스', '기사', '보도', '발표',
            '상황', '상태', '결과', '원인', '이유', '방법', '방안', '대안', '해결책',
            '전망', '예상', '예측', '계획', '방향', '추세', '경향',
            '동향은', '동향이', '현황은', '현황이', '상황은', '상황이', '전망은', '전망이',
            '어떤가요', '어떻게요', '무엇인가요', '언제인가요', '어디인가요', '왜인가요',
            
            # 어미 패턴 (확장)
            '전망이', '동향이', '상황이', '현황이', '결과가', '방법은', '이유는',
            '동향은', '전망은', '상황은', '현황은', '결과는', '방법이', '이유가',
            
            # 기타
            '것', '거', '게', '점', '번', '개', '명', '건', '회', '차례', '때', '경우', '상황'
        }
        
        self._stopwords.update(default_stopwords)
        self._category_stopwords["general"].update(default_stopwords)
        
        # 파일에서 추가 불용어 로드 시도
        try:
            if os.path.exists(QueryConfig.DEFAULT_STOPWORDS_PATH):
                with open(QueryConfig.DEFAULT_STOPWORDS_PATH, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            # 카테고리 태그 포함 줄 처리 (예: "[finance] 금리인상")
                            if line.startswith('[') and ']' in line:
                                category, word = line.split(']', 1)
                                category = category[1:].strip().lower()
                                word = word.strip()
                                
                                if category in self._category_stopwords:
                                    self._category_stopwords[category].add(word)
                                    self._stopwords.add(word)
                            else:
                                self._stopwords.add(line)
                                self._category_stopwords["general"].add(line)
                logger.info(f"불용어 {len(self._stopwords)}개 로드 완료")
        except Exception as e:
            logger.warning(f"불용어 파일 로드 실패: {e}")
    
    def add_stopword(self, word: str, category: str = "general"):
        """불용어 추가"""
        self._stopwords.add(word)
        if category in self._category_stopwords:
            self._category_stopwords[category].add(word)
        else:
            self._category_stopwords["general"].add(word)
    
    def remove_stopword(self, word: str):
        """불용어 제거"""
        if word in self._stopwords:
            self._stopwords.remove(word)
            for category in self._category_stopwords:
                if word in self._category_stopwords[category]:
                    self._category_stopwords[category].remove(word)
    
    def is_stopword(self, word: str, category: Optional[str] = None) -> bool:
        """단어가 불용어인지 확인"""
        if category and category in self._category_stopwords:
            return word in self._category_stopwords[category]
        return word in self._stopwords
    
    def get_all_stopwords(self) -> Set[str]:
        """모든 불용어 목록 반환"""
        return self._stopwords.copy()
    
    def get_category_stopwords(self, category: str) -> Set[str]:
        """특정 카테고리의 불용어 목록 반환"""
        if category in self._category_stopwords:
            return self._category_stopwords[category].copy()
        return set()

class EntityNormalizer:
    """개체명(회사명 등) 정규화 클래스"""
    _instance = None
    
    def __new__(cls):
        """싱글톤 패턴 구현"""
        if cls._instance is None:
            cls._instance = super(EntityNormalizer, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """초기화 - 정규화 데이터 로드"""
        if self._initialized:
            return
            
        # 회사명 정규화 맵핑 (동의어 확장 포함)
        self._company_normalization: Dict[str, str] = {
            '삼성전자와': '삼성전자',
            '삼성전자의': '삼성전자', 
            '네이버의': '네이버',
            '현대차의': '현대자동차',  # 현대차 → 현대자동차로 확장
            '현대자동차의': '현대자동차',
            'SK하이닉스의': 'SK하이닉스',
            '카카오의': '카카오',
            '삼성전자는': '삼성전자',
            '삼성전자가': '삼성전자',
            '네이버는': '네이버',
            '네이버가': '네이버',
            '카카오는': '카카오',
            '카카오가': '카카오',
            '현대차는': '현대자동차',  # 현대차 → 현대자동차로 확장
            '현대차가': '현대자동차',  # 현대차 → 현대자동차로 확장
            '현대차': '현대자동차',    # 기본 형태도 확장
            '현대자동차는': '현대자동차',
            '현대자동차가': '현대자동차',
            'LG전자의': 'LG전자',
            'LG전자는': 'LG전자',
            'LG전자가': 'LG전자',
            'KT는': 'KT',
            'KT의': 'KT',
            'KT가': 'KT',
        }
        
        # 회사 목록 (정규화된 회사명)
        self._companies: Set[str] = {
            '삼성전자', '네이버', '카카오', '현대자동차', 'SK하이닉스', 'LG전자', 'KT', 
            '신한금융', '기아', '포스코', 'KB금융', '현대모비스', '셀트리온', '하나금융',
            '카카오뱅크', '삼성바이오로직스', '삼성SDI', 'SK이노베이션', 'LG화학', 'NAVER'
        }
        
        # 용어 정규화 맵핑 (기타 개체명)
        self._term_normalization: Dict[str, str] = {
            'ai': 'AI',
            '인공지능': 'AI',
            '아이폰': 'iPhone',
            '갤럭시': 'Galaxy',
            '비트코인': 'Bitcoin',
            '이더리움': 'Ethereum',
            '코로나': 'COVID-19',
            '코로나19': 'COVID-19',
            '코로나바이러스': 'COVID-19',
        }
        
        # 파일에서 정규화 데이터 로드 시도
        self._load_normalization_data()
        self._initialized = True
    
    def _load_normalization_data(self):
        """정규화 데이터 파일 로드"""
        try:
            if os.path.exists(QueryConfig.DEFAULT_COMPANY_NORM_PATH):
                with open(QueryConfig.DEFAULT_COMPANY_NORM_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if "company_normalization" in data:
                        self._company_normalization.update(data["company_normalization"])
                    if "companies" in data:
                        self._companies.update(data["companies"])
                    if "term_normalization" in data:
                        self._term_normalization.update(data["term_normalization"])
                logger.info(f"정규화 데이터 로드 완료: 회사명 변형 {len(self._company_normalization)}개, 회사 {len(self._companies)}개, 용어 {len(self._term_normalization)}개")
        except Exception as e:
            logger.warning(f"정규화 데이터 파일 로드 실패: {e}")
    
    def normalize_company(self, name: str) -> str:
        """회사명 정규화"""
        # 정규화 맵에 있는 경우
        if name in self._company_normalization:
            return self._company_normalization[name]
        
        # 조사 제거 시도
        # '이', '가', '을', '를', '의', '에' 등의 조사가 붙은 경우 처리
        for suffix in ['의', '은', '는', '이', '가', '을', '를', '에', '와', '과', '로']:
            if name.endswith(suffix) and len(name) > len(suffix):
                base_name = name[:-len(suffix)]
                if base_name in self._companies:
                    return base_name
        
        return name
    
    def normalize_term(self, term: str) -> str:
        """용어 정규화"""
        # 소문자 변환 후 확인
        lower_term = term.lower()
        if lower_term in self._term_normalization:
            return self._term_normalization[lower_term]
        return term
    
    def is_company(self, name: str) -> bool:
        """회사명인지 확인"""
        normalized = self.normalize_company(name)
        return normalized in self._companies
    
    def add_company_normalization(self, variant: str, normalized: str):
        """회사명 정규화 규칙 추가"""
        self._company_normalization[variant] = normalized
        self._companies.add(normalized)
    
    def add_term_normalization(self, variant: str, normalized: str):
        """용어 정규화 규칙 추가"""
        self._term_normalization[variant.lower()] = normalized

class DomainKeywords:
    """도메인별 키워드 관리 클래스"""
    _instance = None
    
    def __new__(cls):
        """싱글톤 패턴 구현"""
        if cls._instance is None:
            cls._instance = super(DomainKeywords, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """초기화 - 도메인 키워드 로드"""
        if self._initialized:
            return
            
        # 도메인별 키워드 세트
        self._domain_keywords: Dict[str, Set[str]] = {
            "company": set(['기업', '회사', '법인', '사업', '경영', '임원', '대표', '주주', '직원', '매출']),
            "market": set(['시장', '경쟁', '점유율', '산업', '생태계', '플랫폼', '소비자', '고객', '유통']),
            "tech": set(['기술', '혁신', 'AI', '인공지능', '빅데이터', '클라우드', 'IoT', '블록체인', '자율주행']),
            "finance": set(['주가', '주식', '증권', '투자', '금융', '펀드', '은행', '대출', '금리', '환율']),
            "policy": set(['정책', '규제', '법안', '정부', '제도', '공공', '행정', '허가', '인허가', '지원금']),
            "social": set(['사회', '이슈', '논란', '갈등', '문제', '운동', '캠페인', '참여', '봉사', '기부'])
        }
        
        # 파일에서 도메인 키워드 로드 시도
        self._load_domain_keywords()
        self._initialized = True
    
    def _load_domain_keywords(self):
        """도메인 키워드 파일 로드"""
        try:
            if os.path.exists(QueryConfig.DEFAULT_DOMAIN_KEYWORDS_PATH):
                with open(QueryConfig.DEFAULT_DOMAIN_KEYWORDS_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for domain, keywords in data.items():
                        if domain in self._domain_keywords:
                            self._domain_keywords[domain].update(keywords)
                        else:
                            self._domain_keywords[domain] = set(keywords)
                logger.info(f"도메인 키워드 로드 완료: {', '.join(f'{d}({len(k)}개)' for d, k in self._domain_keywords.items())}")
        except Exception as e:
            logger.warning(f"도메인 키워드 파일 로드 실패: {e}")
    
    def get_domain_for_keyword(self, keyword: str) -> List[str]:
        """키워드가 속한 도메인 목록 반환"""
        domains = []
        for domain, keywords in self._domain_keywords.items():
            if keyword in keywords:
                domains.append(domain)
        return domains
    
    def is_domain_keyword(self, keyword: str, domain: str) -> bool:
        """키워드가 특정 도메인에 속하는지 확인"""
        if domain in self._domain_keywords:
            return keyword in self._domain_keywords[domain]
        return False
    
    def add_domain_keyword(self, keyword: str, domain: str):
        """도메인 키워드 추가"""
        if domain in self._domain_keywords:
            self._domain_keywords[domain].add(keyword)
        else:
            self._domain_keywords[domain] = {keyword}
    
    def get_all_domains(self) -> List[str]:
        """모든 도메인 목록 반환"""
        return list(self._domain_keywords.keys())
    
    def get_domain_keywords(self, domain: str) -> Set[str]:
        """특정 도메인의 키워드 목록 반환"""
        if domain in self._domain_keywords:
            return self._domain_keywords[domain].copy()
        return set()


class QueryProcessor:
    """빅카인즈 API 쿼리 프로세서"""
    
    def __init__(self):
        """초기화"""
        self.stopwords_manager = StopwordsManager()
        self.entity_normalizer = EntityNormalizer()
        self.domain_keywords = DomainKeywords()
    
    def correct_spacing(self, text: str) -> str:
        """
        한국어 띄어쓰기 교정
        
        Args:
            text: 교정할 텍스트
            
        Returns:
            교정된 텍스트
        """
        # 기본 정리
        text = re.sub(r'\s+', ' ', text.strip())
        
        # 인명 + 직책 패턴 교정
        name_title_patterns = [
            # 인명 + 직책
            (r'([가-힣]{2,4})(수석|부사장|사장|회장|대표|팀장|부장|과장|차장|실장|이사|전무|상무|본부장|센터장|연구원|박사|교수|변호사|의원|장관|차관|국장|부국장|기자|앵커|PD|작가|감독|배우|가수|작곡가)', r'\1 \2'),
            # 회사명 + 직책/부서
            (r'(네이버|카카오|삼성|LG|SK|현대|기아|롯데|CJ|신세계|하나|우리|국민|농협|신한)(수석|부사장|사장|회장|대표|팀장|부장|과장|차장|실장|이사|전무|상무|본부장|센터장|연구원|박사)', r'\1 \2'),
            # 회사명 + 사업부
            (r'(네이버|카카오|삼성|LG|SK|현대|기아|롯데|CJ|신세계|하나|우리|국민|농협|신한)(전자|물산|화학|중공업|건설|카드|은행|증권|생명|화재|디스플레이|바이오|SDI|SDS)', r'\1 \2'),
            # 숫자 + 단위는 붙여쓰기 유지
            # 조사 분리 방지
            (r'([가-힣]+)\s+(이|가|을|를|에|에서|로|으로|와|과|의|도|만|부터|까지|처럼|같이|마다|조차|뿐)', r'\1\2'),
        ]
        
        # 패턴 적용
        corrected_text = text
        for pattern, replacement in name_title_patterns:
            corrected_text = re.sub(pattern, replacement, corrected_text)
        
        # 특수 케이스 사전
        special_corrections = {
            # 인명 + 직책
            '하정우수석': '하정우 수석',
            '김철수부장': '김철수 부장', 
            '이영희팀장': '이영희 팀장',
            # 회사명 + 부서
            '네이버수석': '네이버 수석',
            '카카오대표': '카카오 대표',
            '삼성회장': '삼성 회장',
            # 경제 용어
            '부동산시장': '부동산 시장',
            '주식시장': '주식 시장',
            '금융시장': '금융 시장',
            '코스피지수': '코스피 지수',
            '환율변동': '환율 변동',
            '금리인상': '금리 인상',
            '물가상승': '물가 상승',
            # 기술 용어
            '인공지능기술': '인공지능 기술',
            '반도체산업': '반도체 산업',
            '전기차배터리': '전기차 배터리',
            '자율주행차': '자율주행 차',
            # 정치/사회
            '대통령선거': '대통령 선거',
            '국정감사': '국정 감사',
            '정부정책': '정부 정책',
        }
        
        # 사전 기반 교정 적용
        for wrong, correct in special_corrections.items():
            if wrong in corrected_text:
                corrected_text = corrected_text.replace(wrong, correct)
                logger.info(f"띄어쓰기 교정: '{wrong}' → '{correct}'")
        
        return corrected_text
    
    def preprocess_query(self, text: str) -> List[Tuple[str, float]]:
        """
        빅카인즈 API에 최적화된 키워드 추출 및 가중치 부여
        
        Args:
            text: 사용자 질문 (예: "삼성전자와 HBM 반도체 상황")
            
        Returns:
            (키워드, 가중치) 튜플의 리스트 (예: [('삼성전자', 2.4), ('HBM', 1.8), ('반도체', 1.5)])
        """
        # 0. 띄어쓰기 교정
        text = self.correct_spacing(text)
        
        # 1. 영문 약어 및 기술 용어 사전 (우선 추출)
        tech_terms = {
            'HBM': 1.8, 'AI': 1.8, 'IoT': 1.8, 'ESG': 1.8, 'NFT': 1.8, 'API': 1.7,
            'CPU': 1.7, 'GPU': 1.7, 'DRAM': 1.7, 'SSD': 1.7, 'LCD': 1.7, 'OLED': 1.7,
            'EV': 1.6, 'IPO': 1.6, 'M&A': 1.6, 'CEO': 1.6, 'CTO': 1.6, 'CIO': 1.6,
            'IT': 1.5, 'ICT': 1.5, 'VR': 1.5, 'AR': 1.5, 'MR': 1.5, 'XR': 1.5,
            'LLM': 1.7, 'ChatGPT': 1.7, 'GPT': 1.7, 'ML': 1.6, 'DL': 1.6,
            '5G': 1.6, '6G': 1.6, 'WiFi': 1.5, 'LTE': 1.5, 'USB': 1.4,
            'KOSPI': 1.6, 'NASDAQ': 1.6, 'S&P': 1.6, 'GDP': 1.6, 'CPI': 1.6
        }
        
        # 2. 복합 기술 용어 (연속된 단어로 인식)
        compound_terms = {
            '반도체 메모리': 1.8, '메모리 반도체': 1.8, 'HBM 반도체': 1.9,
            '인공지능': 1.7, '머신러닝': 1.7, '딥러닝': 1.7,
            '자율주행': 1.7, '전기차': 1.7, '배터리': 1.6,
            '블록체인': 1.6, '암호화폐': 1.6, '가상화폐': 1.6,
            '클라우드 컴퓨팅': 1.6, '빅데이터': 1.6, '사물인터넷': 1.6,
            '메타버스': 1.6, '가상현실': 1.5, '증강현실': 1.5,
            '양자컴퓨터': 1.7, '양자컴퓨팅': 1.7, '핀테크': 1.6,
            '바이오': 1.6, '헬스케어': 1.6, '의료기기': 1.6,
            '신재생에너지': 1.6, '태양광': 1.5, '풍력': 1.5, '수소': 1.6
        }
        
        # 3. 기업명 확장 사전
        company_variants = {
            '삼성': '삼성전자', '네이버': '네이버', '카카오': '카카오',
            'LG': 'LG전자', 'SK': 'SK하이닉스', '현대': '현대자동차',
            '기아': '기아', 'TSMC': 'TSMC', '인텔': '인텔', 'AMD': 'AMD',
            '엔비디아': '엔비디아', 'NVIDIA': '엔비디아', '마이크로소프트': '마이크로소프트',
            '구글': '구글', 'Google': '구글', '애플': '애플', 'Apple': '애플',
            '테슬라': '테슬라', 'Tesla': '테슬라'
        }
        
        keywords_with_weights = []
        seen_keywords = set()
        
        # 4. 복합 용어 우선 추출
        text_upper = text.upper()
        for compound, weight in compound_terms.items():
            if compound in text or compound.upper() in text_upper:
                if compound not in seen_keywords:
                    keywords_with_weights.append((compound, weight))
                    seen_keywords.add(compound)
                    # 원문에서 제거하여 중복 추출 방지
                    text = text.replace(compound, ' ')
        
        # 5. 영문 약어 추출 (대소문자 무관)
        words = re.findall(r'\b[A-Za-z0-9&]+\b', text)
        for word in words:
            word_upper = word.upper()
            if word_upper in tech_terms and word_upper not in seen_keywords:
                keywords_with_weights.append((word_upper, tech_terms[word_upper]))
                seen_keywords.add(word_upper)
        
        # 6. 특수문자 제거 후 일반 키워드 추출
        text_cleaned = re.sub(r'[^\w\s가-힣]', ' ', text)
        text_cleaned = re.sub(r'\s+', ' ', text_cleaned.strip())
        
        # 7. 단어 분리 및 일반 키워드 처리
        words = text_cleaned.split()
        
        for i, word in enumerate(words):
            word = word.strip()
            
            # 불용어인 경우 건너뜀
            if self.stopwords_manager.is_stopword(word):
                continue
            
            # 이미 추출된 키워드는 건너뜀
            if word in seen_keywords or word.upper() in seen_keywords:
                continue
                
            # 회사명 정규화 적용
            original_word = word
            word = self.entity_normalizer.normalize_company(word)
            
            # 기업명 확장 적용
            if word in company_variants:
                word = company_variants[word]
            
            # 용어 정규화 적용
            word = self.entity_normalizer.normalize_term(word)
            
            # 필터링 조건
            if (len(word) >= QueryConfig.MIN_KEYWORD_LENGTH and  # 최소 길이
                not word.isdigit() and  # 순수 숫자 아님
                not re.match(r'.*[?!]$', word) and  # 물음표/느낌표로 끝나지 않음
                word not in seen_keywords):  # 중복 아님
                
                # 가중치 계산
                weight = 1.0
                
                # 기술 용어인 경우 가중치 증가
                if word.upper() in tech_terms:
                    weight = tech_terms[word.upper()]
                # 회사명인 경우 가중치 증가
                elif self.entity_normalizer.is_company(original_word) or word in company_variants.values():
                    weight *= QueryConfig.WEIGHTS["company_name"]
                # 도메인 특화 용어인 경우 가중치 증가
                else:
                    domain_count = len(self.domain_keywords.get_domain_for_keyword(word))
                    if domain_count > 0:
                        weight *= QueryConfig.WEIGHTS["industry_term"]
                
                # 첫 번째 위치 가중치
                if i == 0:
                    weight *= QueryConfig.WEIGHTS["first_position"]
                
                keywords_with_weights.append((word, weight))
                seen_keywords.add(word)
        
        # 8. 가중치에 따라 정렬 (내림차순)
        keywords_with_weights.sort(key=lambda x: x[1], reverse=True)
        
        # 9. 최대 키워드 수 제한
        return keywords_with_weights[:QueryConfig.MAX_KEYWORDS]
    
    def build_bigkinds_query(self, keywords: List[Union[str, Tuple[str, float]]], 
                            strategy: QueryStrategy = QueryStrategy.AND) -> str:
        """
        빅카인즈 API용 쿼리 문자열 생성
        
        Args:
            keywords: 키워드 리스트 또는 (키워드, 가중치) 튜플 리스트
            strategy: 쿼리 전략 (AND, OR, PROXIMITY, EXACT)
            
        Returns:
            빅카인즈 API 쿼리 문자열
        """
        # 키워드가 없는 경우
        if not keywords:
            return ""
        
        # 키워드 추출 (튜플인 경우)
        processed_keywords = []
        for k in keywords:
            if isinstance(k, tuple) and len(k) >= 1:
                processed_keywords.append(k[0])
            else:
                processed_keywords.append(k)
        
        # 단일 키워드인 경우
        if len(processed_keywords) == 1:
            return f'"{processed_keywords[0]}"'
        
        # 전략에 따른 쿼리 생성
        if strategy == QueryStrategy.AND:
            # 정확도 우선: "키워드1" AND "키워드2" AND "키워드3"
            return " AND ".join([f'"{keyword}"' for keyword in processed_keywords])
            
        elif strategy == QueryStrategy.OR:
            # 범위 우선: "키워드1" OR "키워드2" OR "키워드3" 
            return " OR ".join([f'"{keyword}"' for keyword in processed_keywords])
            
        elif strategy == QueryStrategy.PROXIMITY:
            # 근접 검색 (키워드들이 서로 가까이 있는 문서 우선)
            # "키워드1" NEAR/10 "키워드2" NEAR/10 "키워드3"
            if len(processed_keywords) == 2:
                return f'"{processed_keywords[0]}" NEAR/10 "{processed_keywords[1]}"'
            else:
                proximity_parts = []
                for i in range(len(processed_keywords) - 1):
                    proximity_parts.append(
                        f'"{processed_keywords[i]}" NEAR/10 "{processed_keywords[i+1]}"'
                    )
                return " AND ".join(proximity_parts)
                
        elif strategy == QueryStrategy.EXACT:
            # 정확한 구문 검색: "키워드1 키워드2 키워드3"
            return f'"{" ".join(processed_keywords)}"'
            
        else:
            # 기본값은 AND
            return " AND ".join([f'"{keyword}"' for keyword in processed_keywords])
    
    def create_fallback_queries(self, keywords: List[Union[str, Tuple[str, float]]]) -> List[Tuple[str, str, QueryStrategy]]:
        """
        검색 실패 시 사용할 폴백 쿼리들을 생성
        
        Args:
            keywords: 키워드 리스트 또는 (키워드, 가중치) 튜플 리스트
            
        Returns:
            (쿼리문, 설명, 전략) 튜플의 리스트
        """
        # 키워드가 없는 경우
        if not keywords:
            return []
        
        # 키워드 추출 및 가중치로 정렬 (이미 정렬되어 있을 수 있음)
        processed_keywords = []
        for k in keywords:
            if isinstance(k, tuple) and len(k) >= 2:
                processed_keywords.append((k[0], k[1]))
            else:
                processed_keywords.append((k, 1.0))
        
        # 가중치로 내림차순 정렬
        processed_keywords.sort(key=lambda x: x[1], reverse=True)
        keyword_strings = [k[0] for k in processed_keywords]
        
        queries = []
        
        # 1순위: 모든 키워드 AND 검색
        if len(keyword_strings) > 1:
            queries.append((
                self.build_bigkinds_query(keyword_strings, QueryStrategy.AND),
                f"정확도 우선 (모든 키워드 포함): {' + '.join(keyword_strings)}",
                QueryStrategy.AND
            ))
        
        # 2순위: 상위 가중치 키워드만 AND 검색 (상위 3개)
        if len(keyword_strings) > 3:
            queries.append((
                self.build_bigkinds_query(keyword_strings[:3], QueryStrategy.AND),
                f"핵심 키워드 우선: {' + '.join(keyword_strings[:3])}",
                QueryStrategy.AND
            ))
        
        # 3순위: 가장 중요한 2개 키워드만 근접 검색
        if len(keyword_strings) > 2:
            queries.append((
                self.build_bigkinds_query(keyword_strings[:2], QueryStrategy.PROXIMITY),
                f"핵심 키워드 근접: {' 근처의 '.join(keyword_strings[:2])}",
                QueryStrategy.PROXIMITY
            ))
        
        # 4순위: 상위 키워드 2개 정확한 구문 검색
        if len(keyword_strings) > 2:
            queries.append((
                self.build_bigkinds_query(keyword_strings[:2], QueryStrategy.EXACT),
                f"정확한 구문: {' '.join(keyword_strings[:2])}",
                QueryStrategy.EXACT
            ))
        
        # 5순위: OR 검색 (범위 확대)
        if len(keyword_strings) > 1:
            queries.append((
                self.build_bigkinds_query(keyword_strings, QueryStrategy.OR),
                f"범위 확대: {' 또는 '.join(keyword_strings)}",
                QueryStrategy.OR
            ))
        
        # 6순위: 첫 번째 키워드만
        queries.append((
            self.build_bigkinds_query([keyword_strings[0]], QueryStrategy.AND),
            f"기본 검색: {keyword_strings[0]}",
            QueryStrategy.AND
        ))
        
        # 최대 폴백 쿼리 수 제한
        return queries[:QueryConfig.MAX_FALLBACK_QUERIES]
    
    def analyze_query_intent(self, text: str) -> Dict[str, Any]:
        """
        사용자 질문의 의도를 분석
        
        Args:
            text: 사용자 질문
            
        Returns:
            분석 결과 딕셔너리
        """
        # 전처리된 키워드 추출
        keywords_with_weights = self.preprocess_query(text)
        keywords = [k[0] for k in keywords_with_weights]
        
        # 기본 의도 설정
        intent = {
            "query_type": QueryIntent.GENERAL,
            "time_sensitive": False,
            "comparison": False,
            "analysis_depth": AnalysisDepth.BASIC,
            "time_range": None,
            "entities": [],
            "domains": set(),
            "keywords": keywords
        }
        
        # 회사 및 개체명 식별
        entities = []
        for word in keywords:
            if self.entity_normalizer.is_company(word):
                entities.append({"type": "company", "name": word})
                intent["domains"].add("company")
        
        # 키워드 기반 도메인 분석
        for keyword in keywords:
            domains = self.domain_keywords.get_domain_for_keyword(keyword)
            for domain in domains:
                intent["domains"].add(domain)
        
        # 주요 도메인 결정
        if intent["domains"]:
            # 도메인 빈도 계산
            domain_counts = {}
            for domain in intent["domains"]:
                domain_counts[domain] = 0
                for keyword in keywords:
                    if self.domain_keywords.is_domain_keyword(keyword, domain):
                        domain_counts[domain] += 1
            
            # 가장 높은 빈도의 도메인 선택
            primary_domain = max(domain_counts.items(), key=lambda x: x[1])[0]
            
            # 쿼리 타입 설정
            if primary_domain == "company":
                intent["query_type"] = QueryIntent.COMPANY
            elif primary_domain == "market":
                intent["query_type"] = QueryIntent.MARKET
            elif primary_domain == "tech":
                intent["query_type"] = QueryIntent.TECH
            elif primary_domain == "finance":
                intent["query_type"] = QueryIntent.FINANCE
            elif primary_domain == "policy":
                intent["query_type"] = QueryIntent.POLICY
            elif primary_domain == "social":
                intent["query_type"] = QueryIntent.SOCIAL
        
        # 개체명 저장
        intent["entities"] = entities
        
        # 원본 텍스트를 기반으로 추가 분석
        lower_text = text.lower()
        
        # 실시간성 분석
        time_keywords = ['실시간', '현재', '지금', '오늘', '최신', '속보', '실황', '라이브']
        if any(keyword in lower_text for keyword in time_keywords):
            intent["time_sensitive"] = True
        
        # 비교 분석
        comparison_keywords = ['비교', '차이', '대비', '경쟁', 'vs', '대', '와의', '간의', '어떤 게 더']
        if any(keyword in lower_text for keyword in comparison_keywords):
            intent["comparison"] = True
        
        # 분석 깊이
        detailed_keywords = ['자세히', '상세히', '분석', '심층', '깊게', '상세', '종합', '전문가', '철저히']
        comprehensive_keywords = ['종합 분석', '전체적', '포괄적', '총체적', '다각도', '전방위', '360도']
        
        if any(keyword in lower_text for keyword in comprehensive_keywords):
            intent["analysis_depth"] = AnalysisDepth.COMPREHENSIVE
        elif any(keyword in lower_text for keyword in detailed_keywords):
            intent["analysis_depth"] = AnalysisDepth.DETAILED
        
        # 시간 범위 분석
        time_range = self._extract_time_range(text)
        if time_range:
            intent["time_range"] = time_range
        
        # domains를 리스트로 변환
        intent["domains"] = list(intent["domains"])
        
        return intent
    
    def _extract_time_range(self, text: str) -> Optional[Dict[str, str]]:
        """
        텍스트에서 시간 범위를 추출
        
        Args:
            text: 분석할 텍스트
            
        Returns:
            시간 범위 딕셔너리 또는 None
        """
        time_range = {}
        
        # 날짜 패턴 (YYYY-MM-DD, YYYY.MM.DD, YYYY년 MM월 DD일)
        date_patterns = [
            r'(\d{4}-\d{1,2}-\d{1,2})',
            r'(\d{4}\.\d{1,2}\.\d{1,2})',
            r'(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)'
        ]
        
        # 기간 표현 패턴
        period_patterns = {
            '어제': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d'),
            '오늘': datetime.now().strftime('%Y-%m-%d'),
            '그저께': (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d'),
            '지난주': (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
            '지난달': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
            '지난 분기': (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d'),
            '작년': (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'),
        }
        
        # 기간 표현 찾기
        for period, date_str in period_patterns.items():
            if period in text:
                time_range['start'] = date_str
                time_range['end'] = datetime.now().strftime('%Y-%m-%d')
                return time_range
        
        # 날짜 패턴 찾기
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                # 정규화: YYYY-MM-DD 형식으로 변환
                if '년' in match:
                    # 'YYYY년 MM월 DD일' 형식 처리
                    parts = re.findall(r'\d+', match)
                    if len(parts) >= 3:
                        normalized_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                        dates.append(normalized_date)
                else:
                    # 'YYYY-MM-DD' 또는 'YYYY.MM.DD' 형식 처리
                    normalized_date = match.replace('.', '-')
                    
                    # 월/일이 한 자리 숫자인 경우 두 자리로 패딩
                    parts = normalized_date.split('-')
                    if len(parts) == 3:
                        normalized_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                        
                    dates.append(normalized_date)
        
        # 날짜가 두 개 이상 발견된 경우 (시작일과 종료일)
        if len(dates) >= 2:
            # 날짜 정렬
            dates.sort()
            time_range['start'] = dates[0]
            time_range['end'] = dates[-1]
            return time_range
        # 날짜가 하나만 발견된 경우
        elif len(dates) == 1:
            # "~부터" 패턴 확인
            if '부터' in text or '이후' in text:
                time_range['start'] = dates[0]
                time_range['end'] = datetime.now().strftime('%Y-%m-%d')
            # "~까지" 패턴 확인
            elif '까지' in text or '이전' in text:
                time_range['start'] = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
                time_range['end'] = dates[0]
            # 특정일 패턴
            else:
                time_range['start'] = dates[0]
                time_range['end'] = dates[0]
            return time_range
        
        # 시간 범위가 발견되지 않은 경우
        return None
    
    def process_query(self, text: str) -> Dict[str, Any]:
        """
        사용자 질문을 종합적으로 처리
        
        Args:
            text: 사용자 질문
            
        Returns:
            처리 결과 딕셔너리
        """
        # 1. 키워드 추출 및 가중치 부여
        keywords_with_weights = self.preprocess_query(text)
        
        # 2. 의도 분석
        intent = self.analyze_query_intent(text)
        
        # 3. 메인 쿼리 생성
        main_query = self.build_bigkinds_query(keywords_with_weights, QueryStrategy.AND)
        
        # 4. 폴백 쿼리 생성
        fallback_queries = self.create_fallback_queries(keywords_with_weights)
        
        # 5. 결과 통합
        result = {
            "original_text": text,
            "keywords": [{"keyword": k[0], "weight": k[1]} for k in keywords_with_weights],
            "intent": intent,
            "main_query": main_query,
            "fallback_queries": [{"query": q[0], "description": q[1], "strategy": q[2]} for q in fallback_queries],
            "processed_at": datetime.now().isoformat()
        }
        
        return result


# 사용 예시
if __name__ == "__main__":
    # 프로세서 초기화
    processor = QueryProcessor()
    
    # 테스트 쿼리
    test_queries = [
        "삼성전자 최근 실적이 어떤지 알려줘",
        "LG전자와 삼성전자의 스마트폰 시장 점유율 비교",
        "코로나19가 백신 개발에 미친 영향 분석해줘",
        "2023년 3월부터 2023년 6월까지의 금리 변화 추이",
        "인공지능 기술 최신 동향 정리해줘",
        "네이버 주가 실황이 궁금해요"
    ]
    
    # 각 쿼리 처리 및 결과 출력
    for query in test_queries:
        print("\n" + "="*50)
        print(f"원본 질문: {query}")
        
        result = processor.process_query(query)
        
        print(f"\n키워드 추출 결과:")
        for kw in result["keywords"]:
            print(f"  - {kw['keyword']} (가중치: {kw['weight']:.2f})")
        
        print(f"\n쿼리 의도:")
        print(f"  - 타입: {result['intent']['query_type']}")
        print(f"  - 실시간성: {'예' if result['intent']['time_sensitive'] else '아니오'}")
        print(f"  - 비교 분석: {'예' if result['intent']['comparison'] else '아니오'}")
        print(f"  - 분석 깊이: {result['intent']['analysis_depth']}")
        if result['intent']['time_range']:
            print(f"  - 시간 범위: {result['intent']['time_range']['start']} ~ {result['intent']['time_range']['end']}")
        
        print(f"\n메인 쿼리: {result['main_query']}")
        
        print("\n폴백 쿼리:")
        for i, fq in enumerate(result["fallback_queries"], 1):
            print(f"  {i}. {fq['description']}")
            print(f"     쿼리: {fq['query']}")