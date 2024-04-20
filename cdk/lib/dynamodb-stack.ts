import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, ITable, Table } from "aws-cdk-lib/aws-dynamodb";

export interface DynamoDBStackProps extends StackProps {}

export class DynamoDBStack extends Stack  {

  readonly table: ITable;
  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    this.table = new Table(this, 'Table', {
      partitionKey: { name: 'sub', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}