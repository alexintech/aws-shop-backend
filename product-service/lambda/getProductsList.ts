import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Product, AvailableProduct, Stock } from "./models/Product";
import { success, failure } from "./libs/response";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || '';
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || '';

const db = DynamoDBDocument.from(new DynamoDB());

export const getProductsList: APIGatewayProxyHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));
  
  try {
    const [products, stocks] = await Promise.all([
      db.scan({ TableName: PRODUCTS_TABLE_NAME }).then(r => (r.Items ?? []) as Product[]),
      db.scan({ TableName: STOCKS_TABLE_NAME }).then(r => (r.Items ?? []) as Stock[]),
    ])

    const stocksByProductId = Object.fromEntries(
      stocks.map(({ product_id, ...stock }) => [product_id, stock])
    );

    const result: AvailableProduct[] = products.map(product => ({
      ...product,
      count: (product.id ? stocksByProductId[product.id]?.count : undefined) ?? 0,
    }))
    
    return success(result);
  } catch (e) {
    console.log(e);
    return failure({ code: 500, message: "Internal Server Error" });
  }
};
