"""
정확성 향상 모듈

뉴스 검색과 AI 응답의 정확성을 높이기 위한 
다양한 검증 및 필터링 기능을 제공합니다.
"""

from typing import List, Dict, Any, Tuple, Set
import re
from collections import Counter
from datetime import datetime, timedelta
import logging

class AccuracyEnhancer:
    """정확성 향상을 위한 검증 및 필터링 클래스"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 신뢰도 높은 언론사 리스트 (가중치 부여)
        self.trusted_providers = {
            # 1급 신뢰도 (가중치 1.0)
            "연합뉴스": 1.0,
            "한국경제": 1.0,
            "매일경제": 1.0,
            "서울경제": 1.0,
            "아시아경제": 1.0,
            
            # 2급 신뢰도 (가중치 0.9)
            "조선일보": 0.9,
            "중앙일보": 0.9,
            "동아일보": 0.9,
            "한겨레": 0.9,
            "경향신문": 0.9,
            
            # 3급 신뢰도 (가중치 0.8)
            "파이낸셜뉴스": 0.8,
            "이데일리": 0.8,
            "뉴스핀": 0.8,
            "머니투데이": 0.8,
            
            # 디폴트 (가중치 0.7)
        }
        
        # 사실 확인이 필요한 민감한 키워드들
        self.sensitive_keywords = {
            "주가", "실적", "매출", "영업이익", "순이익", "손실",
            "인수", "합병", "파산", "회생", "법정관리", "구조조정",
            "임원", "사장", "회장", "대표이사", "인사", "사임", "해임",
            "제재", "수사", "기소", "판결", "벌금", "과징금"
        }
        
        # 수치 정보 패턴
        self.numeric_patterns = [
            r'\d+\s*조\s*원',  # 조원
            r'\d+\s*억\s*원',  # 억원
            r'\d+\s*만\s*원',  # 만원
            r'\d+\.?\d*%',     # 퍼센트
            r'\d+\.?\d*배',    # 배수
            r'\d{4}년\s*\d{1,2}월',  # 년월
        ]
    
    def validate_article_relevance(
        self, 
        article: Dict[str, Any], 
        keywords: List[str],
        question: str
    ) -> Tuple[bool, float, str]:
        """기사 관련성 엄격 검증"""
        
        title = article.get("title", "").lower()
        content = article.get("content", "").lower()
        full_text = f"{title} {content}"
        
        # 1. 키워드 매칭 검증
        keyword_score = self._calculate_keyword_relevance(full_text, keywords)
        
        # 2. 제목 중요도 검증
        title_score = self._calculate_title_relevance(title, keywords)
        
        # 3. 시간적 관련성 검증
        temporal_score = self._calculate_temporal_relevance(article)
        
        # 4. 언론사 신뢰도 검증
        provider_score = self._calculate_provider_credibility(article)
        
        # 5. 내용 품질 검증
        content_score = self._calculate_content_quality(article)
        
        # 종합 점수 계산
        total_score = (
            keyword_score * 0.4 +      # 키워드 매칭 40%
            title_score * 0.25 +       # 제목 관련성 25%
            temporal_score * 0.15 +    # 시간적 관련성 15%
            provider_score * 0.1 +     # 언론사 신뢰도 10%
            content_score * 0.1        # 내용 품질 10%
        )
        
        # 검증 통과 기준: 70% 이상
        is_relevant = total_score >= 0.7
        
        # 검증 사유 생성
        reason = self._generate_validation_reason(
            keyword_score, title_score, temporal_score, 
            provider_score, content_score, keywords
        )
        
        return is_relevant, total_score, reason
    
    def _calculate_keyword_relevance(self, text: str, keywords: List[str]) -> float:
        """키워드 관련성 점수 계산"""
        
        if not keywords:
            return 0.0
        
        matches = 0
        exact_matches = 0
        
        for keyword in keywords[:5]:  # 상위 5개 키워드만 체크
            keyword_lower = keyword.lower()
            
            if keyword_lower in text:
                matches += 1
                
                # 정확한 매칭 (단어 경계 고려)
                if re.search(rf'\\b{re.escape(keyword_lower)}\\b', text):
                    exact_matches += 1
        
        # 기본 매칭률 + 정확한 매칭 보너스
        basic_score = matches / len(keywords[:5])
        exact_bonus = exact_matches / len(keywords[:5]) * 0.3
        
        return min(basic_score + exact_bonus, 1.0)
    
    def _calculate_title_relevance(self, title: str, keywords: List[str]) -> float:
        """제목 관련성 점수 계산"""
        
        if not keywords or not title:
            return 0.0
        
        title_matches = sum(1 for kw in keywords[:3] if kw.lower() in title)
        return title_matches / len(keywords[:3])
    
    def _calculate_temporal_relevance(self, article: Dict[str, Any]) -> float:
        """시간적 관련성 점수 계산"""
        
        published_at = article.get("published_at", "")
        if not published_at:
            return 0.5  # 중간값
        
        try:
            # 날짜 파싱 시도
            if isinstance(published_at, str):
                # 다양한 날짜 형식 처리
                for fmt in ["%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"]:
                    try:
                        pub_date = datetime.strptime(published_at.split()[0], fmt)
                        break
                    except ValueError:
                        continue
                else:
                    return 0.5  # 파싱 실패 시 중간값
            
            # 현재와의 시간 차이 계산
            now = datetime.now()
            time_diff = (now - pub_date).days
            
            # 최신일수록 높은 점수 (7일 이내 1.0, 30일 이내 0.8, 그 이후 0.6)
            if time_diff <= 7:
                return 1.0
            elif time_diff <= 30:
                return 0.8
            elif time_diff <= 90:
                return 0.6
            else:
                return 0.4
                
        except Exception as e:
            self.logger.warning(f"시간적 관련성 계산 실패: {e}")
            return 0.5
    
    def _calculate_provider_credibility(self, article: Dict[str, Any]) -> float:
        """언론사 신뢰도 점수 계산"""
        
        provider = article.get("provider", "").strip()
        if not provider:
            return 0.7  # 기본값
        
        # 신뢰도 사전에서 찾기
        for trusted_provider, score in self.trusted_providers.items():
            if trusted_provider in provider:
                return score
        
        return 0.7  # 기본값
    
    def _calculate_content_quality(self, article: Dict[str, Any]) -> float:
        """내용 품질 점수 계산"""
        
        title = article.get("title", "")
        content = article.get("content", "")
        
        quality_score = 0.5  # 기본값
        
        # 제목 품질 체크
        if len(title) >= 10 and len(title) <= 100:
            quality_score += 0.1
        
        # 내용 길이 체크
        if len(content) >= 100:
            quality_score += 0.2
        
        # 구체적 정보 포함 여부
        if any(re.search(pattern, content) for pattern in self.numeric_patterns):
            quality_score += 0.2  # 수치 정보 포함
        
        return min(quality_score, 1.0)
    
    def _generate_validation_reason(
        self, 
        keyword_score: float, 
        title_score: float, 
        temporal_score: float,
        provider_score: float, 
        content_score: float, 
        keywords: List[str]
    ) -> str:
        """검증 사유 생성"""
        
        reasons = []
        
        if keyword_score >= 0.8:
            reasons.append("키워드 매칭 우수")
        elif keyword_score < 0.5:
            reasons.append("키워드 매칭 부족")
        
        if title_score >= 0.7:
            reasons.append("제목 관련성 높음")
        
        if temporal_score >= 0.8:
            reasons.append("최신 기사")
        
        if provider_score >= 0.9:
            reasons.append("신뢰도 높은 언론사")
        
        return " | ".join(reasons) if reasons else "일반적 관련성"
    
    def fact_check_ai_response(
        self, 
        ai_response: str, 
        articles: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """AI 응답 팩트체킹"""
        
        # 기사에서 검증 가능한 사실들 추출
        verifiable_facts = self._extract_verifiable_facts(articles)
        
        # AI 응답에서 주장/사실 추출
        ai_claims = self._extract_ai_claims(ai_response)
        
        # 팩트체킹 결과
        fact_check_results = []
        
        for claim in ai_claims:
            verification_result = self._verify_claim_against_facts(claim, verifiable_facts)
            fact_check_results.append({
                "claim": claim,
                "verification": verification_result["status"],
                "confidence": verification_result["confidence"],
                "supporting_evidence": verification_result["evidence"]
            })
        
        # 전체 신뢰도 점수 계산
        verified_claims = [r for r in fact_check_results if r["verification"] == "verified"]
        overall_accuracy = len(verified_claims) / len(fact_check_results) if fact_check_results else 0.0
        
        return {
            "overall_accuracy": overall_accuracy,
            "fact_check_results": fact_check_results,
            "verifiable_facts_count": len(verifiable_facts),
            "ai_claims_count": len(ai_claims)
        }
    
    def _extract_verifiable_facts(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """기사에서 검증 가능한 사실들 추출"""
        
        facts = []
        
        for article in articles:
            content = article.get("content", "")
            title = article.get("title", "")
            full_text = f"{title} {content}"
            
            # 수치 정보 추출
            for pattern in self.numeric_patterns:
                matches = re.finditer(pattern, full_text)
                for match in matches:
                    facts.append({
                        "type": "numeric",
                        "value": match.group(),
                        "context": full_text[max(0, match.start()-50):match.end()+50],
                        "source": article.get("provider", "")
                    })
            
            # 인명/직책 정보 추출
            name_pattern = r'([가-힣]{2,4})\s*(대표|회장|사장|부사장|상무|이사|부장|팀장|위원장|장관|차관)'
            name_matches = re.finditer(name_pattern, full_text)
            for match in name_matches:
                facts.append({
                    "type": "person",
                    "value": match.group(),
                    "context": full_text[max(0, match.start()-30):match.end()+30],
                    "source": article.get("provider", "")
                })
        
        return facts
    
    def _extract_ai_claims(self, ai_response: str) -> List[str]:
        """AI 응답에서 주장/사실 추출"""
        
        # 문장 단위로 분리
        sentences = re.split(r'[.!?]\s+', ai_response)
        
        claims = []
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:  # 의미있는 길이의 문장만
                # 인용 번호 제거
                clean_sentence = re.sub(r'(\S)(\d+)(?=\s|$)', r'\1', sentence)
                claims.append(clean_sentence.strip())
        
        return claims
    
    def _verify_claim_against_facts(
        self, 
        claim: str, 
        facts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """사실과 대조하여 주장 검증"""
        
        supporting_evidence = []
        confidence = 0.0
        
        claim_lower = claim.lower()
        
        for fact in facts:
            fact_value = fact["value"].lower()
            
            # 단순 포함 관계 체크
            if fact_value in claim_lower or any(word in claim_lower for word in fact_value.split()):
                supporting_evidence.append(fact)
                confidence += 0.3
        
        # 검증 상태 결정
        if confidence >= 0.7:
            status = "verified"
        elif confidence >= 0.3:
            status = "partially_verified"
        else:
            status = "unverified"
        
        return {
            "status": status,
            "confidence": min(confidence, 1.0),
            "evidence": supporting_evidence
        }
    
    def enhance_search_precision(
        self, 
        keywords: List[str], 
        question: str
    ) -> Dict[str, Any]:
        """검색 정밀도 향상을 위한 키워드 최적화"""
        
        # 핵심 키워드 식별
        core_keywords = self._identify_core_keywords(keywords, question)
        
        # 보조 키워드 생성
        supporting_keywords = self._generate_supporting_keywords(keywords, question)
        
        # 제외 키워드 생성 (노이즈 감소)
        exclude_keywords = self._generate_exclude_keywords(keywords, question)
        
        # 검색 우선순위 설정
        search_priority = self._set_search_priority(core_keywords, supporting_keywords)
        
        return {
            "core_keywords": core_keywords,
            "supporting_keywords": supporting_keywords,
            "exclude_keywords": exclude_keywords,
            "search_priority": search_priority,
            "precision_strategy": "AND_first_OR_fallback"
        }
    
    def _identify_core_keywords(self, keywords: List[str], question: str) -> List[str]:
        """핵심 키워드 식별"""
        
        # 고유명사나 전문용어를 핵심으로 식별
        core_indicators = [
            "삼성전자", "lg전자", "sk하이닉스", "현대차", "네이버", "카카오",
            "hbm", "gpu", "cpu", "ai", "반도체", "메모리"
        ]
        
        core_keywords = []
        for keyword in keywords[:3]:  # 상위 3개까지만
            if any(indicator in keyword.lower() for indicator in core_indicators):
                core_keywords.append(keyword)
            elif keyword in question:  # 질문에 직접 포함된 키워드
                core_keywords.append(keyword)
        
        return core_keywords[:2]  # 최대 2개
    
    def _generate_supporting_keywords(self, keywords: List[str], question: str) -> List[str]:
        """보조 키워드 생성"""
        
        supporting = []
        for keyword in keywords[2:]:  # 핵심 이후 키워드들
            if len(supporting) < 3:
                supporting.append(keyword)
        
        return supporting
    
    def _generate_exclude_keywords(self, keywords: List[str], question: str) -> List[str]:
        """제외 키워드 생성 (노이즈 감소용)"""
        
        # 일반적인 노이즈 키워드들
        noise_keywords = [
            "노쇼", "사기", "부동산", "매매", "아파트", "전세",
            "아트워크", "슈퍼맨", "영화", "공개", "이벤트"
        ]
        
        # 질문 맥락과 맞지 않는 키워드들 찾기
        exclude = []
        question_lower = question.lower()
        
        if "반도체" in question_lower or "hbm" in question_lower:
            exclude.extend(["아트워크", "슈퍼맨", "영화", "노쇼", "사기"])
        
        if "실적" in question_lower or "매출" in question_lower:
            exclude.extend(["부동산", "아파트", "전세"])
        
        return exclude
    
    def _set_search_priority(
        self, 
        core_keywords: List[str], 
        supporting_keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """검색 우선순위 설정"""
        
        priority_queries = []
        
        # 1순위: 핵심 키워드 AND 검색
        if len(core_keywords) >= 2:
            priority_queries.append({
                "priority": 1,
                "strategy": "AND",
                "keywords": core_keywords,
                "weight": 1.0
            })
        
        # 2순위: 핵심 + 보조 키워드 OR 검색
        if core_keywords and supporting_keywords:
            priority_queries.append({
                "priority": 2,
                "strategy": "OR",
                "keywords": core_keywords + supporting_keywords[:1],
                "weight": 0.8
            })
        
        # 3순위: 단일 핵심 키워드 검색
        if core_keywords:
            priority_queries.append({
                "priority": 3,
                "strategy": "SINGLE",
                "keywords": [core_keywords[0]],
                "weight": 0.6
            })
        
        return priority_queries

# 사용 예시
if __name__ == "__main__":
    enhancer = AccuracyEnhancer()
    
    # 예시 기사
    sample_article = {
        "title": "삼성전자, 6세대 D램 양산 초읽기…HBM 반전 카드 꺼냈다",
        "content": "삼성전자가 HBM(고대역폭 메모리) 시장에서 반전을 노리고 있다. 6세대 D램 기술을 바탕으로 HBM3E 제품을 2024년 하반기 양산할 예정이다.",
        "provider": "메트로경제",
        "published_at": "2024-07-01"
    }
    
    keywords = ["삼성전자", "HBM", "반도체"]
    question = "삼성전자와 HBM 반도체 상황"
    
    # 기사 관련성 검증
    is_relevant, score, reason = enhancer.validate_article_relevance(
        sample_article, keywords, question
    )
    
    print(f"관련성: {is_relevant}")
    print(f"점수: {score:.2f}")
    print(f"사유: {reason}")
    
    # 검색 정밀도 향상
    precision_info = enhancer.enhance_search_precision(keywords, question)
    print(f"정밀도 향상 정보: {precision_info}") 