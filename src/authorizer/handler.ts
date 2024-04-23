import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, APIGatewayTokenAuthorizerHandler } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { decode, JwtPayload } from 'jsonwebtoken';
import { CognitoVerifyProperties } from 'aws-jwt-verify/cognito-verifier';

export const verifyToken = async (token: string, use: string ) => {
  if (!token) {
    throw new Error('Token not found');
  }
  const verifierParams = {
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    tokenUse: use as CognitoVerifyProperties['tokenUse'],
    clientId: process.env.COGNITO_USER_POOL_CLIENT_ID!,
  };
  const verifier = CognitoJwtVerifier.create(verifierParams);

  return await verifier.verify(token, verifierParams);
};

const decodeAndGetToken = (token: string) => {
  return decode(token) as JwtPayload;
}

const generatePolicy =  (principalId: string, effect: string, resource: string, context: Record<string, any>): APIGatewayAuthorizerResult => {
  return {
    principalId: principalId,
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource,
            },
        ],
    },
    context
  } satisfies APIGatewayAuthorizerResult;
}
export const handler: APIGatewayTokenAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent) => {
  let tenant = '';
  try {

    if (!event.authorizationToken) { throw new Error('Unauthorized'); }

    const token = event.authorizationToken!.replace('Bearer ', '');
    const decodedToken = decodeAndGetToken(token);
    const user = await verifyToken(token, decodedToken.token_use);
    tenant = decodedToken.tenant;

    if (
      !(decodedToken?.["custom:tenants"] as string).split(',').includes(decodedToken.tenant)
    ) { throw new Error('Unauthorized'); }
    
    return generatePolicy(user.sub, 'Allow', event.methodArn, { tenant });
  } catch (e) {
    console.error(e);
    return generatePolicy('', 'Deny', event.methodArn, { tenant });
  }
};
