import { APIGatewayProxyHandler } from "aws-lambda";
import { availableProducts } from "./mocks/data";

export const getProductsList: APIGatewayProxyHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(availableProducts),
  };
};
