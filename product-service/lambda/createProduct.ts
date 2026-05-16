import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { ValidationError } from "yup";
import { Product, AvailableProductSchema, Stock } from "./models/Product";
import { bad, created, failure } from "./libs/response";

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
    
    // Throws ValidationError if invalid, strips unknown fields, applies defaults
    const validatedProduct = await AvailableProductSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { count, ...productData } = validatedProduct;
    const id = uuidv4();

    const product: Product = { ...productData, id };
    const stock: Stock = { product_id: id, count };

    // Transaction for product and stock
    await db.transactWrite({
      TransactItems: [
        { Put: { TableName: PRODUCTS_TABLE_NAME, Item: product } },
        { Put: { TableName: STOCKS_TABLE_NAME, Item: stock } },
      ]
    });

    return created({...validatedProduct, id});
  } catch (e) {
    if (e instanceof ValidationError) {
      return bad({ code: 400, message: e.errors })
    }
    console.log(e);
    return failure({ code: 500, message: "Internal Server Error" });
  }
};
