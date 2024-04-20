import { PreTokenGenerationTriggerEvent } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.REGION });
export const handler = async (event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent> => {
  const newEvent = event;
  console.log(newEvent);

  const result = await client.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: {
      sub: { S: event.request.userAttributes.sub },
    },
  }));
  newEvent.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        customerid: result.Item?.userid.S ?? '',
      },
      claimsToSuppress: [],
      groupOverrideDetails: {
        groupsToOverride: [],
        iamRolesToOverride: [],
        preferredRole: "",
      },
    }
  };
  return newEvent;
};
