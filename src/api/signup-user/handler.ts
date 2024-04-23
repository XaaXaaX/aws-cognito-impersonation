import { APIGatewayProxyEvent } from 'aws-lambda';
import { AdminCreateUserCommand, AdminCreateUserCommandInput, CognitoIdentityProviderClient, SignUpCommand, SignUpCommandInput } from '@aws-sdk/client-cognito-identity-provider';
import generator from 'generate-password-ts';
import { ActionResults } from '../common/action-results';
import { Agent } from 'https';
import { NodeHttpHandler } from '@smithy/node-http-handler';

export type CreateUserEventBody = {
  email: string;
  lastName?: string;
  firstName?: string;
  tenants?: string[];
};

const client = new CognitoIdentityProviderClient({ 
  region: process.env.REGION,
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 1000,
    httpsAgent: new Agent({
      keepAlive: true,
      timeout: 120000,
      keepAliveMsecs: 5000,
      maxSockets: Infinity,
    }),
  }),
})
export const handler = async (event: APIGatewayProxyEvent) => {
  const { 
    email,
    firstName,
    lastName,
    tenants } = JSON.parse(event.body!) as CreateUserEventBody;

  try {
    
    const UserAttributes = [
      { Name: 'family_name', Value: lastName },
      { Name: 'given_name', Value: firstName },
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: `${lastName} ${firstName}` },
      { Name: 'custom:tenants', Value: tenants?.join(',') }
    ]

    const adminCreateUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: generator.generate({
        length: 10,
        numbers: true,
        symbols: true,
        strict: true,
        exclude: '&%#?+:/;',
      }),
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes,
      // MessageAction: 'RESEND',
      ValidationData: [],
      ClientMetadata: {
        step: 'SignUp_CreateUser',
      }
    } satisfies AdminCreateUserCommandInput;
  
    const user = await client.send(new AdminCreateUserCommand(adminCreateUserParams));

    return ActionResults.Success(user);
  } catch (e) {
    console.error(e);
    return ActionResults.InternalServerError({ message: e.message || e.name });
  }
};
