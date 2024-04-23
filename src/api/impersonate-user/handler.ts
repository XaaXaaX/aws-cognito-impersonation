import { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthFlowType, CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { ActionResults } from '../common/action-results';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';
import { fromEnv } from '@aws-sdk/credential-provider-env';
import { createHash } from 'crypto';

const client = new CognitoIdentityProviderClient({ 
  // This improves performance for first call 
  credentials: fromEnv(),
  region: process.env.REGION,
  maxAttempts: 4,
  
  requestHandler: new NodeHttpHandler({
    // This is vital for first call and gains a some performance around 300-400ms 
    // cognito first call is around 1s so this avoid SDK retries and adds clarity
    connectionTimeout: 2000,
    httpsAgent: new Agent({
      keepAlive: true,
      timeout: 120000,
      keepAliveMsecs: 5000,
      maxSockets: Infinity,
    }),
  }),
})

const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID!;

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const body = JSON.parse(event.body!);
    const { username: email, tenant } = body;
    
    // const hash = createHmac('sha256', secret).update(`${email}${clientId}`).digest('base64');
    const initiateAuthCommandInput = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.CUSTOM_AUTH,
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
      },
      ClientMetadata: {
        step: 'Impersonation_InitAuth',
        tenant,
      }
    });
  
    const response = await client.send(initiateAuthCommandInput);
  
    const challengeCommandInput = new RespondToAuthChallengeCommand({
      ChallengeName: 'CUSTOM_CHALLENGE',
      ClientId: clientId,
      ChallengeResponses: {
        USERNAME: response.ChallengeParameters?.USERNAME || '',
        ANSWER: 'impersonation',
      },
      ClientMetadata: {
        authFlow: 'impersonation',
        step: 'Impersonation_RespondToChallenge',
        tenant
      },
      Session: response.Session,
    });
  
    const challengeResponses = await client.send(challengeCommandInput);
    
    const AuthResult = {
      ...response,
      ...challengeResponses?.AuthenticationResult
    }
    return ActionResults.Success(AuthResult);
  } catch (e) {
    console.error(e);
    return ActionResults.Forbiden({ message: e.message || e.name });
  }
};

