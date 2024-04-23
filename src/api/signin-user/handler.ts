import { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthFlowType, AuthenticationResultType, CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthCommandInput, RespondToAuthChallengeCommand, RespondToAuthChallengeCommandInput } from '@aws-sdk/client-cognito-identity-provider';
import { ActionResults } from '../common/action-results';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';
import { fromEnv } from '@aws-sdk/credential-provider-env';

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
export const handler = async (event: APIGatewayProxyEvent) => {

  const { username, password } = JSON.parse(event.body!);
  let authenticationResult: AuthenticationResultType | undefined;
  try {
    const signInParams: InitiateAuthCommandInput = {
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
      ClientMetadata: {
        step: 'Signin_InitAuth'
      }
    };
  
    const signInResponse = await client.send(new InitiateAuthCommand(signInParams));
    authenticationResult = signInResponse.AuthenticationResult;

    if( signInResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED' ) {
      const challengeParams: RespondToAuthChallengeCommandInput = {
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: password,
        },
        Session: signInResponse.Session,
        ClientMetadata: {
          step: 'Signin_Respond_Challenge'
        }
      };

      const challengeResponse = await client.send(new RespondToAuthChallengeCommand(challengeParams));
      authenticationResult = challengeResponse.AuthenticationResult;
    }

    const response = {
      ...authenticationResult,
      session: signInResponse.Session
    }
    
    return ActionResults.Success(response);
  } catch (e) {
    console.error(e);
    return ActionResults.InternalServerError({ error: e.message || e.name });
  }
};
