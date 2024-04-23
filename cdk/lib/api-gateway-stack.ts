import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import { join, resolve } from "path";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { LambdaFunction } from "./lambda-reource";
import { HttpUserPoolAuthorizer, HttpLambdaAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";

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

    const cognitoPasswordAuthorizer = new HttpUserPoolAuthorizer('CognitoPasswordUserPoolAuthorizer', props.cognito.userPool, {
      userPoolClients: [ props.cognito.passwordAuthClient ]
    });

    const customAuthorizer =  new LambdaFunction(this, 'CustomAuthorizer', {
      entry: resolve(join(__dirname, '../../src/authorizer/handler.ts')),
      bundling: {
        banner: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
      },
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.secureAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
      }
    });

    const cognitoImpersonationAuthorizer = new HttpLambdaAuthorizer('CognitoImpersonationAuthorizer', customAuthorizer , {
      resultsCacheTtl: Duration.seconds(0),
    });


    const downStreamFunction =  new LambdaFunction(this, 'DownStreamFunction', {
      entry: resolve(join(__dirname, '../../src/api/down-stream/handler.ts')),
    });

    const createUserFunction =  new LambdaFunction(this, 'CreateUserFunction', {
      entry: resolve(join(__dirname, '../../src/api/signup-user/handler.ts')),
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.passwordAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
      }
    });

    const signInFunction =  new LambdaFunction(this, 'SignInFunction', {
      entry: resolve(join(__dirname, '../../src/api/signin-user/handler.ts')),
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.passwordAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
      }
    });

    const impersonassionAuthFunction =  new LambdaFunction(this, 'ImpersonassionAuthFunction', {
      entry: resolve(join(__dirname, '../../src/api/impersonate-user/handler.ts')),
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: props.cognito.secureAuthClient.userPoolClientId,
        COGNITO_USER_POOL_ID: props.cognito.userPool.userPoolId,
        // COGNITO_SECURE_CLIENT_SECRET: props.cognito.secureAuthClient..unsafeUnwrap(),
      }
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
        integration: new HttpLambdaIntegration('ImpersonassionAuthFunctionIntegration', impersonassionAuthFunction),
        authorizer: cognitoPasswordAuthorizer
      });
      
      api.addRoutes({
        path: '/downstream',
        methods: [ HttpMethod.POST ],
        integration: new HttpLambdaIntegration('DownStreamFunctionIntegration', downStreamFunction),
        authorizer: cognitoImpersonationAuthorizer
      });

      props.cognito.userPool.grant(createUserFunction,
        'cognito-idp:*',
      );

      props.cognito.userPool.grant(signInFunction,
        'cognito-idp:*',
      );

      props.cognito.userPool.grant(impersonassionAuthFunction,
        'cognito-idp:*',
      );

  }
}