import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Product, AvailableProduct, Stock } from "./models/Product";
import { success, bad, notfound, failure } from "./libs/response";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || '';
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || '';

const db = DynamoDBDocument.from(new DynamoDB());

export const getProductsById: APIGatewayProxyHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));
  
  const requestedProductId = event.pathParameters?.id;
  if (!requestedProductId) {
    return bad({ code: 400, message: "Error: You are missing the path parameter id" });
  }

  try {
    const [product, stock] = await Promise.all([
      db.get({ TableName: PRODUCTS_TABLE_NAME, Key: { ['id']: requestedProductId } })
        .then(r => (r.Item) as Product),
      db.get({ TableName: STOCKS_TABLE_NAME, Key: { ['product_id']: requestedProductId } })
        .then(r => (r.Item) as Stock),
    ]);
  
    if (!product) {
      return notfound({ code: 404, message: "Product not found" });
    }

    const result: AvailableProduct = {
      ...product,
      count: stock?.count ?? 0,
    }
  
    return success(result);
  } catch (e) {
    console.log(e);
    return failure({ code: 500, message: "Internal Server Error" });
  }
};
