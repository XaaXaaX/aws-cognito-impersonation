#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../lib/cognito-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { IConstruct } from 'constructs';


class ApplyDestroyPolicyAspect implements cdk.IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  } 
}

const app = new cdk.App();
const dynamodbStack = new DynamoDBStack(app, DynamoDBStack.name, {});
const cognitoStack = new CognitoStack(app, CognitoStack.name, {
  table: dynamodbStack.table,
});

new ApiGatewayStack(app, ApiGatewayStack.name, {
  cognito: {
    userPool: cognitoStack.userPool,
    passwordAuthClient: cognitoStack.passwordAuthClient,
    customAuthClient: cognitoStack.customAuthClient,
    secureAuthClient: cognitoStack.secureAuthClient,
  }
});

cdk.Aspects.of(app).add(new ApplyDestroyPolicyAspect());
