import * as cdk from 'aws-cdk-lib/core';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new Table(this, 'productsTable', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      tableName: 'products',
    });
    
    const stocksTable = new Table(this, 'stocksTable', {
      partitionKey: {
        name: 'product_id',
        type: AttributeType.STRING
      },
      tableName: 'stocks',
    });

    // SQS queue
    const catalogItemsQueue = new Queue(this, 'catalogItemsQueue', {
      queueName: 'catalogItemsQueue',
    });
    
    const nodeJsFunctionProps: NodejsFunctionProps = {
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
      runtime: Runtime.NODEJS_22_X,
    }
    const getProductsList = new NodejsFunction(this, "getProductsList", {
      entry: "lambda/getProductsList.ts",
      handler: "getProductsList",
      ...nodeJsFunctionProps,
    });

    const getProductsById = new NodejsFunction(this, "getProductsById", {
      entry: "lambda/getProductsById.ts",
      handler: "getProductsById",
      ...nodeJsFunctionProps,
    });
    
    const createProduct = new NodejsFunction(this, "createProduct", {
      entry: "lambda/createProduct.ts",
      handler: "createProduct",
      ...nodeJsFunctionProps,
    });

    const catalogBatchProcess = new NodejsFunction(this, 'catalogBatchProcess', {
      entry: 'lambda/catalogBatchProcess.ts',
      handler: 'catalogBatchProcess',
      ...nodeJsFunctionProps,
    });

    catalogBatchProcess.addEventSource(new SqsEventSource(catalogItemsQueue, {
      batchSize: 5,
    }));

    // Grant the Lambda function read access to the DynamoDB table
    productsTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    productsTable.grantReadWriteData(createProduct);
    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsById);
    stocksTable.grantReadWriteData(createProduct);
    stocksTable.grantWriteData(catalogBatchProcess);

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
    });

    const productsApi = new RestApi(this, "ProductsApi");
    const products = productsApi.root.addResource("products");
    products.addMethod("GET", new LambdaIntegration(getProductsList));
    products.addMethod("POST", new LambdaIntegration(createProduct));
    products.addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    })
    
    const productsById = products.addResource("{id}");
    productsById.addMethod("GET", new LambdaIntegration(getProductsById));
    productsById.addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
    })
  }
}
