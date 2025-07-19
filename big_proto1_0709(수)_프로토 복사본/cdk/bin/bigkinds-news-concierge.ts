#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { BedrockStack } from '../lib/bedrock-stack';
import { WebSocketStack } from '../lib/websocket-stack';
import * as path from 'path';

const app = new cdk.App();

// 환경 변수에서 설정 읽기
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'us-east-1';
const bigKindsApiKey = process.env.BIGKINDS_API_KEY || '';

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: region,
};

// 공통 의존성 레이어
const dependenciesLayer = new lambda.LayerVersion(app, 'DependenciesLayer', {
  layerVersionName: `bigkinds-dependencies-${stage}`,
  code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layers/dependencies')),
  compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
  description: 'Python dependencies for BigKinds News Concierge',
});

// Bedrock AI 스택 (nexus_ver1 패턴)
const bedrockStack = new BedrockStack(app, 'BigKindsBedrockStack', {
  stage,
  bigKindsApiKey,
  dependenciesLayer,
  env,
  description: 'AI/ML services with AWS Bedrock Claude 3',
  tags: {
    Component: 'Bedrock',
    Project: 'BigKindsNewsConcierge',
    Environment: stage,
    Owner: 'Seoul Economic Daily',
  },
});

// WebSocket 스택 (nexus_ver1 패턴)
const webSocketStack = new WebSocketStack(app, 'BigKindsWebSocketStack', {
  stage,
  bigKindsApiKey,
  dependenciesLayer,
  generateFunction: bedrockStack.generateFunction,
  env,
  description: 'Real-time WebSocket API with streaming support',
  tags: {
    Component: 'WebSocket',
    Project: 'BigKindsNewsConcierge',
    Environment: stage,
    Owner: 'Seoul Economic Daily',
  },
});

// 스택 간 의존성 설정
webSocketStack.addDependency(bedrockStack);