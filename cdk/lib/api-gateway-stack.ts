import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join, resolve } from "path";
import { LambdaConfiguration } from "../helpers/lambda-nodejs";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

export interface ApiGatewayStackProps extends StackProps {
  cognito: {
    userPool: IUserPool,
    passwordAuthClient: IUserPoolClient,
    customAuthClient: IUserPoolClient,
    secureAuthClient: IUserPoolClient
  }
}

export class ApiGatewayStack extends Stack  {
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const lambdaServiceRole = new ServicePrincipal('lambda.amazonaws.com');

    const createUserFunctionRole = new Role(this, 'CreateUserFunctionRole', { 
      assumedBy: lambdaServiceRole,
      managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole') ]
     });

    const createUserFunction =  new NodejsFunction(this, 'CreateUserFunction', {
      entry: resolve(join(__dirname, '../../src/api/create-user/handler.ts')),
      handler: 'handler',
      role: createUserFunctionRole,
      ...LambdaConfiguration,
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.passwordAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
      }
    });

    new LogGroup(this, 'CreateUserFunctionLogGroup', {
      logGroupName: `/aws/lambda/${createUserFunction.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY
    });

    const signInFunctionRole = new Role(this, 'SignInFunctionRole', { 
      assumedBy: lambdaServiceRole,
      managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole') ]
     });

    const signInFunction =  new NodejsFunction(this, 'SignInFunction', {
      entry: resolve(join(__dirname, '../../src/api/signin-user/handler.ts')),
      handler: 'handler',
      role: signInFunctionRole,
      ...LambdaConfiguration,
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.passwordAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
      }
    });

    new LogGroup(this, 'SignInFunctionLogGroup', {
      logGroupName: `/aws/lambda/${signInFunction.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY
    });

    const impersonassionAuthFunctionRole = new Role(this, 'ImpersonassionAuthFunctionRole', { 
      assumedBy: lambdaServiceRole,
      managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole') ]
     });

    const impersonassionAuthFunction =  new NodejsFunction(this, 'ImpersonassionAuthFunction', {
      entry: resolve(join(__dirname, '../../src/api/impersonate-user/handler.ts')),
      handler: 'handler',
      role: impersonassionAuthFunctionRole,
      ...LambdaConfiguration,
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.secureAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
        // COGNITO_SECURE_CLIENT_SECRET: props.cognito.secureAuthClient..unsafeUnwrap(),
      }
    });

    new LogGroup(this, 'ImpersonassionAuthFunctionLogGroup', {
      logGroupName: `/aws/lambda/${impersonassionAuthFunction.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY
    });


    const api = new HttpApi(
      this,
      HttpApi.name, 
      { createDefaultStage: true });

      api.addRoutes({
        path: '/user',
        methods: [ HttpMethod.POST ],
        integration: new HttpLambdaIntegration('CreateUserFunctionIntegration', createUserFunction)
      });

      api.addRoutes({
        path: '/signin',
        methods: [ HttpMethod.POST ],
        integration: new HttpLambdaIntegration('SignInFunctionIntegration', signInFunction)
      });

      api.addRoutes({
        path: '/user/impersonate',
        methods: [ HttpMethod.POST ],
        integration: new HttpLambdaIntegration('ImpersonassionAuthFunctionIntegration', impersonassionAuthFunction)
      });

      props.cognito.userPool.grant(createUserFunctionRole,
        'cognito-idp:*',
      );

      props.cognito.userPool.grant(createUserFunctionRole,
        'cognito-idp:*',
      );
  }
}