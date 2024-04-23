import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { LambdaConfiguration } from "../helpers/lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";

export interface LambdaResourceProps extends NodejsFunctionProps {}

export class LambdaFunction extends NodejsFunction {
  
  constructor(scope: Construct, id: string, props: LambdaResourceProps) {
   
    const lambdaServiceRole = new ServicePrincipal('lambda.amazonaws.com');
    const lambdaFunctionRole = new Role(scope, `${id}Role`, { 
      assumedBy: lambdaServiceRole,
      managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole') ]
     });

     super(scope, id, {
      entry: props.entry,
      role: lambdaFunctionRole,
      ...LambdaConfiguration,
      ...props,
      bundling: {
        ...LambdaConfiguration.bundling,
        ...props.bundling
      },
      environment: props.environment
    });

    new LogGroup(scope, `${id}LogGroup`, {
      logGroupName: `/aws/lambda/${this.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY
    });
  }
}