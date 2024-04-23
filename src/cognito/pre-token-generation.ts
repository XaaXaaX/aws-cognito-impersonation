import { PreTokenGenerationTriggerEvent } from 'aws-lambda';

export const handler = async (event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent> => {
  let tenant = '';
  if( 
    event.triggerSource == 'TokenGeneration_Authentication' &&
    event.request.clientMetadata?.step == 'Impersonation_RespondToChallenge'
  ) {
    tenant = event.request.clientMetadata?.tenant;
  };

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        tenant,
      },
      claimsToSuppress: [],
      groupOverrideDetails: {
        groupsToOverride: [],
        iamRolesToOverride: [],
        preferredRole: "",
      },
    }
  };
  return event;
};
