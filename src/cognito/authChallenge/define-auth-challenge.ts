import { DefineAuthChallengeTriggerEvent } from 'aws-lambda';

export const handler = async (event: DefineAuthChallengeTriggerEvent) => {
  console.log(event);
  
  if (event.request.session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'IMPERSONATE_CHALLENGE';
  } else if (event.request.session.length === 1 && event.request.session[0].challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  }

  console.log(event);

  return event;
};
