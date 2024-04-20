import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommandInput,
  AuthFlowType,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  SignUpCommand,
  SignUpCommandInput,
  UpdateUserAttributesCommand,
  RespondToAuthChallengeCommand,
  RespondToAuthChallengeCommandInput,
  AdminGetUserCommandInput,
  AdminGetUserCommand,
  AdminGetUserCommandOutput,
  InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import generator from 'generate-password-ts';

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export type UserTypes = 'collaborator' | 'admin';

// Must be the same as the standard/custom attributes defined in the cognito ressource
export type UserCreationAttributes = {
  given_name?: string;
  family_name?: string;
  name?: string;
  'custom:admin'?: string;
  'custom:collaborator'?: string;
  email?: string;
};

export const signupUser = async ({
  password,
  userType,
  email,
  attributes,
  metadata,
}: {
  email: string;
  password: string;
  userType?: UserTypes;
  attributes?: UserCreationAttributes;
  metadata?: Record<string, string>;
}) => {
  
};

export const inviteUser = async ({
  userType,
  email,
  attributes,
  metadata,
}: {
  email: string;
  userType?: UserTypes;
  attributes?: UserCreationAttributes;
  metadata?: Record<string, string>;
}) => {
  console.log({
    userType,
    email,
    attributes,
    metadata,
  });
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
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'email_verified',
        Value: 'true',
      },
    ],
    ClientMetadata: {
      userType: userType ?? 'collaborator',
      ...(metadata ?? {}),
    },
  } satisfies AdminCreateUserCommandInput;

  if (attributes)
    adminCreateUserParams.UserAttributes.push(
      ...Object.entries(attributes).flatMap(([Name, Value]) => {
        if (Value === null || Value === undefined) return [];
        return [
          {
            Name,
            Value,
          },
        ];
      })
    );
  console.log(JSON.stringify(adminCreateUserParams));
  const command = new AdminCreateUserCommand(adminCreateUserParams);

  return client.send(command);
};

export const resendInvitation = async (username: string, metadata: Record<string, string>) => {
  const adminCreateUserParams: AdminCreateUserCommandInput = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    MessageAction: 'RESEND',
    TemporaryPassword: generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      strict: true,
      exclude: '&%#?+:/;',
    }),
    ClientMetadata: {
      ...(metadata ?? {}),
    },
  };

  const command = new AdminCreateUserCommand(adminCreateUserParams);

  return client.send(command);
};

export const createUser = async ({
  email,
  attributes,
  password,
  userType,
  metadata,
}: {
  email: string;
  password?: string;
  userType?: UserTypes;
  attributes?: UserCreationAttributes;
  metadata?: Record<string, string>;
}) => {
  if (password) {
    return signupUser({
      password,
      email,
      userType,
      attributes,
      metadata,
    });
  }
  return inviteUser({
    email,
    attributes,
    metadata,
    userType,
  });
};

export const updateUser = async (accessToken: string, attributes: UserCreationAttributes) => {
  const updateParams = {
    AccessToken: accessToken,
    UserAttributes: Object.entries(attributes).flatMap(([Name, Value]) => {
      if (Value === null || Value === undefined) return [];
      return [
        {
          Name,
          Value,
        },
      ];
    }),
  };

  const command = new UpdateUserAttributesCommand(updateParams);

  return client.send(command);
};

export const changePasswordUser = async (accessToken: string, oldPassword: string, newPassword: string) => {
  const changePasswordParams = {
    AccessToken: accessToken,
    PreviousPassword: oldPassword,
    ProposedPassword: newPassword,
  };

  const command = new ChangePasswordCommand(changePasswordParams);

  return client.send(command);
};

export const forgotPassword = async (username: string) => {
  const forgotPasswordParams = {
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    Username: username,
  };

  const command = new ForgotPasswordCommand(forgotPasswordParams);

  return client.send(command);
};

export const confirmForgotPassword = async (username: string, code: string, newPassword: string) => {
  const confirmPasswordResetParams = {
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    Username: username,
    ConfirmationCode: code,
    Password: newPassword,
  };

  const command = new ConfirmForgotPasswordCommand(confirmPasswordResetParams);

  return client.send(command);
};

export const authenticateUser = async (username: string, password: string) => {
  const loginParams = {
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  const command = new InitiateAuthCommand(loginParams);

  return client.send(command);
};

export const masquaradeUser = async (username: string, clientMetadata?: Record<string, string>) => {
  const loginParams = {
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    AuthFlow: AuthFlowType.CUSTOM_AUTH,
    AuthParameters: {
      USERNAME: username,
    },
    ClientMetadata: clientMetadata,
  };

  const command = new InitiateAuthCommand(loginParams);

  return client.send(command);
};

export const refreshUserToken = async (refreshToken: string): Promise<InitiateAuthCommandOutput> => {
  const refreshParams = {
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };

  const command = new InitiateAuthCommand(refreshParams);

  return client.send(command);
};

export const deleteUser = async (username: string) => {
  const deleteParams = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
  };

  const command = new AdminDeleteUserCommand(deleteParams);

  return client.send(command);
};

export const respondToNewPasswordChallenge = async (username: string, password: string, session: string) => {
  const challengeParams: RespondToAuthChallengeCommandInput = {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    ChallengeResponses: {
      NEW_PASSWORD: password,
      USERNAME: username,
    },
    Session: session,
  };

  const command = new RespondToAuthChallengeCommand(challengeParams);

  return client.send(command);
};

export const updateAdminUser = (username: string, userType: UserTypes, attributes: UserCreationAttributes) => {
  const adminUpdateUserInput = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
    ],
    ClientMetadata: {
      userType,
    },
  } satisfies AdminUpdateUserAttributesCommandInput;

  if (attributes)
    adminUpdateUserInput.UserAttributes.push(
      ...Object.entries(attributes).flatMap(([Name, Value]) => {
        if (Value === null || Value === undefined) return [];
        return [
          {
            Name,
            Value,
          },
        ];
      })
    );
  return client.send(new AdminUpdateUserAttributesCommand(adminUpdateUserInput));
};

export const getUserByEmail = async (email: string): Promise<AdminGetUserCommandOutput> => {
  const input: AdminGetUserCommandInput = {
    Username: email,
    UserPoolId: process.env.COGNITO_USER_POOL_ID!,
  };
  return client.send(new AdminGetUserCommand(input));
};

/**
 * @description Only used in masquerade process and behind internal authorizer !!!
 */
export const masqueradeUser = async (username: string, clientMetadata?: Record<string, string | boolean>) => {
  const initiateAuthCommandInput = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.CUSTOM_AUTH,
    ClientId: process.env.COGNITO_MASQUERADE_USER_POOL_CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
    },
  });

  const response = await client.send(initiateAuthCommandInput);

  const challengeCommandInput = new RespondToAuthChallengeCommand({
    ChallengeName: 'CUSTOM_CHALLENGE',
    ClientId: process.env.COGNITO_MASQUERADE_USER_POOL_CLIENT_ID,
    ChallengeResponses: {
      USERNAME: response.ChallengeParameters?.USERNAME || '',
      ANSWER: 'impersonation',
    },
    ClientMetadata: {
      authFlow: 'impersonation',
      ...clientMetadata,
    },
    Session: response.Session,
  });

  return client.send(challengeCommandInput);
};
