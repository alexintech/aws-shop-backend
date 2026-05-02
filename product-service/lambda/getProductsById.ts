import { APIGatewayProxyHandler } from "aws-lambda";
import { availableProducts } from "./mocks/data";

export const getProductsById: APIGatewayProxyHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));
  const product = availableProducts.find((p) => {
    return p.id === event.pathParameters?.id;
  });
  
  if (!product) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', 
      },
      body: "",
    };
  } 
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', 
    },
    body: JSON.stringify(product),
  };
};
