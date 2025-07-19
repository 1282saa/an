"""
Kiwi 기반 뉴스 검색 키워드 추출기

기존 단순 단어 분리 방식의 문제점을 해결하고
형태소 분석을 통한 정확한 키워드 추출을 제공합니다.
"""

from kiwipiepy import Kiwi
from typing import List, Dict, Tuple, Set
import re
import time
from functools import lru_cache


class KiwiKeywordExtractor:
    """Kiwi 기반 뉴스 검색 키워드 추출기"""
    
    def __init__(self):
        """초기화 및 사용자 사전 구축"""
        self.kiwi = Kiwi()
        self._setup_user_dictionary()
        
        # 검색용 품사 태그 정의 (중요도 순)
        self.search_tags = {
            'NNP': 1.0,  # 고유명사 (삼성전자, 네이버) - 최고 중요도
            'SL': 0.9,   # 외국어 (HBM, AI, GPU)
            'NNG': 0.8,  # 일반명사 (반도체, 상황)
            'SN': 0.6,   # 숫자 (2024, 10%)
            'NR': 0.5    # 수사 (첫째, 둘째)
        }
        
        # 뉴스 검색에서 제외할 불용어
        self.stopwords = {
            # 일반적인 불용어
            '것', '등', '및', '또는', '그리고', '하지만', '그러나', '그런데',
            '이것', '그것', '저것', '여기', '거기', '저기', '이곳', '그곳',
            '때문', '경우', '상황', '문제', '방법', '결과', '과정', '내용',
            '이유', '원인', '목적', '효과', '영향', '변화', '차이', '관계',
            '정도', '수준', '범위', '규모', '크기', '높이', '길이', '시간',
            '이번', '이전', '다음', '최근', '현재', '앞으로', '이후', '향후',
            
            # 뉴스 관련 불용어
            '기자', '취재', '보도', '발표', '공개', '발간', '게재', '소개',
            '뉴스', '기사', '언론', '매체', '신문', '방송', '온라인'
        }
        
        # 초기화 완료 로그
        print("✅ KiwiKeywordExtractor 초기화 완료")
    
    def _setup_user_dictionary(self):
        """뉴스 도메인 특화 사용자 사전 구축"""
        
        # 기술/IT 용어 - 고유명사로 처리
        tech_terms = [
            'HBM', 'GPU', 'CPU', 'AI', 'ChatGPT', 'LLM', 'API',
            'NFT', '메타버스', 'VR', 'AR', 'IoT', '5G', '6G',
            'SaaS', 'PaaS', 'IaaS', 'AWS', 'Azure', 'GCP',
            'ML', 'DL', 'NLP', 'CV', 'AGI', 'ASI',
            'JavaScript', 'Python', 'Java', 'React', 'Vue',
            'GitHub', 'Docker', 'Kubernetes', 'DevOps'
        ]
        
        # 경제/금융 용어 - 고유명사로 처리
        finance_terms = [
            'ESG', 'IPO', 'M&A', 'GDP', 'CPI', 'PPI',
            'KOSPI', 'KOSDAQ', 'NASDAQ', 'S&P500', 'DOW',
            'ETF', 'REITs', 'KRW', 'USD', 'EUR', 'JPY',
            'B2B', 'B2C', 'B2G', 'ROI', 'ROE', 'EBITDA',
            'VC', 'PE', 'IB', 'CB', 'BW', 'DR'
        ]
        
        # 한국 주요 기업명 - 고유명사로 처리
        korean_companies = [
            '삼성전자', '네이버', '카카오', '현대차', 'LG전자', 'SK하이닉스',
            '포스코', '셀트리온', '바이오니아', 'NAVER', 'Kakao',
            'LG화학', 'SK이노베이션', '현대모비스', '기아',
            '삼성바이오로직스', '삼성SDI', 'LG디스플레이',
            'SK텔레콤', 'KT', 'LG유플러스', '우리은행', 'KB금융',
            '신한금융', '하나금융', '농협금융', 'IBK기업은행'
        ]
        
        # 글로벌 기업명 - 고유명사로 처리
        global_companies = [
            'Apple', 'Google', 'Microsoft', 'Amazon', 'Meta',
            'Tesla', 'Netflix', 'Spotify', 'Uber', 'Airbnb',
            'Twitter', 'Instagram', 'YouTube', 'TikTok',
            'NVIDIA', 'Intel', 'AMD', 'Qualcomm', 'TSMC',
            'Sony', 'Nintendo', 'Samsung', 'Huawei', 'Xiaomi'
        ]
        
        # 산업/분야 용어 - 일반명사로 처리
        industry_terms = [
            '반도체', '바이오', '헬스케어', '핀테크', '에듀테크',
            '푸드테크', '애그테크', '클린테크', '리테일테크',
            '모빌리티', 'e커머스', '디지털전환', '스마트팩토리',
            '빅데이터', '클라우드컴퓨팅', '사이버보안', '로보틱스'
        ]
        
        # 사용자 사전에 추가
        all_proper_nouns = tech_terms + finance_terms + korean_companies + global_companies
        for term in all_proper_nouns:
            self.kiwi.add_user_word(term, 'NNP')  # 고유명사로 등록
        
        for term in industry_terms:
            self.kiwi.add_user_word(term, 'NNG')  # 일반명사로 등록
        
        print(f"📚 사용자 사전 등록 완료: {len(all_proper_nouns + industry_terms)}개 용어")
    
    @lru_cache(maxsize=1000)
    def extract_keywords(self, query: str, min_length: int = 2, max_keywords: int = 10) -> List[str]:
        """
        검색 쿼리에서 키워드 추출
        
        Args:
            query: 사용자 검색 쿼리
            min_length: 최소 키워드 길이
            max_keywords: 최대 키워드 개수
            
        Returns:
            추출된 키워드 리스트 (중요도 순)
        """
        if not query or not query.strip():
            return []
        
        # 1. 전처리
        query = self._preprocess_query(query)
        
        # 2. 형태소 분석
        try:
            result = self.kiwi.analyze(query)
            tokens = result[0][0]  # 첫 번째 분석 결과의 토큰들
        except Exception as e:
            print(f"❌ 형태소 분석 오류: {e}")
            return self._fallback_extraction(query, min_length, max_keywords)
        
        # 3. 키워드 후보 추출 및 점수 계산
        keyword_candidates = []
        for token in tokens:
            if (token.tag in self.search_tags and 
                len(token.form) >= min_length and
                token.form not in self.stopwords and
                self._is_valid_keyword(token.form)):
                
                # 품사별 가중치 적용
                weight = self.search_tags[token.tag]
                # 길이 보너스 (긴 키워드일수록 중요)
                weight += min(len(token.form) * 0.05, 0.3)
                
                keyword_candidates.append((token.form, weight))
        
        # 4. 중복 제거 및 점수 기준 정렬
        unique_keywords = {}
        for keyword, weight in keyword_candidates:
            if keyword in unique_keywords:
                unique_keywords[keyword] = max(unique_keywords[keyword], weight)
            else:
                unique_keywords[keyword] = weight
        
        # 5. 점수 순으로 정렬 후 상위 키워드 반환
        sorted_keywords = sorted(unique_keywords.items(), key=lambda x: x[1], reverse=True)
        return [keyword for keyword, _ in sorted_keywords[:max_keywords]]
    
    def extract_with_morphemes(self, query: str) -> List[Dict]:
        """
        키워드와 함께 형태소 정보도 반환
        
        Args:
            query: 사용자 검색 쿼리
            
        Returns:
            키워드 정보 리스트 (형태소, 품사, 점수 포함)
        """
        if not query or not query.strip():
            return []
        
        query = self._preprocess_query(query)
        
        try:
            result = self.kiwi.analyze(query)
            tokens = result[0][0]
        except Exception as e:
            print(f"❌ 형태소 분석 오류: {e}")
            return []
        
        keyword_info = []
        for token in tokens:
            if (token.tag in self.search_tags and 
                len(token.form) >= 2 and
                token.form not in self.stopwords and
                self._is_valid_keyword(token.form)):
                
                weight = self.search_tags[token.tag]
                weight += min(len(token.form) * 0.05, 0.3)
                
                keyword_info.append({
                    'keyword': token.form,
                    'pos': token.tag,
                    'weight': round(weight, 3),
                    'description': self._get_pos_description(token.tag)
                })
        
        # 점수 순으로 정렬
        keyword_info.sort(key=lambda x: x['weight'], reverse=True)
        return keyword_info
    
    def extract_for_news_search(self, query: str) -> Dict[str, List[str]]:
        """
        뉴스 검색에 최적화된 키워드 추출
        
        Args:
            query: 사용자 검색 쿼리
            
        Returns:
            카테고리별로 분류된 키워드
        """
        keywords = self.extract_keywords(query, max_keywords=15)
        
        categorized = {
            'primary': [],      # 주요 키워드 (고유명사, 전문용어)
            'secondary': [],    # 보조 키워드 (일반명사)
            'numeric': [],      # 숫자/수치 관련
            'all': keywords     # 전체 키워드
        }
        
        for keyword in keywords:
            # 키워드 재분석하여 품사 확인
            try:
                result = self.kiwi.analyze(keyword)
                if result[0][0]:
                    main_pos = result[0][0][0].tag
                    
                    if main_pos == 'NNP' or main_pos == 'SL':
                        categorized['primary'].append(keyword)
                    elif main_pos == 'NNG':
                        categorized['secondary'].append(keyword)
                    elif main_pos in ['SN', 'NR']:
                        categorized['numeric'].append(keyword)
                    else:
                        categorized['secondary'].append(keyword)
            except:
                categorized['secondary'].append(keyword)
        
        return categorized
    
    def generate_search_queries(self, query: str) -> List[str]:
        """
        키워드를 조합한 검색 쿼리 생성
        
        Args:
            query: 사용자 검색 쿼리
            
        Returns:
            생성된 검색 쿼리 리스트
        """
        categorized = self.extract_for_news_search(query)
        search_queries = []
        
        # 전략 1: 주요 키워드만 사용
        if categorized['primary']:
            if len(categorized['primary']) >= 2:
                # 주요 키워드 2개 조합
                search_queries.append(f"{categorized['primary'][0]} AND {categorized['primary'][1]}")
            
            # 주요 키워드 + 보조 키워드
            if categorized['secondary']:
                search_queries.append(f"{categorized['primary'][0]} AND {categorized['secondary'][0]}")
        
        # 전략 2: 포괄적 OR 검색
        if len(categorized['primary']) >= 2:
            primary_or = " OR ".join(categorized['primary'][:3])
            search_queries.append(f"({primary_or})")
        
        # 전략 3: 전체 키워드 AND 검색 (엄격한 검색)
        if len(categorized['all']) >= 2:
            search_queries.append(" AND ".join(categorized['all'][:3]))
        
        # 기본 쿼리가 없으면 원본 쿼리 사용
        if not search_queries:
            search_queries.append(query)
        
        return search_queries
    
    def _preprocess_query(self, query: str) -> str:
        """쿼리 전처리"""
        # 특수문자 정리 (일부 유지)
        query = re.sub(r'[^\w\s가-힣.%]', ' ', query)
        # 연속 공백 제거
        query = re.sub(r'\s+', ' ', query).strip()
        return query
    
    def _is_valid_keyword(self, word: str) -> bool:
        """유효한 키워드인지 검증"""
        # 1-3자리 숫자만 있는 경우 제외 (연도 등 4자리는 포함)
        if word.isdigit() and len(word) < 4:
            return False
        
        # 한글 자음/모음만 있는 경우 제외
        if re.match(r'^[ㄱ-ㅎㅏ-ㅣ]+$', word):
            return False
        
        # 영문자 1글자만 있는 경우 제외
        if re.match(r'^[a-zA-Z]$', word):
            return False
        
        # 특수문자만 있는 경우 제외
        if re.match(r'^[^\w가-힣]+$', word):
            return False
        
        return True
    
    def _get_pos_description(self, pos_tag: str) -> str:
        """품사 태그 설명"""
        descriptions = {
            'NNP': '고유명사',
            'NNG': '일반명사', 
            'SL': '외국어',
            'SN': '숫자',
            'NR': '수사'
        }
        return descriptions.get(pos_tag, '기타')
    
    def _fallback_extraction(self, query: str, min_length: int, max_keywords: int) -> List[str]:
        """형태소 분석 실패 시 대체 키워드 추출"""
        print("⚠️ 형태소 분석 실패 - 대체 방법 사용")
        
        # 간단한 단어 분리 및 필터링
        words = re.findall(r'\b\w+\b', query)
        keywords = []
        
        for word in words:
            if (len(word) >= min_length and 
                word not in self.stopwords and
                self._is_valid_keyword(word)):
                keywords.append(word)
        
        return keywords[:max_keywords]
    
    def benchmark(self, test_queries: List[str]) -> Dict:
        """키워드 추출 성능 벤치마크"""
        results = {
            'total_queries': len(test_queries),
            'avg_time_ms': 0,
            'results': []
        }
        
        total_time = 0
        for query in test_queries:
            start_time = time.time()
            keywords = self.extract_keywords(query)
            end_time = time.time()
            
            processing_time = (end_time - start_time) * 1000
            total_time += processing_time
            
            results['results'].append({
                'query': query,
                'keywords': keywords,
                'time_ms': round(processing_time, 2)
            })
        
        results['avg_time_ms'] = round(total_time / len(test_queries), 2)
        return results


# 사용 예시 및 테스트
if __name__ == "__main__":
    extractor = KiwiKeywordExtractor()
    
    # 테스트 쿼리들
    test_queries = [
        "삼성전자와 HBM 반도체 상황",
        "네이버 ChatGPT AI 검색 서비스 출시",
        "현대차의 전기차 2024년 판매 실적",
        "카카오톡에서 메타버스 기능 추가",
        "SK하이닉스 메모리 반도체 글로벌 시장 진출"
    ]
    
    print("\n🔍 키워드 추출 테스트:")
    print("=" * 80)
    
    for query in test_queries:
        print(f"\n📝 쿼리: {query}")
        
        # 기본 키워드 추출
        keywords = extractor.extract_keywords(query)
        print(f"키워드: {keywords}")
        
        # 상세 정보 포함 추출
        detailed = extractor.extract_with_morphemes(query)
        print("상세 정보:")
        for info in detailed[:5]:  # 상위 5개만
            print(f"  {info['keyword']} ({info['description']}) - {info['weight']}")
        
        # 검색 쿼리 생성
        search_queries = extractor.generate_search_queries(query)
        print(f"검색 쿼리: {search_queries}")
        print("-" * 60) 