import { APIGatewayProxyEvent } from 'aws-lambda';
import { AdminCreateUserCommand, AdminCreateUserCommandInput, CognitoIdentityProviderClient, SignUpCommand, SignUpCommandInput } from '@aws-sdk/client-cognito-identity-provider';
import generator from 'generate-password-ts';

export type CreateUserEventBody = {
  email: string;
  password?: string;
  familyName?: string;
  givenName?: string;
};

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (event: APIGatewayProxyEvent) => {
  const { 
    email,
    givenName,
    familyName } = JSON.parse(event.body!) as CreateUserEventBody;

  try {
    
    const UserAttributes = [
      { Name: 'family_name', Value: familyName },
      { Name: 'given_name', Value: givenName },
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
      UserAttributes: [
        ...UserAttributes,
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
      ClientMetadata: {},
    } satisfies AdminCreateUserCommandInput;
  
    console.log(JSON.stringify(adminCreateUserParams));
    const user = await client.send(new AdminCreateUserCommand(adminCreateUserParams));

    console.log(user);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user)
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
