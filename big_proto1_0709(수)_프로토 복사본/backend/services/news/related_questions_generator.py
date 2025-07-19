"""
연관어 기반 질문 생성기

현재 질문의 연관어와 키워드 가중치를 활용하여
Perplexity 스타일의 연관 질문을 생성합니다.
"""

from typing import List, Dict, Any, Tuple
import random
import logging

class RelatedQuestionsGenerator:
    """연관어 기반 연관 질문 생성기"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 질문 템플릿 (간단하고 직관적)
        self.question_templates = {
            # 기업 관련 질문
            "company": [
                "{keyword}의 최근 실적은 어떻습니까?",
                "{keyword} 주가 전망은?",
                "{keyword}의 주요 경쟁사는?",
                "{keyword}의 신사업 계획은?",
                "{keyword} CEO 발언 내용은?",
                "{keyword}의 글로벌 전략은?"
            ],
            
            # 기술/제품 관련 질문
            "technology": [
                "{keyword} 기술의 최신 동향은?",
                "{keyword} 시장 규모는?",
                "{keyword} 관련 주요 기업은?",
                "{keyword} 투자 현황은?",
                "{keyword}의 미래 전망은?",
                "{keyword} 기술 발전 방향은?"
            ],
            
            # 산업/시장 관련 질문
            "industry": [
                "{keyword} 시장 동향은?",
                "{keyword} 업계 이슈는?",
                "{keyword} 규제 변화는?",
                "{keyword} 글로벌 트렌드는?",
                "{keyword} 성장 전망은?",
                "{keyword} 주요 플레이어는?"
            ],
            
            # 일반 키워드 관련 질문
            "general": [
                "{keyword}에 대해 더 알려주세요",
                "{keyword} 관련 최신 뉴스는?",
                "{keyword}의 영향은?",
                "{keyword} 전망은 어떻습니까?",
                "{keyword}와 관련된 이슈는?",
                "{keyword}의 중요성은?"
            ]
        }
        
        # 키워드 유형 분류기
        self.keyword_categories = {
            "company": [
                "삼성전자", "lg전자", "sk하이닉스", "현대차", "기아", 
                "네이버", "카카오", "셀트리온", "포스코", "한화",
                "sk텔레콤", "kt", "신한은행", "kb금융", "현대건설"
            ],
            
            "technology": [
                "ai", "인공지능", "hbm", "메모리", "반도체", "프로세서",
                "gpu", "cpu", "클라우드", "빅데이터", "iot", "5g", "6g",
                "블록체인", "메타버스", "nft", "자율주행", "전기차", "배터리"
            ],
            
            "industry": [
                "반도체", "자동차", "바이오", "제약", "금융", "은행",
                "증권", "보험", "부동산", "건설", "화학", "철강",
                "조선", "항공", "물류", "유통", "게임", "엔터테인먼트"
            ]
        }
    
    def generate_related_questions(
        self, 
        original_question: str,
        related_keywords: List[str],
        keyword_weights: Dict[str, float] = None,
        max_questions: int = 6
    ) -> List[Dict[str, Any]]:
        """
        연관어 기반 관련 질문 생성
        
        Args:
            original_question: 원본 질문
            related_keywords: 연관어 리스트
            keyword_weights: 키워드별 가중치 (선택사항)
            max_questions: 최대 생성할 질문 수
            
        Returns:
            생성된 관련 질문 리스트
        """
        
        if not related_keywords:
            self.logger.warning("연관어가 없어 관련 질문을 생성할 수 없습니다.")
            return []
        
        # 키워드 우선순위 정렬 (가중치 기반)
        prioritized_keywords = self._prioritize_keywords(related_keywords, keyword_weights)
        
        # 질문 생성
        generated_questions = []
        used_templates = set()  # 중복 방지
        
        for keyword, weight in prioritized_keywords[:max_questions + 3]:  # 여유분 확보
            # 키워드 유형 분류
            keyword_type = self._classify_keyword(keyword)
            
            # 템플릿 선택 (중복 방지)
            template = self._select_template(keyword_type, used_templates)
            if not template:
                continue
            
            # 질문 생성
            question = template.format(keyword=keyword)
            
            # 원본 질문과 너무 유사한지 확인
            if not self._is_too_similar(question, original_question):
                generated_questions.append({
                    "question": question,
                    "keyword": keyword,
                    "weight": weight,
                    "category": keyword_type,
                    "relevance_score": self._calculate_relevance_score(keyword, weight, original_question)
                })
                
                used_templates.add(template)
                
                if len(generated_questions) >= max_questions:
                    break
        
        # 관련도 점수로 정렬
        generated_questions.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        self.logger.info(f"연관 질문 생성 완료: {len(generated_questions)}개")
        
        return generated_questions[:max_questions]
    
    def _prioritize_keywords(
        self, 
        keywords: List[str], 
        weights: Dict[str, float] = None
    ) -> List[Tuple[str, float]]:
        """키워드 우선순위 정렬"""
        
        if not weights:
            # 가중치가 없으면 순서대로 감소하는 가중치 부여
            weights = {kw: 1.0 - (i * 0.1) for i, kw in enumerate(keywords)}
        
        # 가중치로 정렬하되, 키워드 중요도도 고려
        keyword_priority = []
        
        for keyword in keywords:
            base_weight = weights.get(keyword, 0.5)
            
            # 키워드 유형별 보정
            if self._classify_keyword(keyword) == "company":
                base_weight += 0.2  # 기업명은 중요도 상승
            elif self._classify_keyword(keyword) == "technology":
                base_weight += 0.1  # 기술 용어도 중요
            
            keyword_priority.append((keyword, base_weight))
        
        # 가중치 내림차순 정렬
        return sorted(keyword_priority, key=lambda x: x[1], reverse=True)
    
    def _classify_keyword(self, keyword: str) -> str:
        """키워드 유형 분류"""
        
        keyword_lower = keyword.lower()
        
        # 기업명 확인
        for company in self.keyword_categories["company"]:
            if company.lower() in keyword_lower or keyword_lower in company.lower():
                return "company"
        
        # 기술 용어 확인
        for tech in self.keyword_categories["technology"]:
            if tech.lower() in keyword_lower or keyword_lower in tech.lower():
                return "technology"
        
        # 산업 분야 확인
        for industry in self.keyword_categories["industry"]:
            if industry.lower() in keyword_lower or keyword_lower in industry.lower():
                return "industry"
        
        return "general"
    
    def _select_template(self, keyword_type: str, used_templates: set) -> str:
        """중복되지 않는 템플릿 선택"""
        
        available_templates = [
            t for t in self.question_templates[keyword_type] 
            if t not in used_templates
        ]
        
        if not available_templates:
            # 모든 템플릿이 사용되었으면 일반 템플릿에서 선택
            available_templates = [
                t for t in self.question_templates["general"] 
                if t not in used_templates
            ]
        
        return random.choice(available_templates) if available_templates else None
    
    def _is_too_similar(self, question: str, original_question: str) -> bool:
        """생성된 질문이 원본과 너무 유사한지 확인"""
        
        # 간단한 유사도 체크 (공통 단어 비율)
        q1_words = set(question.replace("?", "").replace(".", "").split())
        q2_words = set(original_question.replace("?", "").replace(".", "").split())
        
        if not q1_words or not q2_words:
            return False
        
        common_words = q1_words.intersection(q2_words)
        similarity = len(common_words) / min(len(q1_words), len(q2_words))
        
        return similarity > 0.7  # 70% 이상 유사하면 제외
    
    def _calculate_relevance_score(
        self, 
        keyword: str, 
        weight: float, 
        original_question: str
    ) -> float:
        """관련도 점수 계산"""
        
        base_score = weight  # 기본 가중치
        
        # 원본 질문에 키워드가 포함되어 있으면 보너스
        if keyword.lower() in original_question.lower():
            base_score += 0.3
        
        # 키워드 유형별 보정
        keyword_type = self._classify_keyword(keyword)
        if keyword_type == "company":
            base_score += 0.2
        elif keyword_type == "technology":
            base_score += 0.1
        
        return min(base_score, 1.0)  # 최대 1.0으로 제한
    
    def generate_follow_up_questions(
        self, 
        ai_response: str, 
        original_question: str,
        max_questions: int = 4
    ) -> List[Dict[str, Any]]:
        """AI 응답 기반 후속 질문 생성 (간단 버전)"""
        
        # AI 응답에서 핵심 키워드 추출
        response_keywords = self._extract_keywords_from_response(ai_response)
        
        # 후속 질문 템플릿
        follow_up_templates = [
            "{keyword}에 대해 더 자세히 설명해주세요",
            "{keyword}의 구체적인 영향은 무엇인가요?",
            "{keyword} 관련 다른 기업들은 어떤가요?",
            "{keyword}의 향후 전망은 어떻습니까?"
        ]
        
        follow_up_questions = []
        
        for keyword in response_keywords[:max_questions]:
            if len(follow_up_questions) >= max_questions:
                break
                
            template = random.choice(follow_up_templates)
            question = template.format(keyword=keyword)
            
            # 원본 질문과 중복되지 않는 경우만 추가
            if not self._is_too_similar(question, original_question):
                follow_up_questions.append({
                    "question": question,
                    "keyword": keyword,
                    "category": "follow_up",
                    "relevance_score": 0.8
                })
        
        return follow_up_questions
    
    def _extract_keywords_from_response(self, response: str) -> List[str]:
        """AI 응답에서 키워드 추출 (간단 버전)"""
        
        # 기업명, 기술 용어 등 중요한 키워드만 추출
        important_keywords = []
        
        # 모든 카테고리의 키워드 확인
        all_keywords = []
        for category_keywords in self.keyword_categories.values():
            all_keywords.extend(category_keywords)
        
        response_lower = response.lower()
        for keyword in all_keywords:
            if keyword.lower() in response_lower:
                important_keywords.append(keyword)
        
        # 중복 제거하고 최대 5개까지
        return list(set(important_keywords))[:5]

# 사용 예시
if __name__ == "__main__":
    generator = RelatedQuestionsGenerator()
    
    # 예시 테스트
    original_question = "삼성전자와 HBM 반도체 상황"
    related_keywords = ["삼성전자", "HBM", "SK하이닉스", "메모리", "AI", "엔비디아"]
    keyword_weights = {
        "삼성전자": 1.0,
        "HBM": 0.9,
        "SK하이닉스": 0.7,
        "메모리": 0.6,
        "AI": 0.5,
        "엔비디아": 0.4
    }
    
    # 관련 질문 생성
    related_questions = generator.generate_related_questions(
        original_question, 
        related_keywords, 
        keyword_weights,
        max_questions=6
    )
    
    print("🔗 생성된 관련 질문:")
    for i, q in enumerate(related_questions, 1):
        print(f"{i}. {q['question']}")
        print(f"   키워드: {q['keyword']} | 점수: {q['relevance_score']:.2f}")
        print() 