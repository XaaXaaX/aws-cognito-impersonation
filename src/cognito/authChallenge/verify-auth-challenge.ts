import { VerifyAuthChallengeResponseTriggerEvent } from 'aws-lambda';

export const handler = async (event: VerifyAuthChallengeResponseTriggerEvent) => {
  if (event.request.clientMetadata?.tenant &&
      event.request.userAttributes?.['custom:tenants']?.split(',')?.includes(event.request.clientMetadata?.tenant)
  ) {
      event.response.answerCorrect = event.request.challengeAnswer === 'impersonation';
  }
  return event;
};
