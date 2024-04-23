import { Duration, NestedStack, NestedStackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AccountRecovery,
  StringAttribute,
  UserPool,
  UserPoolClient,
  UserPoolEmail,
} from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

interface CognitoUserPoolStackProps extends NestedStackProps {
  triggers: {
    preTokenGeneration: IFunction;
    defineAuthChallenge: IFunction;
    verifyAuthChallengeResponse: IFunction;
  }
}
export class CognitoUserPoolStack extends NestedStack {
  public readonly userPool: UserPool;
  public readonly passwordAuthClient: UserPoolClient;
  public readonly customAuthClient: UserPoolClient;
  public readonly secureAuthClient: UserPoolClient;
  
  constructor(scope: Construct, id: string, props: CognitoUserPoolStackProps) {
    super(scope, id, props);

    this.userPool = new UserPool(this, 'MultiTenantUserPool', {
      removalPolicy: RemovalPolicy.DESTROY, 
      accountRecovery: AccountRecovery.NONE,
      email: UserPoolEmail.withCognito('eidivandi@live.com'),
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      lambdaTriggers:{
        defineAuthChallenge: props.triggers.defineAuthChallenge,
        preTokenGeneration: props.triggers.preTokenGeneration,
        verifyAuthChallengeResponse: props.triggers.verifyAuthChallengeResponse,
      },
      customAttributes: {
        tenants: new StringAttribute({ mutable: true }),
      }
    });

    this.passwordAuthClient =  new UserPoolClient(this, 'MultiTenantPasswordAuthClient', {
      userPool: this.userPool,
      idTokenValidity: Duration.minutes(5),
      accessTokenValidity: Duration.minutes(5),
      refreshTokenValidity: Duration.days(1),
      authFlows: { userPassword: true }
    });


    this.secureAuthClient = new UserPoolClient(this, 'MultiTenantSecureAuthClient', {
      userPool: this.userPool,
      generateSecret: false,
      accessTokenValidity: Duration.minutes(5),
      refreshTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.minutes(5),
      authFlows: { custom: true }
    });

  }
}