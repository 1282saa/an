"""
WebSocket 연결 처리 Lambda Handler
"""

import json
import boto3
import os
import time
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
    WebSocket 연결 처리
    
    Args:
        event: API Gateway WebSocket 이벤트
        context: Lambda 컨텍스트
        
    Returns:
        HTTP 응답
    """
    logger.info(f"연결 요청 이벤트: {json.dumps(event)}")
    
    try:
        # 연결 정보 추출
        connection_id = event['requestContext']['connectionId']
        domain_name = event['requestContext']['domainName']
        stage = event['requestContext']['stage']
        
        # 연결 정보를 DynamoDB에 저장
        current_time = int(time.time())
        ttl = current_time + 3600  # 1시간 후 만료
        
        connections_table.put_item(
            Item={
                'connectionId': connection_id,
                'domainName': domain_name,
                'stage': stage,
                'connectedAt': current_time,
                'ttl': ttl
            }
        )
        
        logger.info(f"WebSocket 연결 성공: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Connected'})
        }
        
    except Exception as e:
        logger.error(f"연결 처리 오류: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }