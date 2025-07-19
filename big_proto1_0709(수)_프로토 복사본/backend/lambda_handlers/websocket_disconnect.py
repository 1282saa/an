"""
WebSocket 연결 해제 처리 Lambda Handler
"""

import json
import boto3
import os
from typing import Dict, Any
import logging

# Logger 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB 리소스
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))


def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    WebSocket 연결 해제 처리
    
    Args:
        event: API Gateway WebSocket 이벤트
        context: Lambda 컨텍스트
        
    Returns:
        HTTP 응답
    """
    logger.info(f"연결 해제 요청 이벤트: {json.dumps(event)}")
    
    try:
        # 연결 ID 추출
        connection_id = event['requestContext']['connectionId']
        
        # DynamoDB에서 연결 정보 삭제
        connections_table.delete_item(
            Key={
                'connectionId': connection_id
            }
        )
        
        logger.info(f"WebSocket 연결 해제 완료: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Disconnected'})
        }
        
    except Exception as e:
        logger.error(f"연결 해제 처리 오류: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }