import { SQSHandler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { ValidationError } from "yup";
import { createProductRecord } from "./libs/createProductRecord";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || '';
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || '';

const db = DynamoDBDocument.from(new DynamoDB());

export const catalogBatchProcess: SQSHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));

  for (const record of event.Records) {
    console.log('Processing record:', record.body);
    try {
      const body = JSON.parse(record.body);

      const product = await createProductRecord(db, PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME, body);

      console.log('Successfully created product:', product.id);
    } catch (e) {
      if (e instanceof ValidationError) {
        console.error('Validation failed, skipping record:', e.errors, record.body);
      } else {
        console.error('Unexpected error processing record, skipping:', e, record.body);
      }
    }
  }
};
