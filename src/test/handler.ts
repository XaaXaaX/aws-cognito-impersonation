import { SNSEvent, Context } from 'aws-lambda';

export const handler = async (event: SNSEvent, context: Context) => {
  console.log('Event:', JSON.stringify(event));
}