import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join, resolve } from 'path';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { LambdaFunction } from './lambda-reource';

interface CognitoTriggersStackProps extends NestedStackProps {
}
export class CognitoTriggersStack extends NestedStack {
  public readonly preTokenGenerationTriggerFunction: IFunction;
  public readonly defineAuthChallengeTriggerFunction: IFunction;
  public readonly verifyAuthChallengeresponseTriggerFunction: IFunction;

  constructor(scope: Construct, id: string, props: CognitoTriggersStackProps) {
    super(scope, id, props);

    this.preTokenGenerationTriggerFunction = new LambdaFunction(this, 'PreTokenGeneration', {
      entry: resolve(join(__dirname, '../../src/cognito/pre-token-generation.ts')),
    });


    this.defineAuthChallengeTriggerFunction = new LambdaFunction(this, 'DefineAuthChallengeFunction', {
      entry: resolve(join(__dirname, '../../src/cognito/authChallenge/define-auth-challenge.ts')),
    });

    this.verifyAuthChallengeresponseTriggerFunction = new LambdaFunction(this, 'VerifyAuthChallengeResponseFunction', {
      entry: resolve(join(__dirname, '../../src/cognito/authChallenge/verify-auth-challenge.ts')),
    });

  }
}