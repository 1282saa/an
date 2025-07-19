"""
WebSocket Lambda Handler

API Gateway WebSocket과 연동하여 실시간 스트리밍을 처리하는 Lambda 함수
"""

import json
import boto3
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
connections_table = dynamodb.Table('WebSocketConnections')


def initialize_api_gateway_client(endpoint_url: str):
    """API Gateway Management API 클라이언트 초기화"""
    global api_gateway_management
    api_gateway_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=endpoint_url
    )


async def handle_connect(event: Dict[str, Any]) -> Dict[str, Any]:
    """WebSocket 연결 처리"""
    connection_id = event['requestContext']['connectionId']
    
    try:
        # 연결 정보를 DynamoDB에 저장
        connections_table.put_item(
            Item={
                'connectionId': connection_id,
                'timestamp': event['requestContext']['requestTime']
            }
        )
        
        logger.info(f"WebSocket connected: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': 'Connected'
        }
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Connection failed: {str(e)}'
        }


async def handle_disconnect(event: Dict[str, Any]) -> Dict[str, Any]:
    """WebSocket 연결 해제 처리"""
    connection_id = event['requestContext']['connectionId']
    
    try:
        # DynamoDB에서 연결 정보 삭제
        connections_table.delete_item(
            Key={'connectionId': connection_id}
        )
        
        logger.info(f"WebSocket disconnected: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': 'Disconnected'
        }
    except Exception as e:
        logger.error(f"Disconnection error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Disconnection failed: {str(e)}'
        }


async def handle_message(event: Dict[str, Any]) -> Dict[str, Any]:
    """WebSocket 메시지 처리"""
    connection_id = event['requestContext']['connectionId']
    
    # API Gateway Management API 초기화
    domain = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    endpoint_url = f"https://{domain}/{stage}"
    initialize_api_gateway_client(endpoint_url)
    
    try:
        # 메시지 파싱
        body = json.loads(event['body'])
        action = body.get('action')
        
        if action == 'news_concierge':
            # 뉴스 컨시어지 요청 처리
            await handle_news_concierge(connection_id, body.get('data', {}))
        elif action == 'ping':
            # 핑 응답
            await send_message(connection_id, {'type': 'pong'})
        else:
            await send_message(connection_id, {
                'type': 'error',
                'message': f'Unknown action: {action}'
            })
        
        return {
            'statusCode': 200,
            'body': 'Message processed'
        }
        
    except Exception as e:
        logger.error(f"Message handling error: {str(e)}")
        await send_message(connection_id, {
            'type': 'error',
            'message': str(e)
        })
        return {
            'statusCode': 500,
            'body': f'Message processing failed: {str(e)}'
        }


async def handle_news_concierge(connection_id: str, data: Dict[str, Any]):
    """뉴스 컨시어지 요청 처리 및 스트리밍"""
    try:
        # BigKinds 클라이언트 초기화
        bigkinds_client = BigKindsClient()
        
        # Bedrock 설정
        bedrock_config = BedrockConfig(
            region_name='us-east-1',
            model_id='anthropic.claude-3-sonnet-20240229-v1:0'
        )
        
        # 뉴스 컨시어지 서비스 초기화
        concierge_service = NewsConciergeService(
            bigkinds_client=bigkinds_client,
            bedrock_config=bedrock_config
        )
        
        # 요청 객체 생성
        request = ConciergeRequest(**data)
        
        # 진행 상황 스트리밍
        async for progress in concierge_service.generate_concierge_response_stream(request):
            # 진행 상황을 WebSocket으로 전송
            await send_message(connection_id, {
                'type': 'progress',
                'data': progress.dict()
            })
            
            # AI 응답 스트리밍 처리
            if progress.stage == "ai_response_streaming" and progress.streaming_chunk:
                await send_message(connection_id, {
                    'type': 'stream_chunk',
                    'data': {
                        'content': progress.streaming_chunk,
                        'isComplete': False
                    }
                })
        
        # 완료 메시지 전송
        await send_message(connection_id, {
            'type': 'complete',
            'data': {
                'message': '응답 생성이 완료되었습니다.'
            }
        })
        
    except Exception as e:
        logger.error(f"News concierge error: {str(e)}")
        await send_message(connection_id, {
            'type': 'error',
            'message': f'뉴스 컨시어지 처리 중 오류 발생: {str(e)}'
        })


async def send_message(connection_id: str, message: Dict[str, Any]):
    """WebSocket을 통해 메시지 전송"""
    try:
        api_gateway_management.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, ensure_ascii=False).encode('utf-8')
        )
    except api_gateway_management.exceptions.GoneException:
        # 연결이 이미 종료된 경우
        logger.warning(f"Connection {connection_id} is gone")
        # DynamoDB에서 연결 정보 삭제
        connections_table.delete_item(
            Key={'connectionId': connection_id}
        )
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda 함수 진입점"""
    route_key = event['requestContext']['routeKey']
    
    logger.info(f"Route: {route_key}")
    logger.info(f"Event: {json.dumps(event)}")
    
    # 비동기 처리를 위한 이벤트 루프 생성
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        if route_key == '$connect':
            # 연결 처리
            result = loop.run_until_complete(handle_connect(event))
        elif route_key == '$disconnect':
            # 연결 해제 처리
            result = loop.run_until_complete(handle_disconnect(event))
        else:
            # 메시지 처리
            result = loop.run_until_complete(handle_message(event))
        
        return result
        
    finally:
        loop.close()