import { SQSHandler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { ValidationError } from "yup";
import { createProductRecord } from "./libs/createProductRecord";
import { AvailableProduct } from "./models/Product";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || '';
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || '';
const CREATE_PRODUCT_TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN || '';

const db = DynamoDBDocument.from(new DynamoDB());
const sns = new SNSClient();

export const catalogBatchProcess: SQSHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));

  for (const record of event.Records) {
    console.log('Processing record:', record.body);
    try {
      const body = JSON.parse(record.body);

      const product = await createProductRecord(db, PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME, body);

      console.log('Successfully created product:', product.id);
      
      await sns.send(new PublishCommand({
        TopicArn: CREATE_PRODUCT_TOPIC_ARN,
        Subject: 'New product created',
        Message: JSON.stringify(product),
        MessageAttributes: {
          price: {
            DataType: 'Number',
            StringValue: String(product.price),
          },
        },
      }));
    } catch (e) {
      if (e instanceof ValidationError) {
        console.error('Validation failed, skipping record:', e.errors, record.body);
      } else {
        console.error('Unexpected error processing record, skipping:', e, record.body);
      }
    }
  }
};
