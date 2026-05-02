import * as cdk from 'aws-cdk-lib/core';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, "getProductsList", {
      runtime: Runtime.NODEJS_22_X,
      entry: "lambda/getProductsList.ts",
      handler: "getProductsList",
    });

    const productsApi = new RestApi(this, "ProductsApi");
    const products = productsApi.root.addResource("products");
    products.addMethod("GET", new LambdaIntegration(getProductsList));
  }
}
