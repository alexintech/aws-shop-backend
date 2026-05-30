import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { ValidationError } from "yup";
import { bad, created, failure } from "./libs/response";
import { createProductRecord } from "./libs/createProductRecord";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || '';
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || '';

const db = DynamoDBDocument.from(new DynamoDB());

export const createProduct: APIGatewayProxyHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));

  if (!event.body) {
    return bad({ code: 400, message: "Error: You are missing the parameter body" });
  }

  try {
    const body = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

    const product = await createProductRecord(db, PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME, body);

    return created(product);
  } catch (e) {
    if (e instanceof ValidationError) {
      return bad({ code: 400, message: e.errors });
    }
    console.log(e);
    return failure({ code: 500, message: "Internal Server Error" });
  }
};
