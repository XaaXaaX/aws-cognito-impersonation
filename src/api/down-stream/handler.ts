import { APIGatewayProxyEvent } from "aws-lambda";
import { ActionResults } from "../common/action-results";

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const eventBody = JSON.parse(event.body || '{}');
    if( eventBody.tenant !== event.requestContext.authorizer?.lambda.tenant ) {
      throw new Error('Tenant does not match');
    }
    return ActionResults.Success(eventBody);
  } catch (e) {
    console.error(e);
    return ActionResults.InternalServerError({ message: e.message || e.name });
  }
}