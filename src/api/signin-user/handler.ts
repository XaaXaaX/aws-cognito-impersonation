import { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthFlowType, AuthenticationResultType, CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, RespondToAuthChallengeCommandInput } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (event: APIGatewayProxyEvent) => {
  const { username, password } = JSON.parse(event.body!);
  let authenticationResult: AuthenticationResultType | undefined;
  try {
    const loginParams = {
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };
  
    const loginResponse = await client.send(new InitiateAuthCommand(loginParams));
    authenticationResult = loginResponse.AuthenticationResult;

    if( loginResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED' ) {
      const challengeParams: RespondToAuthChallengeCommandInput = {
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: password,
        },
        Session: loginResponse.Session,
      };

      const challengeResponse = await client.send(new RespondToAuthChallengeCommand(challengeParams));
      authenticationResult = challengeResponse.AuthenticationResult;
    }

    const response = {
      ...authenticationResult,
      session: loginResponse.Session
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response)
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        error: e.message || e.name,
      },
    }
  }
};
