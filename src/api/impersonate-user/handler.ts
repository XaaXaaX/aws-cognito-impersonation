import { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthFlowType, CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID!;

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log(event.body);
  try {
    const body = JSON.parse(event.body!);
    const { username: email } = body;
    
    console.log('Initiating auth');
    // const hash = createHmac('sha256', secret).update(`${email}${clientId}`).digest('base64');
    const initiateAuthCommandInput = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.CUSTOM_AUTH,
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
      },
    });
  
    const response = await client.send(initiateAuthCommandInput);
  
    console.log('Responding to custom challenge');
    const challengeCommandInput = new RespondToAuthChallengeCommand({
      ChallengeName: 'CUSTOM_CHALLENGE',
      ClientId: clientId,
      ChallengeResponses: {
        USERNAME: response.ChallengeParameters?.USERNAME || '',
        ANSWER: 'impersonation',
      },
      ClientMetadata: {
        authFlow: 'impersonation',
        loggeruser: email
      },
      Session: response.Session,
    });
  
    const challengeResponses = await client.send(challengeCommandInput);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...response,
        ...challengeResponses
      })
    }
  } catch (e) {
    console.error(e);
    return {
      body: {
        error: e.message || e.name,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      statusCode: 500
    };
  }
};

