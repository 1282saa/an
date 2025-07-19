"""
개선된 검색 전략: 정확도 우선 접근법

기존 키워드 확장으로 인한 관련성 저하 문제를 해결하고
사용자가 입력한 정확한 키워드 중심의 검색을 수행합니다.
"""

from typing import List, Dict, Any
import logging

class ImprovedSearchStrategy:
    """개선된 검색 전략 클래스"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 절대 확장하지 말아야 할 정확한 기업명
        self.exact_company_names = {
            "삼성전자", "LG전자", "SK하이닉스", "현대차", "현대자동차",
            "네이버", "카카오", "포스코", "셀트리온", "바이오니아"
        }
        
        # 전문 용어 (확장 금지)
        self.technical_terms = {
            "HBM", "GPU", "CPU", "AI", "ChatGPT", "LLM",
            "NFT", "메타버스", "IoT", "5G", "6G", "ESG"
        }
    
    def should_use_exact_search(self, keywords: List[str]) -> bool:
        """정확한 검색을 사용해야 하는지 판단"""
        
        # 정확한 기업명이나 전문용어가 포함된 경우 정확한 검색 사용
        for keyword in keywords:
            if (keyword in self.exact_company_names or 
                keyword in self.technical_terms):
                return True
        
        # 2개 이상의 구체적 키워드가 있으면 정확한 검색
        if len(keywords) >= 2:
            return True
            
        return False
    
    def filter_documents_exact(self, documents: List[Dict[str, Any]], keywords: List[str]) -> List[Dict[str, Any]]:
        """정확한 키워드 매칭 기반 문서 필터링"""
        
        if not documents or not keywords:
            return documents
        
        filtered_docs = []
        
        for doc in documents:
            title = doc.get("title", "").lower()
            content = doc.get("content", "").lower()
            full_text = f"{title} {content}"
            
            # 모든 키워드가 정확히 포함되어야 함
            all_keywords_found = True
            title_matches = 0
            
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if keyword_lower not in full_text:
                    all_keywords_found = False
                    break
                
                # 제목에 포함된 키워드 개수 계산
                if keyword_lower in title:
                    title_matches += 1
            
            if all_keywords_found:
                # 관련성 점수 계산 (제목 포함 > 내용만 포함)
                relevance_score = title_matches * 10 + len(keywords)
                doc["_relevance_score"] = relevance_score
                filtered_docs.append(doc)
        
        # 관련성 점수로 정렬
        filtered_docs.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
        
        self.logger.info(f"정확한 검색: {keywords} 모두 포함, {len(filtered_docs)}/{len(documents)} 선택됨")
        
        return filtered_docs
    
    def generate_search_queries_conservative(self, keywords: List[str]) -> List[str]:
        """보수적 검색 쿼리 생성 (확장 최소화)"""
        
        if not keywords:
            return []
        
        search_queries = []
        
        # 전략 1: 모든 키워드 AND 검색 (가장 정확한 방법)
        if len(keywords) >= 2:
            exact_query = " AND ".join(f'"{kw}"' for kw in keywords[:3])
            search_queries.append(exact_query)
        
        # 전략 2: 주요 키워드 2개 조합
        if len(keywords) >= 2:
            primary_query = f'"{keywords[0]}" AND "{keywords[1]}"'
            search_queries.append(primary_query)
        
        # 전략 3: 단일 키워드 (마지막 수단)
        if keywords:
            single_query = f'"{keywords[0]}"'
            search_queries.append(single_query)
        
        return search_queries
    
    def validate_search_relevance(self, articles: List[Dict[str, Any]], original_keywords: List[str]) -> List[Dict[str, Any]]:
        """검색 결과의 관련성을 엄격하게 검증"""
        
        validated_articles = []
        
        for article in articles:
            title = article.get("title", "").lower()
            content = article.get("content", "").lower()
            full_text = f"{title} {content}"
            
            # 관련성 점수 계산
            relevance_score = 0
            keyword_matches = 0
            
            for keyword in original_keywords:
                keyword_lower = keyword.lower()
                
                # 키워드가 포함되어 있는지 확인
                if keyword_lower in full_text:
                    keyword_matches += 1
                    
                    # 제목에 있으면 더 높은 점수
                    if keyword_lower in title:
                        relevance_score += 10
                    else:
                        relevance_score += 5
            
            # 키워드 매칭률 계산
            match_ratio = keyword_matches / len(original_keywords)
            
            # 50% 이상 매칭된 기사만 선택 (기존 완화된 기준보다 엄격)
            if match_ratio >= 0.5:
                article["_relevance_score"] = relevance_score
                article["_match_ratio"] = match_ratio
                validated_articles.append(article)
        
        # 관련성 점수로 정렬
        validated_articles.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
        
        self.logger.info(f"관련성 검증: {len(validated_articles)}/{len(articles)} 기사가 기준 통과")
        
        return validated_articles
    
    def get_search_strategy_info(self, keywords: List[str]) -> Dict[str, Any]:
        """사용된 검색 전략 정보 반환"""
        
        use_exact = self.should_use_exact_search(keywords)
        
        return {
            "strategy_type": "exact_search" if use_exact else "flexible_search",
            "keyword_expansion": False if use_exact else True,
            "strict_filtering": True if use_exact else False,
            "reason": self._get_strategy_reason(keywords, use_exact)
        }
    
    def _get_strategy_reason(self, keywords: List[str], use_exact: bool) -> str:
        """전략 선택 이유 설명"""
        
        if use_exact:
            reasons = []
            
            for keyword in keywords:
                if keyword in self.exact_company_names:
                    reasons.append(f"정확한 기업명 '{keyword}' 포함")
                elif keyword in self.technical_terms:
                    reasons.append(f"전문용어 '{keyword}' 포함")
            
            if len(keywords) >= 2:
                reasons.append("복수 키워드로 구체적 검색")
            
            return " | ".join(reasons) if reasons else "정확한 검색 필요"
        else:
            return "일반적인 유연한 검색"


# 사용 예시
if __name__ == "__main__":
    strategy = ImprovedSearchStrategy()
    
    # 테스트 케이스
    test_cases = [
        ["삼성전자", "HBM"],
        ["네이버", "AI", "검색"],
        ["현대차", "전기차"],
        ["경제", "성장"]  # 일반적인 키워드
    ]
    
    for keywords in test_cases:
        print(f"\n키워드: {keywords}")
        
        # 검색 전략 결정
        use_exact = strategy.should_use_exact_search(keywords)
        print(f"정확한 검색 사용: {use_exact}")
        
        # 검색 쿼리 생성
        queries = strategy.generate_search_queries_conservative(keywords)
        print(f"생성된 쿼리: {queries}")
        
        # 전략 정보
        info = strategy.get_search_strategy_info(keywords)
        print(f"전략 정보: {info}")
        print("-" * 50) 