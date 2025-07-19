"""
AI 생성 전용 Lambda Handler - nexus_ver1 패턴 적용
참고: https://github.com/1282saa/nexus_ver1/blob/main/lambda/generate/generate.py
"""

import json
import boto3
import os
import asyncio
from typing import Dict, Any, Optional
import logging
from backend.services.aws_bedrock_client import BedrockClaudeClient, BedrockConfig

# Logger 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS 서비스 클라이언트
api_gateway_management = None


def initialize_api_gateway_client(domain_name: str, stage: str):
    """API Gateway Management API 클라이언트 초기화"""
    global api_gateway_management
    endpoint_url = f"https://{domain_name}/{stage}"
    api_gateway_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=endpoint_url
    )


def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    AI 생성 전용 Lambda 핸들러
    
    Args:
        event: API Gateway 이벤트 또는 직접 호출 이벤트
        context: Lambda 컨텍스트
        
    Returns:
        HTTP 응답 또는 생성된 결과
    """
    logger.info(f"AI 생성 요청 이벤트: {json.dumps(event)}")
    
    try:
        # WebSocket 이벤트인지 확인
        is_websocket = 'requestContext' in event and 'connectionId' in event['requestContext']
        
        if is_websocket:
            return handle_websocket_generate(event, context)
        else:
            return handle_direct_generate(event, context)
            
    except Exception as e:
        logger.error(f"AI 생성 처리 오류: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': 'AI 생성 중 오류가 발생했습니다.',
                'details': str(e)
            })
        }


def handle_websocket_generate(event: Dict[str, Any], context) -> Dict[str, Any]:
    """WebSocket을 통한 스트리밍 생성 처리"""
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    # API Gateway 클라이언트 초기화
    initialize_api_gateway_client(domain_name, stage)
    
    # 비동기 스트리밍 처리
    asyncio.run(stream_ai_response(connection_id, event))
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Streaming started'})
    }


def handle_direct_generate(event: Dict[str, Any], context) -> Dict[str, Any]:
    """직접 호출을 통한 일반 생성 처리"""
    try:
        # 요청 바디 파싱
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
        
        # 동기 AI 응답 생성
        result = asyncio.run(generate_ai_response(body, stream=False))
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(result)
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON 디코딩 오류: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': '잘못된 JSON 형식입니다.'})
        }


async def stream_ai_response(connection_id: str, event: Dict[str, Any]):
    """
    AI 응답 스트리밍 처리
    
    Args:
        connection_id: WebSocket 연결 ID
        event: 요청 이벤트
    """
    try:
        # 요청 데이터 파싱
        body = json.loads(event.get('body', '{}'))
        data = body.get('data', {})
        
        # 진행 상태 전송
        await send_websocket_message(connection_id, {
            'type': 'progress',
            'data': {
                'stage': 'ai_generation_starting',
                'progress': 10,
                'message': 'AI 응답 생성을 시작합니다...'
            }
        })
        
        # 스트리밍 AI 응답 생성
        async for chunk in generate_ai_response_stream(data):
            if chunk.get('type') == 'progress':
                await send_websocket_message(connection_id, {
                    'type': 'progress',
                    'data': chunk.get('data')
                })
            elif chunk.get('type') == 'content':
                await send_websocket_message(connection_id, {
                    'type': 'stream',
                    'data': {
                        'content': chunk.get('content'),
                        'isComplete': False
                    }
                })
            elif chunk.get('type') == 'complete':
                await send_websocket_message(connection_id, {
                    'type': 'complete',
                    'data': chunk.get('data')
                })
                
    except Exception as e:
        logger.error(f"스트리밍 생성 오류: {str(e)}")
        await send_websocket_message(connection_id, {
            'type': 'error',
            'data': {
                'message': f'AI 응답 생성 중 오류가 발생했습니다: {str(e)}'
            }
        })


async def generate_ai_response(data: Dict[str, Any], stream: bool = True) -> Dict[str, Any]:
    """
    AI 응답 생성 (동기)
    
    Args:
        data: 요청 데이터
        stream: 스트리밍 여부
        
    Returns:
        생성된 응답
    """
    try:
        # Bedrock 클라이언트 초기화
        bedrock_config = BedrockConfig(
            region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'),
            model_id=os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0'),
            max_tokens=4096,
            temperature=0.7
        )
        
        client = BedrockClaudeClient(bedrock_config)
        
        # 프롬프트 구성
        messages, system_prompt = build_dynamic_prompt(data)
        
        # AI 응답 생성
        response = await client.generate(
            messages=messages,
            system_prompt=system_prompt,
            stream=stream
        )
        
        return {
            'success': True,
            'content': response.get('content', ''),
            'usage': response.get('usage', {}),
            'metadata': {
                'model': bedrock_config.model_id,
                'temperature': bedrock_config.temperature,
                'max_tokens': bedrock_config.max_tokens
            }
        }
        
    except Exception as e:
        logger.error(f"AI 응답 생성 실패: {str(e)}")
        raise


async def generate_ai_response_stream(data: Dict[str, Any]):
    """
    AI 응답 스트리밍 생성
    
    Args:
        data: 요청 데이터
        
    Yields:
        스트리밍 청크
    """
    try:
        # Bedrock 클라이언트 초기화
        bedrock_config = BedrockConfig(
            region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'),
            model_id=os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0'),
            max_tokens=4096,
            temperature=0.7
        )
        
        client = BedrockClaudeClient(bedrock_config)
        
        # 프롬프트 구성
        messages, system_prompt = build_dynamic_prompt(data)
        
        yield {
            'type': 'progress',
            'data': {
                'stage': 'ai_generation_started',
                'progress': 30,
                'message': 'AI가 응답을 생성하고 있습니다...'
            }
        }
        
        # 스트리밍 AI 응답 생성
        full_content = ""
        async for chunk in await client.generate(
            messages=messages,
            system_prompt=system_prompt,
            stream=True
        ):
            full_content += chunk
            yield {
                'type': 'content',
                'content': chunk
            }
        
        # 완료 응답
        yield {
            'type': 'complete',
            'data': {
                'content': full_content,
                'metadata': {
                    'model': bedrock_config.model_id,
                    'temperature': bedrock_config.temperature,
                    'total_tokens': len(full_content.split())
                }
            }
        }
        
    except Exception as e:
        logger.error(f"스트리밍 AI 응답 생성 실패: {str(e)}")
        yield {
            'type': 'error',
            'data': {
                'message': f'AI 응답 생성 중 오류가 발생했습니다: {str(e)}'
            }
        }


def build_dynamic_prompt(data: Dict[str, Any]) -> tuple[list, str]:
    """
    동적 프롬프트 구성 (nexus_ver1 패턴)
    
    Args:
        data: 요청 데이터
        
    Returns:
        (messages, system_prompt) 튜플
    """
    # 기본 시스템 프롬프트
    system_prompt = """당신은 전문적인 경제 뉴스 분석가입니다. 
사용자의 질문에 대해 정확하고 유용한 정보를 제공해주세요.
한국어로 자연스럽게 응답하며, 복잡한 경제 개념도 이해하기 쉽게 설명해주세요."""

    # 프롬프트 카드가 있는 경우 적용
    if 'prompt_card' in data:
        prompt_card = data['prompt_card']
        if 'system_prompt' in prompt_card:
            system_prompt = prompt_card['system_prompt']
    
    # 메시지 구성
    messages = []
    
    # 채팅 히스토리 추가
    if 'chat_history' in data:
        for msg in data['chat_history']:
            messages.append({
                'role': msg.get('role', 'user'),
                'content': msg.get('content', '')
            })
    
    # 현재 사용자 입력 추가
    user_input = data.get('question', data.get('input', data.get('user_input', '')))
    if user_input:
        messages.append({
            'role': 'user',
            'content': user_input
        })
    
    # 컨텍스트 정보 추가
    if 'context' in data and data['context']:
        context_info = f"\n\n참고 정보:\n{data['context']}"
        if messages:
            messages[-1]['content'] += context_info
    
    return messages, system_prompt


async def send_websocket_message(connection_id: str, message: Dict[str, Any]):
    """
    WebSocket 메시지 전송
    
    Args:
        connection_id: WebSocket 연결 ID
        message: 전송할 메시지
    """
    try:
        api_gateway_management.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, ensure_ascii=False).encode('utf-8')
        )
        
    except api_gateway_management.exceptions.GoneException:
        logger.warning(f"연결이 종료됨: {connection_id}")
        
    except Exception as e:
        logger.error(f"WebSocket 메시지 전송 오류: {str(e)}")
        raise