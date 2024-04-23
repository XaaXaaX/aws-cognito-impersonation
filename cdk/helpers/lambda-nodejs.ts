import { Duration } from "aws-cdk-lib"
import { Architecture, LoggingFormat, Runtime } from "aws-cdk-lib/aws-lambda"
import { BundlingOptions, NodejsFunctionProps, OutputFormat, SourceMapMode } from "aws-cdk-lib/aws-lambda-nodejs"

export const EsbuildNodeBundling: BundlingOptions = {
  platform: 'node',
  format: OutputFormat.ESM,
  mainFields: ['module', 'main'],
  minify: true,
  sourceMap: true,
  sourcesContent: false,
  sourceMapMode: SourceMapMode.INLINE,
  externalModules: [
    '@aws-sdk/credential-provider-sso' ],
}

export const LambdaConfiguration: NodejsFunctionProps = {
  runtime: Runtime.NODEJS_20_X,
  architecture: Architecture.ARM_64,
  loggingFormat: LoggingFormat.JSON,
  memorySize: 256,
  timeout: Duration.seconds(30),
  systemLogLevel: 'INFO',
  applicationLogLevel: 'INFO',
  awsSdkConnectionReuse: false,
  bundling: EsbuildNodeBundling,
}