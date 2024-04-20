import { VerifyAuthChallengeResponseTriggerEvent } from 'aws-lambda';

export const handler = async (event: VerifyAuthChallengeResponseTriggerEvent) => {
  console.log(event);

  event.response.answerCorrect = event.request.challengeAnswer === 'impersonation';

  console.log(event);

  return event;
};
