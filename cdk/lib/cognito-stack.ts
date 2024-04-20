import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AccountRecovery,
  ResourceServerScope,
  StringAttribute,
  UserPool,
  UserPoolClient,
  UserPoolEmail,
} from 'aws-cdk-lib/aws-cognito';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join, resolve } from 'path';
import { LambdaConfiguration } from '../helpers/lambda-nodejs';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface CognitoStackProps extends StackProps {
  table: ITable;
}


export class CognitoStack extends Stack {
  public readonly userPool: UserPool;
  public readonly passwordAuthClient: UserPoolClient;
  public readonly customAuthClient: UserPoolClient;
  public readonly secureAuthClient: UserPoolClient;
  
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const lambdaServiceRole = new ServicePrincipal('lambda.amazonaws.com');

    const preTokenGenerationFunctionRole = new Role(this, 'CreateUserFunctionRole', { 
      assumedBy: lambdaServiceRole,
      managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole') ]
     });

    const preTokenGenerationFunction = new NodejsFunction(this, 'PreTokenGeneration', {
      entry: resolve(join(__dirname, '../../src/cognito/pre-token-generation.ts')),
      handler: 'handler',
      role: preTokenGenerationFunctionRole,
      ...LambdaConfiguration,
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });

    props.table.grantReadWriteData(preTokenGenerationFunction);

    this.userPool = new UserPool(this, 'MultiTenantUserPool', {
      removalPolicy: RemovalPolicy.DESTROY, 
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      email: UserPoolEmail.withCognito('eidivandi@liv.com'),
      customAttributes: {
        'role:admin': new StringAttribute({ mutable: true }),
        admin: new StringAttribute({ mutable: true }),
        user: new StringAttribute({ mutable: true }),
      },
      lambdaTriggers:{
        defineAuthChallenge: new NodejsFunction(this, 'DefineAuthChallenge', {
          entry: resolve(join(__dirname, '../../src/cognito/authChallenge/define-auth-challenge.ts')),
          handler: 'handler',
          ...LambdaConfiguration
        }),
        preTokenGeneration: preTokenGenerationFunction,
        verifyAuthChallengeResponse: new NodejsFunction(this, 'VerifyAuthChallengeResponse', {
          entry: resolve(join(__dirname, '../../src/cognito/authChallenge/verify-auth-challenge.ts')),
          handler: 'handler',
          ...LambdaConfiguration
        })
      }
    });

    this.passwordAuthClient =  new UserPoolClient(this, 'MultiTenantPasswordAuthClient', {
      userPool: this.userPool,
      idTokenValidity: Duration.minutes(5),
      accessTokenValidity: Duration.minutes(5),
      refreshTokenValidity: Duration.days(1),
      authFlows: {
        userPassword: true,
      }
    });

    this.customAuthClient = new UserPoolClient(this, 'MultiTenantCustomAuthClient', {
      userPool: this.userPool,
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      authFlows: { custom: true },
    });

    this.secureAuthClient = new UserPoolClient(this, 'MultiTenantSecureAuthClient', {
      userPool: this.userPool,
      generateSecret: false,
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      authFlows: { custom: true },
    });

    const serverScope = new ResourceServerScope({
      scopeName: 'layer:1',
      scopeDescription: 'A test Scope',
    });

    this.userPool.addResourceServer('aws-cognito-multilayer-resources-server', {
      identifier: 'multilayer',
      scopes: [ serverScope ]
    });
  }
}