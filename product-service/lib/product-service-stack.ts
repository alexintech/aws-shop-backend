import * as cdk from 'aws-cdk-lib/core';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, "getProductsList", {
      runtime: Runtime.NODEJS_22_X,
      entry: "lambda/getProductsList.ts",
      handler: "getProductsList",
    });

    const getProductsById = new NodejsFunction(this, "getProductsById", {
      runtime: Runtime.NODEJS_22_X,
      entry: "lambda/getProductsById.ts",
      handler: "getProductsById",
    });

    const productsApi = new RestApi(this, "ProductsApi");
    const products = productsApi.root.addResource("products");
    products.addMethod("GET", new LambdaIntegration(getProductsList));
    products.addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
    })
    
    const productsById = products.addResource("{id}");
    productsById.addMethod("GET", new LambdaIntegration(getProductsById));
    productsById.addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
    })
  }
}
