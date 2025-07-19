"""
AWS Bedrock Claude 클라이언트 모듈

AWS Bedrock을 통해 Claude API와 통신하는 클라이언트를 제공합니다.
스트리밍과 일반 응답을 모두 지원합니다.
"""

import json
import boto3
from typing import AsyncGenerator, Dict, Any, List, Optional
import asyncio
from dataclasses import dataclass
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class BedrockConfig:
    """Bedrock 설정"""
    region_name: str = "us-east-1"
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    max_tokens: int = 4096
    temperature: float = 0.3
    top_p: float = 0.9
    top_k: int = 250
    stop_sequences: List[str] = None
    
    def __post_init__(self):
        if self.stop_sequences is None:
            self.stop_sequences = ["\n\nHuman:", "\n\nAssistant:"]


class BedrockClaudeClient:
    """AWS Bedrock Claude 클라이언트"""
    
    def __init__(self, config: BedrockConfig = None):
        """
        클라이언트 초기화
        
        Args:
            config: Bedrock 설정 (기본값 사용 가능)
        """
        self.config = config or BedrockConfig()
        self.client = boto3.client(
            service_name='bedrock-runtime',
            region_name=self.config.region_name
        )
        
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Dict[str, Any] | AsyncGenerator[str, None]:
        """
        Claude를 통해 응답 생성
        
        Args:
            messages: 대화 메시지 리스트 [{"role": "user", "content": "..."}]
            system_prompt: 시스템 프롬프트
            temperature: 생성 온도 (기본값: config 설정값)
            max_tokens: 최대 토큰 수 (기본값: config 설정값)
            stream: 스트리밍 여부
            
        Returns:
            stream=False: 전체 응답 딕셔너리
            stream=True: 텍스트 청크를 생성하는 AsyncGenerator
        """
        # Claude 3 Messages API 파라미터 구성
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens or self.config.max_tokens,
            "temperature": temperature or self.config.temperature,
            "top_p": self.config.top_p,
            "top_k": self.config.top_k,
            "stop_sequences": self.config.stop_sequences,
            "messages": messages
        }
        
        # 시스템 프롬프트가 있으면 추가
        if system_prompt:
            body["system"] = system_prompt
            
        params = {
            "modelId": self.config.model_id,
            "contentType": "application/json",
            "accept": "application/json" if not stream else "*/*",
            "body": json.dumps(body)
        }
        
        if stream:
            return self._stream_response(params)
        else:
            return await self._get_response(params)
    
    def _format_messages_to_prompt(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        OpenAI 메시지 형식을 Claude 프롬프트 형식으로 변환
        
        Args:
            messages: OpenAI 형식 메시지 리스트
            system_prompt: 시스템 프롬프트
            
        Returns:
            Claude 형식 프롬프트
        """
        prompt_parts = []
        
        # 시스템 프롬프트 추가
        if system_prompt:
            prompt_parts.append(f"System: {system_prompt}\n")
        
        # 메시지 변환
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"\n\nHuman: {content}")
            elif role == "assistant":
                prompt_parts.append(f"\n\nAssistant: {content}")
        
        # Claude는 항상 Assistant로 시작해야 함
        prompt_parts.append("\n\nAssistant:")
        
        return "".join(prompt_parts)
    
    async def _get_response(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """일반 응답 요청"""
        loop = asyncio.get_event_loop()
        
        try:
            # 동기 API를 비동기로 실행
            response = await loop.run_in_executor(
                None,
                lambda: self.client.invoke_model(**params)
            )
            
            # 응답 파싱
            response_body = json.loads(response['body'].read())
            
            # Claude 3 Messages API 응답 형식
            content = ""
            if response_body.get("content") and len(response_body["content"]) > 0:
                content = response_body["content"][0].get("text", "")
            
            return {
                "content": content,
                "stop_reason": response_body.get("stop_reason"),
                "usage": response_body.get("usage", {})
            }
            
        except Exception as e:
            logger.error(f"Bedrock API 오류: {str(e)}")
            raise
    
    async def _stream_response(self, params: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """스트리밍 응답 요청"""
        loop = asyncio.get_event_loop()
        
        try:
            # 스트리밍 API 호출
            response = await loop.run_in_executor(
                None,
                lambda: self.client.invoke_model_with_response_stream(**params)
            )
            
            # Claude 3 Messages API 이벤트 스트림 처리
            for event in response.get('body'):
                chunk = json.loads(event['chunk']['bytes'])
                
                # 텍스트 델타가 있으면 반환
                if chunk.get('type') == 'content_block_delta':
                    delta = chunk.get('delta', {})
                    if delta.get('text'):
                        yield delta['text']
                        
                # 종료 이유가 있으면 로깅
                if chunk.get('type') == 'message_stop':
                    logger.info(f"스트리밍 종료: {chunk.get('stop_reason', 'complete')}")
                    
        except Exception as e:
            logger.error(f"Bedrock 스트리밍 오류: {str(e)}")
            raise
    
    async def count_tokens(self, text: str) -> int:
        """
        텍스트의 토큰 수 추정
        
        Claude의 경우 대략적인 추정값 사용 (실제 토크나이저 없음)
        평균적으로 4글자당 1토큰으로 계산
        
        Args:
            text: 토큰을 계산할 텍스트
            
        Returns:
            추정 토큰 수
        """
        # 간단한 토큰 추정 (영어: 4글자/토큰, 한글: 2글자/토큰)
        korean_chars = sum(1 for c in text if ord('가') <= ord(c) <= ord('힣'))
        other_chars = len(text) - korean_chars
        
        estimated_tokens = (korean_chars / 2) + (other_chars / 4)
        return int(estimated_tokens)


# 싱글톤 인스턴스
_client_instance = None


def get_bedrock_client(config: BedrockConfig = None) -> BedrockClaudeClient:
    """
    Bedrock 클라이언트 싱글톤 인스턴스 반환
    
    Args:
        config: Bedrock 설정 (최초 호출 시에만 적용)
        
    Returns:
        BedrockClaudeClient 인스턴스
    """
    global _client_instance
    
    if _client_instance is None:
        _client_instance = BedrockClaudeClient(config)
    
    return _client_instance