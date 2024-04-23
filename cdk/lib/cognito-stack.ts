import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  IUserPool,
  IUserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { CognitoTriggersStack } from './cognito-triggers-stack';
import { CognitoUserPoolStack } from './cognito-userpool-stack';

interface CognitoStackProps extends StackProps {}
export class CognitoStack extends Stack {
  public readonly userPool: IUserPool;
  public readonly passwordAuthClient: IUserPoolClient;
  public readonly customAuthClient: IUserPoolClient;
  public readonly secureAuthClient: IUserPoolClient;
  
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);


    const triggersStack = new CognitoTriggersStack(this, CognitoTriggersStack.name, {});

    const userpoolStack = new CognitoUserPoolStack(this, CognitoUserPoolStack.name, {
      triggers: {
        defineAuthChallenge: triggersStack.defineAuthChallengeTriggerFunction,
        preTokenGeneration: triggersStack.preTokenGenerationTriggerFunction,
        verifyAuthChallengeResponse: triggersStack.verifyAuthChallengeresponseTriggerFunction,
      }
    });

    this.userPool = userpoolStack.userPool;
    this.passwordAuthClient = userpoolStack.passwordAuthClient;
    this.customAuthClient = userpoolStack.customAuthClient;
    this.secureAuthClient = userpoolStack.secureAuthClient;
  }
}