"""
WebSocket 메시지 및 스트리밍 처리 Lambda Handler
참고: https://github.com/1282saa/nexus_ver1/tree/main/lambda/websocket
"""

import json
import boto3
import os
import asyncio
from typing import Dict, Any
import logging
from backend.api.clients.bigkinds import BigKindsClient
from backend.services.news_concierge import NewsConciergeService, ConciergeRequest
from backend.services.aws_bedrock_client import BedrockConfig

# Logger 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS 서비스 클라이언트
api_gateway_management = None
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))


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
    WebSocket 메시지 처리 메인 핸들러
    
    Args:
        event: API Gateway WebSocket 이벤트
        context: Lambda 컨텍스트
        
    Returns:
        HTTP 응답
    """
    logger.info(f"메시지 처리 이벤트: {json.dumps(event)}")
    
    try:
        # 연결 정보 추출
        connection_id = event['requestContext']['connectionId']
        domain_name = event['requestContext']['domainName']
        stage = event['requestContext']['stage']
        
        # API Gateway 클라이언트 초기화
        initialize_api_gateway_client(domain_name, stage)
        
        # 메시지 바디 파싱
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', '')
        
        logger.info(f"액션: {action}, 연결 ID: {connection_id}")
        
        # 액션별 처리
        if action == 'stream':
            # 비동기 스트리밍 처리
            asyncio.run(handle_stream_request(connection_id, body.get('data', {})))
        elif action == 'ping':
            # 핑 응답
            send_message_sync(connection_id, {'type': 'pong'})
        else:
            send_message_sync(connection_id, {
                'type': 'error',
                'message': f'Unknown action: {action}'
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Message processed'})
        }
        
    except Exception as e:
        logger.error(f"메시지 처리 오류: {str(e)}")
        connection_id = event['requestContext'].get('connectionId')
        if connection_id:
            send_error(connection_id, str(e))
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }


async def handle_stream_request(connection_id: str, data: Dict[str, Any]):
    """
    스트리밍 요청 처리
    
    Args:
        connection_id: WebSocket 연결 ID
        data: 요청 데이터
    """
    try:
        logger.info(f"스트리밍 요청 처리 시작: {connection_id}")
        
        # 진행 상태 전송
        await send_message(connection_id, {
            'type': 'progress',
            'data': {
                'stage': 'initializing',
                'progress': 0,
                'message': '요청을 처리하고 있습니다...'
            }
        })
        
        # BigKinds 클라이언트 초기화
        bigkinds_client = BigKindsClient()
        
        # Bedrock 설정
        bedrock_config = BedrockConfig(
            region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'),
            model_id=os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
        )
        
        # 뉴스 컨시어지 서비스 초기화
        concierge_service = NewsConciergeService(
            bigkinds_client=bigkinds_client,
            bedrock_config=bedrock_config
        )
        
        # 요청 객체 생성
        request = ConciergeRequest(**data)
        
        # 진행 상황 업데이트
        await send_message(connection_id, {
            'type': 'progress',
            'data': {
                'stage': 'processing',
                'progress': 20,
                'message': '뉴스 검색 및 분석을 시작합니다...'
            }
        })
        
        # 스트리밍 응답 처리
        final_result = None
        async for progress in concierge_service.generate_concierge_response_stream(request):
            # 진행 상황을 WebSocket으로 전송
            await send_message(connection_id, {
                'type': 'progress',
                'data': progress.dict()
            })
            
            # AI 응답 스트리밍 처리
            if progress.stage == "ai_response_streaming" and progress.streaming_chunk:
                await send_message(connection_id, {
                    'type': 'stream',
                    'data': {
                        'content': progress.streaming_chunk,
                        'isComplete': False
                    }
                })
            
            # 최종 결과 저장
            if progress.stage == "completed" and progress.result:
                final_result = progress.result
        
        # 완료 메시지 전송
        await send_message(connection_id, {
            'type': 'complete',
            'data': {
                'result': final_result.dict() if final_result else None,
                'message': '응답 생성이 완료되었습니다.'
            }
        })
        
        logger.info(f"스트리밍 요청 처리 완료: {connection_id}")
        
    except Exception as e:
        logger.error(f"스트리밍 처리 오류: {str(e)}")
        await send_error(connection_id, f'스트리밍 처리 중 오류 발생: {str(e)}')


async def send_message(connection_id: str, message: Dict[str, Any]):
    """
    비동기 메시지 전송
    
    Args:
        connection_id: WebSocket 연결 ID
        message: 전송할 메시지
    """
    try:
        response = api_gateway_management.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, ensure_ascii=False).encode('utf-8')
        )
        logger.debug(f"메시지 전송 성공: {connection_id}")
        
    except api_gateway_management.exceptions.GoneException:
        # 연결이 이미 종료된 경우
        logger.warning(f"연결이 종료됨: {connection_id}")
        # DynamoDB에서 연결 정보 삭제
        connections_table.delete_item(
            Key={'connectionId': connection_id}
        )
        
    except Exception as e:
        logger.error(f"메시지 전송 오류: {str(e)}")


def send_message_sync(connection_id: str, message: Dict[str, Any]):
    """
    동기 메시지 전송
    
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
        # 연결이 이미 종료된 경우
        logger.warning(f"연결이 종료됨: {connection_id}")
        connections_table.delete_item(
            Key={'connectionId': connection_id}
        )
        
    except Exception as e:
        logger.error(f"동기 메시지 전송 오류: {str(e)}")


async def send_error(connection_id: str, error_message: str):
    """
    오류 메시지 전송
    
    Args:
        connection_id: WebSocket 연결 ID
        error_message: 오류 메시지
    """
    await send_message(connection_id, {
        'type': 'error',
        'data': {
            'message': error_message,
            'timestamp': int(asyncio.get_event_loop().time())
        }
    })


def send_error_sync(connection_id: str, error_message: str):
    """
    동기 오류 메시지 전송
    
    Args:
        connection_id: WebSocket 연결 ID
        error_message: 오류 메시지
    """
    send_message_sync(connection_id, {
        'type': 'error',
        'data': {
            'message': error_message
        }
    })